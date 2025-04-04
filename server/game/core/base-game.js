const { v4: uuidv4 } = require('uuid');
const { AbilitySystem } = require('./ability-system');
const { TurnSystem } = require('./turn-system');
const { CombatSystem } = require('./combat-system');

class BaseGame {
  constructor(playerDecks, gameType) {
    this.validateDecks(playerDecks);
    
    this.id = uuidv4();
    this.gameType = gameType;
    this.status = 'active';
    this.players = {};
    
    this.abilitySystem = new AbilitySystem();
    this.turnSystem = new TurnSystem(this);
    this.combatSystem = new CombatSystem();
    
    this.initializePlayers(playerDecks);
  }

  // Метод для получения требуемых ключей для колод (например, player1, player2)
  getRequiredDecks() {
    // Это зависит от количества игроков в игре
    return ['player1', 'player2'];  // Для двух игроков
  }

  // Метод для проверки корректности формата колод
  validateDecks(decks) {
    if (!decks || typeof decks !== 'object') {
      throw new Error('Invalid decks format');
    }
    
    const requiredDecks = this.getRequiredDecks();  // Получаем ключи, которые нужны
    requiredDecks.forEach(deckKey => {
      if (!decks[deckKey] || !Array.isArray(decks[deckKey])) {
        throw new Error(`Missing or invalid ${deckKey} deck`);
      }
    });
  }

  // Метод для инициализации игроков и их колод
  initializePlayers(decks) {
    const requiredDecks = this.getRequiredDecks();
    requiredDecks.forEach((deckKey, index) => {
      this.players[deckKey] = {
        deck: decks[deckKey],
        health: 100,  // Примерная инициализация здоровья
        energy: 0,    // Примерная инициализация энергии
        hand: [],     // Примерная инициализация карт в руке
        field: [],    // Примерная инициализация юнитов на поле
        effects: []   // Примерная инициализация эффектов
      };
    });
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