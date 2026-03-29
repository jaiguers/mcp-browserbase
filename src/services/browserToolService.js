export class BrowserToolService {
  constructor(browserSessionService) {
    this.browserSessionService = browserSessionService;
  }

  listTools() {
    return [
      {
        name: "browser_session_start",
        description: "Crea o reutiliza una sesion local de navegador con Playwright.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "browser_navigate",
        description: "Abre una URL en la pestana actual del navegador.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL completa que se desea abrir."
            }
          },
          required: ["url"],
          additionalProperties: false
        }
      },
      {
        name: "browser_search",
        description: "Busca un texto usando el primer campo de busqueda visible de la pagina.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Texto a buscar en la pagina actual."
            }
          },
          required: ["query"],
          additionalProperties: false
        }
      },
      {
        name: "browser_wait",
        description: "Espera unos milisegundos para que la pagina termine de renderizar contenido dinamico.",
        inputSchema: {
          type: "object",
          properties: {
            milliseconds: {
              type: "number",
              description: "Tiempo a esperar en milisegundos."
            }
          },
          additionalProperties: false
        }
      },
      {
        name: "browser_snapshot",
        description: "Obtiene titulo, URL, texto visible y algunos elementos interactivos de la pagina actual.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "browser_click",
        description: "Hace click en el primer elemento que coincida con un selector CSS.",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "Selector CSS del elemento."
            }
          },
          required: ["selector"],
          additionalProperties: false
        }
      },
      {
        name: "browser_type",
        description: "Escribe texto en el primer elemento que coincida con un selector CSS.",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "Selector CSS del campo."
            },
            text: {
              type: "string",
              description: "Texto a escribir."
            }
          },
          required: ["selector", "text"],
          additionalProperties: false
        }
      },
      {
        name: "browser_press",
        description: "Presiona una tecla en la pagina actual, por ejemplo Enter.",
        inputSchema: {
          type: "object",
          properties: {
            key: {
              type: "string",
              description: "Tecla a presionar."
            }
          },
          required: ["key"],
          additionalProperties: false
        }
      },
      {
        name: "browser_extract_items",
        description: "Extrae datos estructurados de una lista de elementos usando selectores CSS.",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "Selector CSS base que identifica cada item."
            },
            limit: {
              type: "number",
              description: "Numero maximo de items a devolver."
            },
            fields: {
              type: "array",
              description: "Campos a extraer para cada item.",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string", enum: ["text", "attribute"] },
                  selector: { type: "string" },
                  attribute: { type: "string" }
                },
                required: ["name"],
                additionalProperties: false
              }
            }
          },
          required: ["selector", "fields"],
          additionalProperties: false
        }
      },
      {
        name: "browser_get_cookies",
        description: "Devuelve las cookies actuales de la sesion del navegador.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "browser_screenshot",
        description: "Toma una captura completa de la pagina actual.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "browser_close",
        description: "Cierra la sesion remota del navegador.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      }
    ];
  }

  async execute(sessionId, toolName, args = {}) {
    switch (toolName) {
      case "browser_session_start":
        return this.browserSessionService.start(sessionId);
      case "browser_navigate":
        return this.browserSessionService.navigate(sessionId, args.url);
      case "browser_search":
        return this.browserSessionService.search(sessionId, args.query);
      case "browser_wait":
        return this.browserSessionService.wait(sessionId, args.milliseconds);
      case "browser_snapshot":
        return this.browserSessionService.getPageSummary(sessionId);
      case "browser_click":
        return this.browserSessionService.click(sessionId, args.selector);
      case "browser_type":
        return this.browserSessionService.type(sessionId, args.selector, args.text);
      case "browser_press":
        return this.browserSessionService.press(sessionId, args.key);
      case "browser_extract_items":
        return this.browserSessionService.extractItems(
          sessionId,
          args.selector,
          args.fields,
          args.limit
        );
      case "browser_get_cookies":
        return this.browserSessionService.getCookies(sessionId);
      case "browser_screenshot":
        return this.browserSessionService.screenshot(sessionId);
      case "browser_close":
        return this.browserSessionService.close(sessionId);
      default:
        throw new Error(`Herramienta desconocida: ${toolName}`);
    }
  }
}
