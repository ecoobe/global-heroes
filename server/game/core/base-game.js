// server/game/core/base-game.js
const { v4: uuidv4 } = require('uuid');
const { AbilitySystem } = require('./ability-system');
const { TurnSystem } = require('./turn-system');
const { CombatSystem } = require('./combat-system');

class BaseGame {
  constructor(playerDecks, gameType) {
    this.id = uuidv4();
    this.gameType = gameType;
    this.status = 'active';
    this.players = {};
    
    // Инициализация систем
    this.abilitySystem = new AbilitySystem();
    this.turnSystem = new TurnSystem(this);
    this.combatSystem = new CombatSystem();
    
    this.initializePlayers(playerDecks);
  }

  initializePlayers(decks) {
    throw new Error('Method initializePlayers must be implemented');
  }

  getPublicState() {
    return {
      id: this.id,
      status: this.status,
      players: this.sanitizePlayers(),
      currentTurn: this.turnSystem.currentTurn,
      round: this.turnSystem.round
    };
  }

  sanitizePlayers() {
    const result = {};
    for (const [playerId, player] of Object.entries(this.players)) {
      result[playerId] = {
        deck: player.deck.length,
        hand: this.sanitizeCards(player.hand),
        field: this.sanitizeUnits(player.field),
        health: player.health,
        energy: player.energy
      };
    }
    return result;
  }

  sanitizeUnits(units) {
    return units.map(unit => ({
      id: unit.id,
      name: unit.name,
      strength: unit.strength,
      health: unit.health,
      charges: unit.charges
    }));
  }

  sanitizeCards(cards) {
    return cards.map(card => ({
      id: card.id,
      name: card.name,
      cost: card.cost,
      charges: card.charges
    }));
  }
}

module.exports = { BaseGame };