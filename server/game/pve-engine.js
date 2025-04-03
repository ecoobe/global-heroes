const { abilities } = require('../heroes/abilities');
const { v4: uuidv4 } = require('uuid');

class PveGame {
  constructor(playerDeck) {
    if (!playerDeck?.length || playerDeck.length !== 5) {
      throw new Error('Invalid player deck: must contain exactly 5 heroes');
    }

    this.id = uuidv4();
    this.status = 'active';
    this.turn = 'human';
    this.round = 1;
    this.actionsLeft = 1;
    
    this.players = {
      human: this.createPlayer(playerDeck),
      ai: this.createAI()
    };

    this.initializeDecks();
    this.startTurn();
  }

  createPlayer(deck) {
    return {
      deck: this.validateDeck(deck),
      hand: [],
      field: [],
      health: 30,
      energy: 0,
      energyPerTurn: 1
    };
  }

  createAI() {
    const aiDeck = [2, 5, 8, 12, 17]; // Стандартная колода AI
    return {
      deck: this.validateDeck(aiDeck),
      hand: [],
      field: [],
      health: 30,
      energy: 0,
      energyPerTurn: 1
    };
  }

  validateDeck(deck) {
    return deck.map(id => {
      const ability = abilities[id];
      if (!ability) throw new Error(`Invalid ability ID: ${id}`);
      return {
        id: Number(id),
        name: ability.name,
        description: ability.description,
        cost: ability.cost || 1,
        charges: ability.charges || 1,
        strength: ability.strength || 0,
        health: ability.health || 1
      };
    });
  }

  initializeDecks() {
    // Перемешивание колод
    this.shuffleDeck(this.players.human.deck);
    this.shuffleDeck(this.players.ai.deck);
    
    // Начальная раздача карт
    this.drawCards(this.players.human, 3);
    this.drawCards(this.players.ai, 3);
  }

  shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  drawCards(player, count) {
    for (let i = 0; i < count; i++) {
      if (player.deck.length === 0) return;
      player.hand.push(player.deck.pop());
    }
  }

  startTurn() {
    const player = this.players[this.turn];
    player.energy += player.energyPerTurn;
    this.actionsLeft = 1;
    this.checkWinConditions();
  }

  endTurn() {
    this.turn = this.turn === 'human' ? 'ai' : 'human';
    this.round++;
    this.startTurn();
    
    if (this.turn === 'ai') {
      this.processAITurn();
    }
  }

  processAITurn() {
    setTimeout(() => {
      // Простая AI логика: играем случайную карту если возможно
      const ai = this.players.ai;
      if (ai.hand.length > 0 && ai.energy > 0) {
        const playableCards = ai.hand.filter(card => card.cost <= ai.energy);
        if (playableCards.length > 0) {
          const randomCard = playableCards[
            Math.floor(Math.random() * playableCards.length)
          ];
          this.playCard('ai', randomCard.id);
        }
      }
      this.endTurn();
    }, 2000);
  }

  playCard(playerType, cardId) {
    const player = this.players[playerType];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    
    if (cardIndex === -1) throw new Error('Card not found in hand');
    if (player.energy < player.hand[cardIndex].cost) {
      throw new Error('Not enough energy');
    }

    const card = player.hand.splice(cardIndex, 1)[0];
    player.field.push({ ...card });
    player.energy -= card.cost;
    this.activateAbility(playerType, card);
  }

  activateAbility(playerType, card) {
    const ability = abilities[card.id];
    if (!ability) return;

    // Пример реализации одной способности
    switch (card.id) {
      case 3: // Тактик
        this.players[playerType].field.forEach(unit => {
          unit.strength += 1;
        });
        break;
      case 7: // Крылья света
        this.players[playerType].field.forEach(unit => {
          unit.health += 2;
        });
        break;
      // Добавьте другие способности по аналогии
    }

    if (card.charges > 0) card.charges--;
    if (card.charges === 0) {
      this.removeCardFromField(playerType, card.id);
    }
  }

  removeCardFromField(playerType, cardId) {
    const player = this.players[playerType];
    player.field = player.field.filter(c => c.id !== cardId);
  }

  attack(attackerType, attackerId, defenderType, defenderId) {
    const attacker = this.players[attackerType].field[attackerId];
    const defender = this.players[defenderType].field[defenderId];

    if (!attacker || !defender) throw new Error('Invalid attack targets');

    defender.health -= attacker.strength;
    if (defender.health <= 0) {
      this.players[defenderType].field.splice(defenderId, 1);
    }

    this.checkWinConditions();
  }

  checkWinConditions() {
    if (this.players.human.health <= 0) {
      this.status = 'ai_win';
      return true;
    }
    if (this.players.ai.health <= 0) {
      this.status = 'human_win';
      return true;
    }
    return false;
  }

  getPublicState() {
    return {
      id: this.id,
      status: this.status,
      turn: this.turn,
      round: this.round,
      human: {
        deck: this.players.human.deck.length,
        hand: this.sanitizeCards(this.players.human.hand),
        field: this.sanitizeUnits(this.players.human.field),
        health: this.players.human.health,
        energy: this.players.human.energy
      },
      ai: {
        deck: this.players.ai.deck.length,
        hand: this.sanitizeCards(this.players.ai.hand),
        field: this.sanitizeUnits(this.players.ai.field),
        health: this.players.ai.health,
        energy: this.players.ai.energy
      }
    };
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

  async saveToRedis(redisClient) {
    const serialized = JSON.stringify({
      ...this,
      players: {
        human: this.serializePlayer(this.players.human),
        ai: this.serializePlayer(this.players.ai)
      }
    });
    
    await redisClient.hset('games', this.id, serialized);
  }

  serializePlayer(player) {
    return {
      ...player,
      deck: player.deck.map(c => ({ ...c })),
      hand: player.hand.map(c => ({ ...c })),
      field: player.field.map(u => ({ ...u }))
    };
  }

  static async loadFromRedis(redisClient, gameId) {
    const data = await redisClient.hGet('games', gameId);
    if (!data) throw new Error('Game not found');

    const parsed = JSON.parse(data);
    const game = new PveGame([]);
    
    // Восстанавливаем состояние
    Object.assign(game, parsed);
    game.players.human = this.restorePlayer(parsed.players.human);
    game.players.ai = this.restorePlayer(parsed.players.ai);

    return game;
  }

  static restorePlayer(playerData) {
    return {
      ...playerData,
      deck: playerData.deck.map(c => ({ ...c })),
      hand: playerData.hand.map(c => ({ ...c })),
      field: playerData.field.map(u => ({ ...u }))
    };
  }
}

module.exports = { PveGame };