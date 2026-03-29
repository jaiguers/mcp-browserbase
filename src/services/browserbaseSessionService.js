import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

function normalizeText(text) {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

export class BrowserbaseSessionService {
  #env;
  #sessions = new Map();

  constructor(env) {
    this.#env = env;
  }

  async #createLocalSession(sessionId) {
    const profileRoot = path.resolve(this.#env.localBrowserProfileDir);
    const userDataDir = path.join(profileRoot, sessionId);

    await ensureDirectory(userDataDir);

    let context;

    try {
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: this.#env.localBrowserHeadless,
        channel: this.#env.localBrowserChannel || undefined,
        locale: this.#env.localBrowserLocale,
        timezoneId: this.#env.localBrowserTimezone,
        viewport: {
          width: this.#env.localBrowserViewportWidth,
          height: this.#env.localBrowserViewportHeight
        }
      });
    } catch (error) {
      if (this.#env.localBrowserChannel) {
        context = await chromium.launchPersistentContext(userDataDir, {
          headless: this.#env.localBrowserHeadless,
          locale: this.#env.localBrowserLocale,
          timezoneId: this.#env.localBrowserTimezone,
          viewport: {
            width: this.#env.localBrowserViewportWidth,
            height: this.#env.localBrowserViewportHeight
          }
        });
      } else {
        throw error;
      }
    }

    const page = context.pages()[0] ?? (await context.newPage());

    return {
      page,
      context,
      userDataDir
    };
  }

  async getOrCreate(sessionId) {
    const existingSession = this.#sessions.get(sessionId);

    if (existingSession) {
      return existingSession;
    }

    const createdSession = await this.#createLocalSession(sessionId);
    this.#sessions.set(sessionId, createdSession);

    return createdSession;
  }

  async start(sessionId) {
    const session = await this.getOrCreate(sessionId);

    return {
      mode: "local-playwright",
      headless: this.#env.localBrowserHeadless,
      profilePath: session.userDataDir,
      currentUrl: session.page.url() || "about:blank"
    };
  }

  async navigate(sessionId, url) {
    const session = await this.getOrCreate(sessionId);
    await session.page.goto(url, {
      waitUntil: "domcontentloaded"
    });

    return this.getPageSummary(sessionId);
  }

  async search(sessionId, query) {
    const session = await this.getOrCreate(sessionId);
    const page = session.page;

    const searchSelectors = [
      'input[type="search"]',
      'input[name*="search" i]',
      'input[id*="search" i]',
      'input[placeholder*="buscar" i]',
      'input[placeholder*="search" i]',
      'input[aria-label*="buscar" i]',
      'input[aria-label*="search" i]',
      'input[name="field-keywords"]',
      'input[name="as_word"]',
      'form input[type="text"]'
    ];

    for (const selector of searchSelectors) {
      const element = page.locator(selector).first();
      const count = await element.count();

      if (count === 0) {
        continue;
      }

      await element.click();
      await element.fill(query);
      await element.press("Enter");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1200);
      return this.getPageSummary(sessionId);
    }

    throw new Error("No encontre un campo de busqueda util en la pagina actual.");
  }

  async click(sessionId, selector) {
    const session = await this.getOrCreate(sessionId);
    await session.page.locator(selector).first().click();
    await session.page.waitForLoadState("domcontentloaded");
    await session.page.waitForTimeout(800);
    return this.getPageSummary(sessionId);
  }

  async type(sessionId, selector, text) {
    const session = await this.getOrCreate(sessionId);
    await session.page.locator(selector).first().fill(text);
    return {
      ok: true,
      selector,
      typedText: text
    };
  }

  async press(sessionId, key) {
    const session = await this.getOrCreate(sessionId);
    await session.page.keyboard.press(key);
    await session.page.waitForLoadState("domcontentloaded");
    await session.page.waitForTimeout(800);
    return this.getPageSummary(sessionId);
  }

  async wait(sessionId, milliseconds = 1500) {
    const session = await this.getOrCreate(sessionId);
    const timeout = Math.min(Math.max(Number(milliseconds) || 1500, 100), 15000);
    await session.page.waitForTimeout(timeout);

    return this.getPageSummary(sessionId);
  }

  async getCookies(sessionId) {
    const session = await this.getOrCreate(sessionId);
    const cookies = await session.context.cookies();

    return cookies.map((cookie) => ({
      name: cookie.name,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure
    }));
  }

  async getPageSummary(sessionId) {
    const session = await this.getOrCreate(sessionId);
    const page = session.page;

    const title = await page.title();
    const url = page.url();
    const bodyText = normalizeText(await page.locator("body").innerText().catch(() => ""));

    const interactiveElements = await page.evaluate(() => {
      function isVisible(element) {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return (
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          rect.width > 0 &&
          rect.height > 0
        );
      }

      function getSelector(element) {
        if (element.id) {
          return `#${CSS.escape(element.id)}`;
        }

        const attributes = [
          ["data-testid", element.getAttribute("data-testid")],
          ["name", element.getAttribute("name")],
          ["aria-label", element.getAttribute("aria-label")],
          ["placeholder", element.getAttribute("placeholder")]
        ];

        for (const [attributeName, attributeValue] of attributes) {
          if (attributeValue) {
            return `${element.tagName.toLowerCase()}[${attributeName}="${attributeValue.replace(/"/g, '\\"')}"]`;
          }
        }

        const parts = [];
        let current = element;

        while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
          let part = current.tagName.toLowerCase();
          const siblings = current.parentElement
            ? Array.from(current.parentElement.children).filter(
                (child) => child.tagName === current.tagName
              )
            : [];

          if (siblings.length > 1) {
            part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
          }

          parts.unshift(part);
          current = current.parentElement;
        }

        return parts.join(" > ");
      }

      return Array.from(
        document.querySelectorAll('a, button, input, textarea, select, [role="button"]')
      )
        .filter(isVisible)
        .slice(0, 30)
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          selector: getSelector(element),
          text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 140),
          placeholder: element.getAttribute("placeholder"),
          ariaLabel: element.getAttribute("aria-label"),
          href: element.getAttribute("href")
        }));
    });

    return {
      title,
      url,
      text: truncate(bodyText, this.#env.browserTextMaxLength),
      interactiveElements
    };
  }

  async extractItems(sessionId, selector, fields, limit = 5) {
    const session = await this.getOrCreate(sessionId);
    const page = session.page;
    const safeLimit = Math.min(Math.max(limit, 1), 20);

    const items = await page.locator(selector).evaluateAll((elements, extractionFields) => {
      function readField(element, field) {
        if (!field.selector) {
          return (element.textContent || "").trim().replace(/\s+/g, " ");
        }

        const target = element.querySelector(field.selector);

        if (!target) {
          return null;
        }

        if (field.type === "attribute") {
          return target.getAttribute(field.attribute ?? "");
        }

        return (target.textContent || "").trim().replace(/\s+/g, " ");
      }

      return elements.slice(0, 20).map((element) => {
        const entry = {};

        for (const field of extractionFields) {
          entry[field.name] = readField(element, field);
        }

        return entry;
      });
    }, fields);

    return items.slice(0, safeLimit);
  }

  async screenshot(sessionId) {
    const session = await this.getOrCreate(sessionId);
    const image = await session.page.screenshot({ fullPage: true });

    return {
      bytes: image.length,
      pageUrl: session.page.url(),
      profilePath: session.userDataDir
    };
  }

  async close(sessionId) {
    const session = this.#sessions.get(sessionId);

    if (!session) {
      return { ok: true, message: "No habia una sesion activa." };
    }

    await session.context.close();
    this.#sessions.delete(sessionId);

    return { ok: true, message: "Sesion cerrada." };
  }
}
