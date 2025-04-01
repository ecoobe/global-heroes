module.exports.abilities = {
    kaito: {
        id: 'kaito',
        name: 'Кайто, Самурай Тени',
        strength: 4,
        health: 6,
        ability: (game, target) => {
            if (target.health <= 0) {
                const enemies = game.players.ai.field;
                if (enemies.length > 0) {
                    const victim = enemies[Math.floor(Math.random() * enemies.length)];
                    victim.health -= 4;
                }
            }
        }
    },
    freya: {
        id: 'freya',
        name: 'Фрейя, Валькирия Севера',
        strength: 3,
        health: 8,
        ability: (damage) => Math.max(damage - 2, 0)
    }
};