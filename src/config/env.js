import dotenv from "dotenv";

dotenv.config();

const requiredVariables = [
  "GEMINI_API_KEY"
];

export function validateEnv() {
  const missingVariables = requiredVariables.filter(
    (variableName) => !process.env[variableName]
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${missingVariables.join(", ")}`
    );
  }
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  maxChatHistoryMessages: Number(process.env.MAX_CHAT_HISTORY_MESSAGES ?? 6),
  browserTextMaxLength: Number(process.env.BROWSER_TEXT_MAX_LENGTH ?? 5000),
  localBrowserHeadless: process.env.LOCAL_BROWSER_HEADLESS === "true",
  localBrowserChannel: process.env.LOCAL_BROWSER_CHANNEL ?? "chrome",
  localBrowserLocale: process.env.LOCAL_BROWSER_LOCALE ?? "es-CO",
  localBrowserTimezone: process.env.LOCAL_BROWSER_TIMEZONE ?? "America/Bogota",
  localBrowserProfileDir: process.env.LOCAL_BROWSER_PROFILE_DIR ?? ".playwright-profile",
  localBrowserViewportWidth: Number(process.env.LOCAL_BROWSER_VIEWPORT_WIDTH ?? 1440),
  localBrowserViewportHeight: Number(process.env.LOCAL_BROWSER_VIEWPORT_HEIGHT ?? 960),
  localMcpServerArgs: (process.env.LOCAL_MCP_SERVER_ARGS ?? "src/mcp/server.js")
    .split(",")
    .map((argument) => argument.trim())
    .filter(Boolean)
};
