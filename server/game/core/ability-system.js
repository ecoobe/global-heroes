// server/game/core/ability-system.js
const { abilities } = require('../../heroes/abilities');

class AbilitySystem {
  constructor() {
    this.abilityHandlers = {
      default: this.handleDefaultAbility,
      3: this.handleTacticianAbility,
      7: this.handleWingsOfLightAbility
    };
  }

  activateAbility(gameState, playerId, cardId) {
    const ability = abilities[cardId];
    if (!ability) return;

    const handler = this.abilityHandlers[cardId] || this.abilityHandlers.default;
    handler.call(this, gameState, playerId, ability);
  }

  handleDefaultAbility(gameState, playerId, ability) {
    // Базовая логика для необработанных способностей
    const player = gameState.players[playerId];
    player.field.forEach(unit => {
      unit.strength += ability.strengthBoost || 0;
      unit.health += ability.healthBoost || 0;
    });
  }

  handleTacticianAbility(gameState, playerId) {
    gameState.players[playerId].field.forEach(unit => {
      unit.strength += 1;
    });
  }

  handleWingsOfLightAbility(gameState, playerId) {
    gameState.players[playerId].field.forEach(unit => {
      unit.health += 2;
    });
  }
}

module.exports = { AbilitySystem };