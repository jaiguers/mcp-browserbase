import { Router } from "express";

export function createChatRouter(chatController) {
  const router = Router();

  router.get("/tools", chatController.listTools);
  router.get("/resources", chatController.listResources);
  router.get("/resources/read", chatController.readResource);
  router.get("/prompts", chatController.listPrompts);
  router.get("/prompts/:name", chatController.getPrompt);
  router.post("/chat", chatController.sendMessage);

  return router;
}
