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
        const aiDeck = [2, 5, 8, 12, 17].map(id => {
            const hero = abilities[id];
            if (!hero) throw new Error(`Invalid AI hero ID: ${id}`);
            
            return {
                id: Number(id),
                health: hero.health,
                strength: hero.strength,
                ability: hero.ability
            };
        });

        return {
            deck: aiDeck,
            field: [],
            health: 30
        };
    }

    async saveToRedis(redisClient) {
        if (!redisClient?.hset) {
            throw new Error('Redis client incompatible - hset method not found');
        }

        await redisClient.hset(
            'games', 
            this.id, 
            JSON.stringify(this, (key, value) => {
                if (value instanceof Set) return [...value];
                if (value instanceof Map) return Object.fromEntries(value);
                return typeof value === 'bigint' ? value.toString() : value;
            })
        );
    }

    getPublicState() {
        return {
            id: this.id,
            players: {
                human: {
                    deckSize: this.players.human.deck.length,
                    field: this.players.human.field.map(unit => this.sanitizeUnit(unit)),
                    health: this.players.human.health
                },
                ai: {
                    deckSize: this.players.ai.deck.length,
                    field: this.players.ai.field.map(unit => this.sanitizeUnit(unit)),
                    health: this.players.ai.health
                }
            },
            turn: this.turn
        };
    }

    sanitizeUnit(unit) {
        return {
            id: unit.id,
            health: unit.health,
            strength: unit.strength
        };
    }

    static async loadFromRedis(gameId, redisClient) {
        const data = await redisClient.hGet('games', gameId);
        if (!data) throw new Error('Game not found');
        
        return Object.assign(
            new PveGame([]),
            JSON.parse(data, (key, value) => {
                // При необходимости можно добавить восстановление объектов
                return value;
            })
        );
    }
}

module.exports = { PveGame };