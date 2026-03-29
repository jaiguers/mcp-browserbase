export class ChatController {
  constructor(chatOrchestrator) {
    this.chatOrchestrator = chatOrchestrator;
  }

  listTools = async (_request, response, next) => {
    try {
      const tools = await this.chatOrchestrator.listTools();
      response.json({ tools });
    } catch (error) {
      next(error);
    }
  };

  listResources = async (_request, response, next) => {
    try {
      const resources = await this.chatOrchestrator.listResources();
      response.json({ resources });
    } catch (error) {
      next(error);
    }
  };

  readResource = async (request, response, next) => {
    try {
      const { uri } = request.query;

      if (!uri || typeof uri !== "string") {
        response.status(400).json({ error: "Debes enviar un uri valido." });
        return;
      }

      const contents = await this.chatOrchestrator.readResource(uri);
      response.json({ contents });
    } catch (error) {
      next(error);
    }
  };

  listPrompts = async (_request, response, next) => {
    try {
      const prompts = await this.chatOrchestrator.listPrompts();
      response.json({ prompts });
    } catch (error) {
      next(error);
    }
  };

  getPrompt = async (request, response, next) => {
    try {
      const { name } = request.params;
      const prompt = await this.chatOrchestrator.getPrompt(name, request.query);
      response.json(prompt);
    } catch (error) {
      next(error);
    }
  };

  sendMessage = async (request, response, next) => {
    try {
      const { sessionId, message } = request.body ?? {};
      console.log(`[CHAT] Nuevo mensaje. sessionId=${sessionId ?? "null"}`);

      if (!message || typeof message !== "string") {
        response.status(400).json({
          error: "Debes enviar un mensaje valido."
        });
        return;
      }

      const result = await this.chatOrchestrator.sendMessage({
        sessionId,
        message
      });

      response.json(result);
    } catch (error) {
      console.error("[CHAT] Error procesando mensaje:", error);
      next(error);
    }
  };
}
