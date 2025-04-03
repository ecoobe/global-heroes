const { v4: uuidv4 } = require('uuid');

class SessionManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> gameId
    this.games = new Map();    // gameId -> gameData
  }

  // Создание новой игры и сессии
  createGameSession(playerDeck) {
    const gameId = uuidv4();
    const sessionId = uuidv4();

    this.sessions.set(sessionId, gameId);
    
    this.games.set(gameId, {
      players: {
        human: { deck: playerDeck },
        ai: this.generateAiDeck() // Ваш метод генерации колоды AI
      },
      state: 'active'
    });

    return { sessionId, gameId };
  }

  getGameId(sessionId) {
    return this.sessions.get(sessionId);
  }

  getGameData(gameId) {
    return this.games.get(gameId);
  }

  destroySession(sessionId) {
    const gameId = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);
    this.games.delete(gameId);
  }
}

module.exports = SessionManager;