import { GoogleGenAI } from "@google/genai";

function isQuotaError(error) {
  return (
    error?.status === 429 ||
    error?.message?.includes("RESOURCE_EXHAUSTED") ||
    error?.message?.includes("Quota exceeded") ||
    error?.error?.status === "RESOURCE_EXHAUSTED"
  );
}

function buildToolDeclaration(tool) {
  return {
    name: tool.name,
    description: tool.description ?? "Herramienta MCP de Browserbase",
    parameters: tool.inputSchema ?? {
      type: "object",
      properties: {}
    }
  };
}

function normalizeText(parts = []) {
  return parts
    .filter((part) => typeof part.text === "string" && part.text.trim().length > 0)
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function createFunctionResponsePart(name, result) {
  return {
    functionResponse: {
      name,
      response: {
        result
      }
    }
  };
}

export class GeminiChatService {
  #ai;
  #model;

  constructor({ apiKey, model }) {
    this.#ai = new GoogleGenAI({ apiKey });
    this.#model = model;
  }

  async runChat({ tools, messages, onToolCall }) {
    try {
      const config = {
        systemInstruction: `Eres un asistente de navegacion web.
Usa las herramientas del navegador cuando el usuario pida abrir un sitio, navegar, buscar informacion o interactuar con la pagina.
Trabaja paso a paso: inicia sesion, navega, inspecciona la pagina y luego responde.
La sesion usa Playwright local con perfil persistente, asi que puedes aprovechar cookies y estado de sesion entre mensajes.
Cuando necesites buscar dentro de un ecommerce o sitio comun, intenta usar browser_search antes de concluir que no se puede.
Si la pagina parece incompleta, usa browser_wait y luego browser_snapshot.
Si necesitas listar resultados, usa browser_snapshot o browser_extract_items para basarte en el contenido real.
Responde en espanol de forma breve, clara y util.
Si hace falta visitar una URL, usa las herramientas disponibles en vez de inventar resultados.`
      };

      if (tools.length > 0) {
        config.tools = [
          {
            functionDeclarations: tools.map(buildToolDeclaration)
          }
        ];
      }

      const contents = [...messages];

      let response = await this.#ai.models.generateContent({
        model: this.#model,
        config,
        contents
      });

      while ((response.functionCalls ?? []).length > 0) {
        if (response.candidates?.[0]?.content) {
          contents.push(response.candidates[0].content);
        }

        for (const functionCall of response.functionCalls) {
          const toolResult = await onToolCall(functionCall.name, functionCall.args ?? {});
          contents.push({
            role: "user",
            parts: [createFunctionResponsePart(functionCall.name, toolResult)]
          });
        }

        response = await this.#ai.models.generateContent({
          model: this.#model,
          config,
          contents
        });
      }

      return {
        text: response.text || normalizeText(response.candidates?.[0]?.content?.parts),
        raw: response
      };
    } catch (error) {
      if (isQuotaError(error)) {
        throw new Error(
          "Se agoto la cuota de Gemini para este proyecto. Espera a que reinicie la cuota, usa otra API key/proyecto o habilita facturacion. Mientras tanto, intenta menos mensajes o sesiones mas cortas."
        );
      }

      throw error;
    }
  }
}
