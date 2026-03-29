# Playwright Local MCP Chat Navigator

Aplicacion web simple con interfaz tipo chat. Gemini interpreta la instruccion del usuario y consume un MCP server local propio por `stdio`. Ese MCP server expone herramientas de Playwright para navegar, buscar y extraer informacion de paginas web.

## Como funciona

- Gemini interpreta la tarea del usuario
- La app actua como cliente MCP local
- Un MCP server propio expone herramientas de Playwright
- Cada sesion del chat usa un perfil persistente en disco para conservar cookies y estado

Esto ayuda bastante en sitios como Mercado Libre o Amazon, porque puedes mantener login, cookies y verificaciones entre mensajes y reinicios del servidor.

## Que es Playwright

Playwright es una libreria de automatizacion de navegadores. Permite abrir paginas, hacer click, escribir, leer contenido, guardar cookies y reutilizar sesiones. En este proyecto se ejecuta localmente en tu maquina.

- Sitio oficial: https://playwright.dev/

## Variables de entorno

```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
MAX_CHAT_HISTORY_MESSAGES=6
BROWSER_TEXT_MAX_LENGTH=5000
LOCAL_BROWSER_HEADLESS=false
LOCAL_BROWSER_CHANNEL=chrome
LOCAL_BROWSER_LOCALE=es-CO
LOCAL_BROWSER_TIMEZONE=America/Bogota
LOCAL_BROWSER_PROFILE_DIR=.playwright-profile
LOCAL_BROWSER_VIEWPORT_WIDTH=1440
LOCAL_BROWSER_VIEWPORT_HEIGHT=960
LOCAL_MCP_SERVER_ARGS=src/mcp/server.js
```

## Ejecutar

```bash
npm install
npx playwright install chromium
npm run dev
```

Luego abre `http://localhost:3000`.

## Herramientas disponibles para Gemini

- `browser_session_start`
- `browser_navigate`
- `browser_search`
- `browser_wait`
- `browser_snapshot`
- `browser_click`
- `browser_type`
- `browser_press`
- `browser_extract_items`
- `browser_get_cookies`
- `browser_screenshot`
- `browser_close`

Puedes inspeccionarlas en `http://localhost:3000/api/tools`.

## Recursos y prompts MCP

El MCP server propio tambien expone:

- Resource `playwright://session/current/snapshot`
- Resource `playwright://session/current/cookies`
- Prompt `shopping-search`
- Prompt `page-summarizer`

Puedes inspeccionarlos desde HTTP:

- `http://localhost:3000/api/resources`
- `http://localhost:3000/api/resources/read?uri=playwright://session/current/snapshot`
- `http://localhost:3000/api/prompts`
- `http://localhost:3000/api/prompts/shopping-search?url=https://www.amazon.com&query=usb%20c%20hub`

## Consejos para Mercado Libre y Amazon

- Usa `LOCAL_BROWSER_HEADLESS=false` para ver el navegador y resolver logins o verificaciones manualmente cuando haga falta.
- El perfil persistente queda en `LOCAL_BROWSER_PROFILE_DIR`, por lo que las cookies se mantienen entre reinicios.
- Haz primero una navegacion simple al sitio, inicia sesion si es necesario y luego vuelve a pedir la extraccion.

## Arquitectura

- `src/services/browserbaseSessionService.js`: sesion local de Playwright con perfil persistente
- `src/services/browserToolService.js`: herramientas del dominio que el MCP server expone
- `src/mcp/server.js`: MCP server propio por stdio
- `src/services/mcpPlaywrightService.js`: cliente MCP local usado por la app
- `src/services/geminiChatService.js`: function calling con Gemini
- `src/services/chatOrchestrator.js`: manejo del historial por sesion
- `public/`: interfaz web tipo chat
