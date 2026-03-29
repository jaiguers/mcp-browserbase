const messagesElement = document.querySelector("#messages");
const formElement = document.querySelector("#chat-form");
const inputElement = document.querySelector("#message");

let sessionId = null;

function appendMessage(role, text) {
  const messageElement = document.createElement("article");
  messageElement.className = `message ${role}`;
  messageElement.textContent = text;
  messagesElement.appendChild(messageElement);
  messagesElement.scrollTop = messagesElement.scrollHeight;
}

function setFormDisabled(isDisabled) {
  inputElement.disabled = isDisabled;
  formElement.querySelector("button").disabled = isDisabled;
}

appendMessage(
  "assistant",
  "Hola. Puedo usar Playwright local para navegar con un perfil persistente y ayudarte a buscar o extraer informacion en la web."
);

formElement.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = inputElement.value.trim();

  if (!message) {
    return;
  }

  appendMessage("user", message);
  appendMessage("status", "Procesando instruccion...");
  setFormDisabled(true);
  inputElement.value = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionId,
        message
      })
    });

    const rawBody = await response.text();
    let data = null;

    try {
      data = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      data = null;
    }

    messagesElement.lastElementChild?.remove();

    if (!response.ok) {
      appendMessage(
        "assistant",
        data?.error ??
          `El servidor respondio con error ${response.status}. Revisa la terminal para ver el detalle.`
      );
      return;
    }

    sessionId = data?.sessionId ?? sessionId;
    appendMessage("assistant", data?.reply ?? "No recibi una respuesta valida del servidor.");
  } catch (error) {
    messagesElement.lastElementChild?.remove();
    appendMessage(
      "assistant",
      `No se pudo conectar con el servidor (${error.message || "error de red"}). Revisa si el backend sigue corriendo y mira la terminal.`
    );
  } finally {
    setFormDisabled(false);
    inputElement.focus();
  }
});
