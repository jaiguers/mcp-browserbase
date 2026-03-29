import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { env } from "../config/env.js";
import { BrowserbaseSessionService } from "../services/browserbaseSessionService.js";
import { BrowserToolService } from "../services/browserToolService.js";

function getSessionKey() {
  const sessionKeyIndex = process.argv.indexOf("--session-key");

  if (sessionKeyIndex >= 0 && process.argv[sessionKeyIndex + 1]) {
    return process.argv[sessionKeyIndex + 1];
  }

  return "default";
}

async function main() {
  const sessionKey = getSessionKey();
  const browserSessionService = new BrowserbaseSessionService(env);
  const browserToolService = new BrowserToolService(browserSessionService);

  const server = new McpServer({
    name: "local-playwright-browser-tools",
    version: "1.0.0"
  });

  server.registerResource(
    "current-page-snapshot",
    "playwright://session/current/snapshot",
    {
      title: "Current Page Snapshot",
      description: "Resumen JSON de la pagina actual del navegador.",
      mimeType: "application/json"
    },
    async () => ({
      contents: [
        {
          uri: "playwright://session/current/snapshot",
          mimeType: "application/json",
          text: JSON.stringify(await browserToolService.execute(sessionKey, "browser_snapshot"), null, 2)
        }
      ]
    })
  );

  server.registerResource(
    "current-page-cookies",
    "playwright://session/current/cookies",
    {
      title: "Current Page Cookies",
      description: "Cookies actuales de la sesion local del navegador.",
      mimeType: "application/json"
    },
    async () => ({
      contents: [
        {
          uri: "playwright://session/current/cookies",
          mimeType: "application/json",
          text: JSON.stringify(await browserToolService.execute(sessionKey, "browser_get_cookies"), null, 2)
        }
      ]
    })
  );

  server.registerPrompt(
    "shopping-search",
    {
      title: "Shopping Search",
      description: "Prompt reusable para buscar productos en un ecommerce.",
      argsSchema: {
        url: z.string().url(),
        query: z.string().min(1),
        maxItems: z.string().optional()
      }
    },
    async ({ url, query, maxItems }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Abre ${url}, busca "${query}" y devuelve hasta ${maxItems ?? "5"} productos con nombre, precio y enlace. Usa las tools del navegador y basate solo en lo que veas en la pagina.`
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "page-summarizer",
    {
      title: "Page Summarizer",
      description: "Prompt reusable para resumir el contenido visible de una pagina.",
      argsSchema: {
        url: z.string().url(),
        focus: z.string().optional()
      }
    },
    async ({ url, focus }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Abre ${url}, inspecciona la pagina y resume el contenido visible.${focus ? ` Enfocate en: ${focus}.` : ""}`
          }
        }
      ]
    })
  );

  server.tool(
    "browser_session_start",
    "Crea o reutiliza una sesion local de navegador con Playwright.",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await browserToolService.execute(sessionKey, "browser_session_start"))
        }
      ]
    })
  );

  server.tool(
    "browser_navigate",
    "Abre una URL en la pestana actual del navegador.",
    {
      url: z.string().url()
    },
    async ({ url }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await browserToolService.execute(sessionKey, "browser_navigate", { url }))
        }
      ]
    })
  );

  server.tool(
    "browser_search",
    "Busca un texto usando el primer campo de busqueda visible de la pagina.",
    {
      query: z.string().min(1)
    },
    async ({ query }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await browserToolService.execute(sessionKey, "browser_search", { query }))
        }
      ]
    })
  );

  server.tool(
    "browser_wait",
    "Espera unos milisegundos para que la pagina termine de renderizar contenido dinamico.",
    {
      milliseconds: z.number().min(100).max(15000).optional()
    },
    async ({ milliseconds }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await browserToolService.execute(sessionKey, "browser_wait", { milliseconds }))
        }
      ]
    })
  );

  server.tool(
    "browser_snapshot",
    "Obtiene titulo, URL, texto visible y algunos elementos interactivos de la pagina actual.",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await browserToolService.execute(sessionKey, "browser_snapshot"))
        }
      ]
    })
  );

  server.tool(
    "browser_click",
    "Hace click en el primer elemento que coincida con un selector CSS.",
    {
      selector: z.string().min(1)
    },
    async ({ selector }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await browserToolService.execute(sessionKey, "browser_click", { selector }))
        }
      ]
    })
  );

  server.tool(
    "browser_type",
    "Escribe texto en el primer elemento que coincida con un selector CSS.",
    {
      selector: z.string().min(1),
      text: z.string()
    },
    async ({ selector, text }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            await browserToolService.execute(sessionKey, "browser_type", { selector, text })
          )
        }
      ]
    })
  );

  server.tool(
    "browser_press",
    "Presiona una tecla en la pagina actual, por ejemplo Enter.",
    {
      key: z.string().min(1)
    },
    async ({ key }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await browserToolService.execute(sessionKey, "browser_press", { key }))
        }
      ]
    })
  );

  server.tool(
    "browser_extract_items",
    "Extrae datos estructurados de una lista de elementos usando selectores CSS.",
    {
      selector: z.string().min(1),
      limit: z.number().min(1).max(20).optional(),
      fields: z.array(
        z.object({
          name: z.string().min(1),
          type: z.enum(["text", "attribute"]).optional(),
          selector: z.string().optional(),
          attribute: z.string().optional()
        })
      )
    },
    async ({ selector, fields, limit }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            await browserToolService.execute(sessionKey, "browser_extract_items", {
              selector,
              fields,
              limit
            })
          )
        }
      ]
    })
  );

  server.tool(
    "browser_get_cookies",
    "Devuelve las cookies actuales de la sesion del navegador.",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await browserToolService.execute(sessionKey, "browser_get_cookies"))
        }
      ]
    })
  );

  server.tool(
    "browser_screenshot",
    "Toma una captura completa de la pagina actual.",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await browserToolService.execute(sessionKey, "browser_screenshot"))
        }
      ]
    })
  );

  server.tool(
    "browser_close",
    "Cierra la sesion local del navegador.",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await browserToolService.execute(sessionKey, "browser_close"))
        }
      ]
    })
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("[MCP SERVER] Error fatal:", error);
  process.exit(1);
});
