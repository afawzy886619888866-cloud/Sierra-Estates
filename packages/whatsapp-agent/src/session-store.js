/**
 * SessionStore — in-memory conversation history manager.
 * Keeps last N messages per user for Gemini context.
 * Production upgrade: swap Map for Redis/Firebase.
 */

const MAX_HISTORY = 20;    // messages per user
const TTL_MS = 3_600_000;  // 1 hour: clear history after inactivity

class SessionStore {
  constructor() {
    this.sessions = new Map(); // senderId → { history: [], lastSeen: ts }
    // Cleanup expired sessions every 15 minutes
    setInterval(() => this._gc(), 15 * 60 * 1000);
  }

  getHistory(senderId) {
    const session = this.sessions.get(senderId);
    return session?.history || [];
  }

  addMessage(senderId, role, content) {
    if (!this.sessions.has(senderId)) {
      this.sessions.set(senderId, { history: [], lastSeen: Date.now() });
    }
    const session = this.sessions.get(senderId);
    session.lastSeen = Date.now();
    session.history.push({ role, content });
    if (session.history.length > MAX_HISTORY) {
      session.history = session.history.slice(-MAX_HISTORY);
    }
  }

  clearHistory(senderId) {
    this.sessions.delete(senderId);
  }

  _gc() {
    const now = Date.now();
    for (const [id, s] of this.sessions) {
      if (now - s.lastSeen > TTL_MS) this.sessions.delete(id);
    }
  }
}

module.exports = { SessionStore };
