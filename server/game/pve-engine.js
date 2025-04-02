const { abilities } = require('../heroes/abilities');

class PveGame {
    constructor(playerDeck) {
        if (!playerDeck || !Array.isArray(playerDeck)) {
            throw new Error('Invalid player deck format');
        }

        this.players = {
            human: this.initPlayer(playerDeck),
            ai: this.initAI()
        };
        this.turn = 'human';
        this.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    initPlayer(deck) {
        return {
            deck: deck.map(id => {
                const hero = abilities[id];
                if (!hero) throw new Error(`Invalid hero ID: ${id}`);
                
                return {
                    id: Number(id),
                    health: hero.health,
                    strength: hero.strength,
                    ability: hero.ability
                };
            }),
            field: [],
            health: 30
        };
    }

    initAI() {
        const aiDeck = [2, 5, 8, 12, 17].map(id => ({
            id: Number(id),
            ...abilities[id]
        }));

        return {
            deck: aiDeck,
            field: [],
            health: 30
        };
    }

    async saveToRedis(redisClient) {
        await redisClient.hmset('games', this.id, JSON.stringify(this));
    }

    getPublicState() {
        return {
            id: this.id,
            players: {
                human: {
                    deck: this.players.human.deck.length,
                    field: this.players.human.field,
                    health: this.players.human.health
                },
                ai: {
                    health: this.players.ai.health,
                    field: this.players.ai.field
                }
            },
            turn: this.turn
        };
    }

    static async loadFromRedis(gameId, redisClient) {
        const data = await redisClient.hGet('games', gameId);
        return JSON.parse(data);
    }
}

module.exports = { PveGame };