const { v4: uuidv4 } = require('uuid');
const { PveGame } = require('./modes/pve-engine');
const { abilities } = require('./abilities');

class SessionManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> gameId
    this.games = new Map();    // gameId -> PveGame instance
    console.log('[SESSION] Manager initialized');
  }

  createGameSession(socketId, playerDeck) {
    try {
      console.log(`[SESSION] Creating session for ${socketId}`);

      // Создаем экземпляр игры
      const game = new PveGame(playerDeck, abilities);
      const sessionId = uuidv4();

      // Сохраняем ссылку на объект игры
      this.sessions.set(sessionId, game.id);
      this.games.set(game.id, game);

      console.log(`[SESSION] Created session ${sessionId}`);
      return { 
        sessionId,
        gameId: game.id,
        gameState: game.getPublicState()
      };

    } catch (error) {
      console.error('[SESSION] Creation failed:', error);
      throw error;
    }
  }

  destroySession(sessionId) {
    try {
      const gameId = this.sessions.get(sessionId);
      if (!gameId) return;

      console.log(`[SESSION] Destroying ${sessionId}`);
      this.sessions.delete(sessionId);
      this.games.delete(gameId);

    } catch (error) {
      console.error('[SESSION] Destruction error:', error);
    }
  }

  getGame(gameId) {
    return this.games.get(gameId) || null;
  }

  cleanupInactiveSessions(maxInactiveTime = 3600000) {
    const now = Date.now();
    Array.from(this.games.entries()).forEach(([gameId, game]) => {
      if (now - game.lastActivity > maxInactiveTime) {
        console.log(`[CLEANUP] Removing inactive game ${gameId}`);
        this.games.delete(gameId);
      }
    });
  }
}

module.exports = SessionManager;