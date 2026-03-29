import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ChatController } from "./controllers/chatController.js";
import { env } from "./config/env.js";
import { createChatRouter } from "./routes/chatRoutes.js";
import { ChatOrchestrator } from "./services/chatOrchestrator.js";
import { GeminiChatService } from "./services/geminiChatService.js";
import { McpPlaywrightService } from "./services/mcpPlaywrightService.js";
import { SessionStore } from "./utils/sessionStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  const sessionStore = new SessionStore();
  const mcpPlaywrightService = new McpPlaywrightService(env);
  const geminiService = new GeminiChatService({
    apiKey: env.geminiApiKey,
    model: env.geminiModel
  });
  const chatOrchestrator = new ChatOrchestrator({
    sessionStore,
    mcpPlaywrightService,
    geminiService,
    maxChatHistoryMessages: env.maxChatHistoryMessages
  });
  const chatController = new ChatController(chatOrchestrator);

  app.use(express.json());
  app.use(express.static(path.resolve(__dirname, "../public")));
  app.use("/api", createChatRouter(chatController));

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.use((error, _request, response, _next) => {
    console.error("[HTTP] Error no controlado:", error);
    response.status(500).json({
      error: error.message || "Ocurrio un error inesperado."
    });
  });

  return app;
}
