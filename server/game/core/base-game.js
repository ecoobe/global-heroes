const { v4: uuidv4 } = require('uuid');
const { AbilitySystem } = require('./ability-system');
const { TurnSystem } = require('./turn-system');
const { CombatSystem } = require('./combat-system');

class BaseGame {
  constructor(playerDecks, gameType) {
    try {
      this.id = uuidv4();
      this.gameType = gameType;
      this.status = 'active';
      
      // Переносим валидацию и нормализацию в отдельный метод
      this.normalizedDecks = this.normalizeDecks(playerDecks);
      
      this.abilitySystem = new AbilitySystem();
      this.turnSystem = new TurnSystem(this);
      this.combatSystem = new CombatSystem();
      
      // Инициализация игроков с нормализованными колодами
      this.initializePlayers(this.normalizedDecks);

    } catch (error) {
      console.error('Game initialization failed:', error);
      throw error;
    }
  }

  // Метод для нормализации колод в зависимости от формата входных данных
  normalizeDecks(decks) {
    console.log('Normalizing decks:', JSON.stringify(decks));
    
    if (!decks) {
      throw new Error('Invalid decks: No decks provided');
    }

    // Если колода передана как массив чисел, превращаем в массив объектов с id
    if (Array.isArray(decks)) {
      return { 
        player: decks.map(item => ({ id: item })) 
      };
    }

    // Если колоды переданы как объект с ключами игроков (для многопользовательской игры)
    const required = this.getRequiredDecks();
    required.forEach(key => {
      if (!decks[key] || !Array.isArray(decks[key])) {
        throw new Error(`Missing deck for ${key}`);
      }
    });
    
    return decks;
  }

  // Метод для определения требуемых колод в зависимости от типа игры
  getRequiredDecks() {
    return this.gameType === 'pve' ? ['player'] : ['player1', 'player2'];
  }

  // Метод для инициализации игроков
  initializePlayers(normalizedDecks) {
    this.players = Object.entries(normalizedDecks).reduce((acc, [key, deck]) => {
      acc[key] = this.createPlayer(deck);
      return acc;
    }, {});
  }

  // Метод для создания игрока с базовыми аттрибутами
  createPlayer(deck) {
    return {
      deck: deck,
      health: 100,
      energy: 0,
      hand: [],
      field: [],
      effects: []
    };
  }

  // Получение состояния игры для публикации
  getPublicState() {
    return {
      id: this.id,
      status: this.status,
      players: this.sanitizePlayers(),
      currentTurn: this.turnSystem.currentTurn,
      round: this.turnSystem.round,
      timestamp: Date.now()
    };
  }

  // Санитизация данных игроков для публичного состояния
  sanitizePlayers() {
    return Object.entries(this.players).reduce((acc, [playerId, player]) => {
      acc[playerId] = {
        deck: player.deck.length,
        hand: this.sanitizeCards(player.hand),
        field: this.sanitizeUnits(player.field),
        health: player.health,
        energy: player.energy,
        effects: player.effects || []
      };
      return acc;
    }, {});
  }

  // Санитизация юнитов на поле
  sanitizeUnits(units) {
    return units.map(unit => ({
      id: unit.id,
      name: unit.name,
      strength: unit.strength,
      health: unit.health,
      charges: unit.charges,
      statusEffects: unit.statusEffects || []
    }));
  }

  // Санитизация карт
  sanitizeCards(cards) {
    return cards.map(card => ({
      id: card.id,
      name: card.name,
      cost: card.cost,
      charges: card.charges,
      description: card.description || ''
    }));
  }

  // Завершение игры
  endGame(reason = 'completed') {
    this.status = 'ended';
    console.log(`Game ${this.id} ended. Reason: ${reason}`);
  }
}

module.exports = { BaseGame };