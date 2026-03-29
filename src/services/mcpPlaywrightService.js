import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function parseToolResult(result) {
  const textContent = result.content?.find((item) => item.type === "text")?.text;

  if (!textContent) {
    return {
      content: result.content ?? [],
      structuredContent: result.structuredContent ?? null,
      isError: result.isError ?? false
    };
  }

  try {
    return JSON.parse(textContent);
  } catch {
    return {
      text: textContent,
      content: result.content ?? [],
      structuredContent: result.structuredContent ?? null,
      isError: result.isError ?? false
    };
  }
}

export class McpPlaywrightService {
  #env;
  #clients = new Map();

  constructor(env) {
    this.#env = env;
  }

  async getClient(sessionId) {
    const existingEntry = this.#clients.get(sessionId);

    if (existingEntry) {
      return existingEntry;
    }

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [...this.#env.localMcpServerArgs, "--session-key", sessionId]
    });

    transport.onerror = async (error) => {
      console.error("[MCP CLIENT] Error:", error);
    };

    transport.onclose = async () => {
      this.#clients.delete(sessionId);
    };

    const client = new Client(
      {
        name: "playwright-chat-app",
        version: "1.0.0"
      },
      {
        capabilities: {}
      }
    );

    await client.connect(transport);

    const entry = { client, transport };
    this.#clients.set(sessionId, entry);

    return entry;
  }

  async listTools(sessionId) {
    const { client } = await this.getClient(sessionId);
    const response = await client.listTools();
    return response.tools ?? [];
  }

  async listResources(sessionId) {
    const { client } = await this.getClient(sessionId);
    const response = await client.listResources();
    return response.resources ?? [];
  }

  async readResource(sessionId, uri) {
    const { client } = await this.getClient(sessionId);
    const response = await client.readResource({ uri });
    return response.contents ?? [];
  }

  async listPrompts(sessionId) {
    const { client } = await this.getClient(sessionId);
    const response = await client.listPrompts();
    return response.prompts ?? [];
  }

  async getPrompt(sessionId, name, args = {}) {
    const { client } = await this.getClient(sessionId);
    return client.getPrompt({
      name,
      arguments: args
    });
  }

  async callTool(sessionId, toolName, args) {
    const { client } = await this.getClient(sessionId);
    const result = await client.callTool({
      name: toolName,
      arguments: args
    });

    return parseToolResult(result);
  }

  async closeClient(sessionId) {
    const entry = this.#clients.get(sessionId);

    if (!entry) {
      return;
    }

    try {
      await entry.client.close();
    } catch {
      // Ignore close errors from already-closed clients.
    }

    try {
      await entry.transport.close();
    } catch {
      // Ignore close errors from already-closed transports.
    }

    this.#clients.delete(sessionId);
  }
}
