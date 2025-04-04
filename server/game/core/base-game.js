const { v4: uuidv4 } = require('uuid');
const { AbilitySystem } = require('./ability-system');
const { TurnSystem } = require('./turn-system');
const { CombatSystem } = require('./combat-system');

class BaseGame {
  constructor(playerDecks, gameType) {
    // 1. Убираем общую валидацию из конструктора
    try {
      this.id = uuidv4();
      this.gameType = gameType;
      this.status = 'active';
      
      // 2. Переносим валидацию в отдельный метод
      this.normalizedDecks = this.normalizeDecks(playerDecks);
      
      this.abilitySystem = new AbilitySystem();
      this.turnSystem = new TurnSystem(this);
      this.combatSystem = new CombatSystem();
      
      // 3. Унифицированная инициализация игроков
      this.initializePlayers(this.normalizedDecks);

    } catch (error) {
      console.error('Game initialization failed:', error);
      throw error;
    }
  }

  normalizeDecks(decks) {
    console.log('Normalizing decks:', JSON.stringify(decks));
    
    // 4. Обработка разных форматов
    if (Array.isArray(decks)) {
      return { 
        player: decks.map(item => 
          typeof item === 'object' ? item.id : item
        ) 
      };
    }
    
    // 5. Валидация для multiplayer
    const required = this.getRequiredDecks();
    required.forEach(key => {
      if (!decks[key] || !Array.isArray(decks[key])) {
        throw new Error(`Missing deck: ${key}`);
      }
    });
    
    return decks;
  }

  getRequiredDecks() {
    // 6. Динамическое определение по типу игры
    return this.gameType === 'pve' ? ['player'] : ['player1', 'player2'];
  }

  initializePlayers(normalizedDecks) {
    // 7. Гибкая инициализация игроков
    this.players = Object.entries(normalizedDecks).reduce((acc, [key, deck]) => {
      acc[key] = this.createPlayer(deck);
      return acc;
    }, {});
  }

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

  sanitizeCards(cards) {
    return cards.map(card => ({
      id: card.id,
      name: card.name,
      cost: card.cost,
      charges: card.charges,
      description: card.description || ''
    }));
  }

  endGame(reason = 'completed') {
    this.status = 'ended';
    console.log(`Game ${this.id} ended. Reason: ${reason}`);
  }
}

module.exports = { BaseGame };