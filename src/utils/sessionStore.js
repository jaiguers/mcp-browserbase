import crypto from "node:crypto";

export class SessionStore {
  #sessions = new Map();

  create() {
    const sessionId = crypto.randomUUID();

    this.#sessions.set(sessionId, {
      id: sessionId,
      messages: []
    });

    return this.#sessions.get(sessionId);
  }

  get(sessionId) {
    return this.#sessions.get(sessionId) ?? null;
  }

  getOrCreate(sessionId) {
    if (!sessionId) {
      return this.create();
    }

    return this.get(sessionId) ?? this.create();
  }

  appendMessage(sessionId, message) {
    const session = this.getOrCreate(sessionId);
    session.messages.push(message);
    return session;
  }
}
