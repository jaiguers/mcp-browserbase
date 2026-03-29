function createUserMessage(text) {
  return {
    role: "user",
    parts: [{ text }]
  };
}

function createAssistantMessage(text) {
  return {
    role: "model",
    parts: [{ text }]
  };
}

export class ChatOrchestrator {
  constructor({ sessionStore, mcpPlaywrightService, geminiService, maxChatHistoryMessages }) {
    this.sessionStore = sessionStore;
    this.mcpPlaywrightService = mcpPlaywrightService;
    this.geminiService = geminiService;
    this.maxChatHistoryMessages = maxChatHistoryMessages;
  }

  async listTools() {
    const session = this.sessionStore.create();
    const tools = await this.mcpPlaywrightService.listTools(session.id);

    await this.mcpPlaywrightService.closeClient(session.id);

    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description ?? "",
      inputSchema: tool.inputSchema ?? null
    }));
  }

  async listResources() {
    const session = this.sessionStore.create();
    const resources = await this.mcpPlaywrightService.listResources(session.id);

    await this.mcpPlaywrightService.closeClient(session.id);

    return resources;
  }

  async readResource(uri) {
    const session = this.sessionStore.create();
    const resource = await this.mcpPlaywrightService.readResource(session.id, uri);

    await this.mcpPlaywrightService.closeClient(session.id);

    return resource;
  }

  async listPrompts() {
    const session = this.sessionStore.create();
    const prompts = await this.mcpPlaywrightService.listPrompts(session.id);

    await this.mcpPlaywrightService.closeClient(session.id);

    return prompts;
  }

  async getPrompt(name, args) {
    const session = this.sessionStore.create();
    const prompt = await this.mcpPlaywrightService.getPrompt(session.id, name, args);

    await this.mcpPlaywrightService.closeClient(session.id);

    return prompt;
  }

  async sendMessage({ sessionId, message }) {
    const session = this.sessionStore.getOrCreate(sessionId);
    this.sessionStore.appendMessage(session.id, createUserMessage(message));

    const tools = await this.mcpPlaywrightService.listTools(session.id);
    const geminiResponse = await this.geminiService.runChat({
      tools,
      messages: session.messages.slice(-this.maxChatHistoryMessages),
      onToolCall: async (toolName, args) => {
        return this.mcpPlaywrightService.callTool(session.id, toolName, args);
      }
    });

    const replyText =
      geminiResponse.text ||
      "No pude generar una respuesta final, pero ya deje la sesion lista para seguir navegando.";

    this.sessionStore.appendMessage(session.id, createAssistantMessage(replyText));

    return {
      sessionId: session.id,
      reply: replyText
    };
  }
}
