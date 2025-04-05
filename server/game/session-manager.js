const { v4: uuidv4 } = require('uuid');
const { PveGame } = require('./modes/pve-engine');
const { abilities } = require('./abilities');

class SessionManager {
  constructor() {
    if (!abilities || typeof abilities !== 'object') {
      throw new Error('[FATAL] Abilities not initialized');
    }

    this.sessions = new Map(); // sessionId -> gameId
    this.games = new Map();    // gameId -> gameData
    console.log('[SESSION] Manager initialized with', Object.keys(abilities).length, 'abilities');
  }

  // Основные методы
  createGameSession(socketId, playerDeck) {
    try {
      console.log(`[SESSION] Creating session for ${socketId}`);
      
      // 1. Создание экземпляра игры
      const game = new PveGame(playerDeck, abilities);
      
      // 2. Генерация ID сессии
      const sessionId = uuidv4();

      // 3. Сохранение данных
      this.sessions.set(sessionId, game.id);
      this.games.set(game.id, {
        gameInstance: game,
        lastActivity: Date.now(),
        socketId: socketId
      });

      console.log(`[SESSION] Created session ${sessionId}`);
      return { 
        sessionId,
        gameId: game.id,
        gameState: game.getPublicState()
      };

    } catch (error) {
      console.error('[SESSION] Creation failed:', {
        error: error.message,
        inputDeck: playerDeck,
        stack: error.stack
      });
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

  // Вспомогательные методы
  getGame(gameId) {
    const entry = this.games.get(gameId);
    return entry ? entry.gameInstance : null;
  }

  updateActivity(gameId) {
    const entry = this.games.get(gameId);
    if (entry) entry.lastActivity = Date.now();
  }

  cleanupInactiveSessions(maxInactiveTime = 3600000) {
    const now = Date.now();
    Array.from(this.games.entries()).forEach(([gameId, entry]) => {
      if (now - entry.lastActivity > maxInactiveTime) {
        console.log(`[CLEANUP] Removing inactive game ${gameId}`);
        this.games.delete(gameId);
      }
    });
  }
}

module.exports = SessionManager;