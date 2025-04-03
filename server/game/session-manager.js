const { v4: uuidv4 } = require('uuid');
const { abilities } = require('../heroes/abilities'); // Добавлен импорт способностей

class SessionManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> gameId
    this.games = new Map();    // gameId -> gameData
  }

  // Генерация колоды AI (новый метод)
  generateAiDeck() {
    const availableIds = Object.keys(abilities).map(Number);
    const deck = [];
    
    while (deck.length < 5) {
      const randomId = availableIds[Math.floor(Math.random() * availableIds.length)];
      if (!deck.includes(randomId)) {
        deck.push(randomId);
      }
    }
    return deck;
  }

  // Создание новой игры и сессии
  createGameSession(playerDeck) {
    const gameId = uuidv4();
    const sessionId = uuidv4();

    this.sessions.set(sessionId, gameId);
    
    this.games.set(gameId, {
      players: {
        human: { deck: playerDeck },
        ai: this.generateAiDeck() // Используем новый метод
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