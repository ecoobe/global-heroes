const { v4: uuidv4 } = require('uuid');

class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  createSession(playerDeck) {
    const sessionId = uuidv4();
    this.sessions.set(sessionId, {
      id: sessionId,
      players: {
        human: { deck: playerDeck },
        ai: {}
      }
    });
    return sessionId;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }
}

module.exports = SessionManager;