// server/game/core/combat-system.js
const { abilities } = require('../abilities');

class CombatSystem {
  constructor() {
    this.effectDurations = {
      BUFF: 3,
      DEFENSE: 2,
      SHIELD: 1,
      HEAL_AOE: 0
    };
    this.currentTurn = 0;
  }

  resolveCombat(attackerPlayer, defenderPlayer) {
    this.currentTurn++;
    this.resetFirstAttackFlags(attackerPlayer);
    this.resetFirstAttackFlags(defenderPlayer);

    this.handlePreCombatEffects(attackerPlayer, defenderPlayer);
    this.processChannelAbilities(attackerPlayer);
    this.processAttacks(attackerPlayer, defenderPlayer);
    this.cleanupEffects(attackerPlayer);
    this.cleanupEffects(defenderPlayer);
  }

  resetFirstAttackFlags(player) {
    player.field.forEach(unit => {
      if (!unit.firstAttackUsed) unit.firstAttackUsed = false;
    });
  }

  handlePreCombatEffects(attacker, defender) {
    defender.field.forEach(unit => {
      if (unit.ability?.effectType === 'PASSIVE' && !unit.firstAttackUsed) {
        unit.effects.push({ type: 'EVASION', expires: Infinity });
      }
    });
  }

  processChannelAbilities(player) {
    player.field.forEach(unit => {
      const ability = unit.ability;
      if (!ability || ability.effectType !== 'CHANNEL' || ability.charges <= 0) return;

      if (this.currentTurn % 2 === 0) {
        ability.effects.forEach(effect => {
          this.applyEffect(unit, {
            type: effect.type,
            value: effect.value,
            duration: effect.duration
          });

          if (effect.type === 'HEAL_AOE') {
            player.field.forEach(ally => {
              ally.health = Math.min(ally.maxHealth, ally.health + effect.value);
            });
          }
        });
        ability.charges--;
      }
    });
  }

  applyEffect(unit, effect) {
    unit.effects = unit.effects.filter(e => e.type !== effect.type);
    unit.effects.push({
      ...effect,
      expires: this.currentTurn + effect.duration
    });
  }

  processAttacks(attacker, defender) {
    attacker.field.forEach(attackerUnit => {
      const ability = attackerUnit.ability;
      if (!ability || ability.charges <= 0) return;

      const targets = this.selectTargets(ability.target, defender.field);
      targets.forEach(target => {
        if (target.health <= 0) return;

        const damage = this.calculateDamage(attackerUnit, target);
        this.applyDamage(target, damage);
        attackerUnit.firstAttackUsed = true;

        if (target.health <= 0) {
          this.triggerDeathEffect(target, defender.field);
        }
      });

      ability.charges--;
    });
  }

  selectTargets(targetType, enemies) {
    switch(targetType) {
      case 'WEAKEST_ENEMY':
        return [enemies.reduce((a, b) => a.health < b.health ? a : b)];
      case 'RANDOM_ENEMY':
        return [enemies[Math.floor(Math.random() * enemies.length)]];
      case 'ALL_ENEMIES':
        return [...enemies];
      default:
        return [enemies[0]];
    }
  }

  calculateDamage(attacker, defender) {
    let damage = attacker.strength;
    let defense = defender.defense;

    // Обработка способностей атакующего
    if (attacker.ability?.pierce) {
      damage += attacker.ability.value;
      defense = 0;
    }

    // Обработка эффектов защиты
    defender.effects.forEach(effect => {
      if (effect.type === 'DEFENSE') defense += effect.modifier;
      if (effect.type === 'SHIELD') damage = Math.max(0, damage - effect.value);
    });

    // Проверка уклонения
    if (defender.effects.some(e => e.type === 'EVASION')) {
      defender.effects = defender.effects.filter(e => e.type !== 'EVASION');
      return 0;
    }

    // Учёт баффов силы
    const strengthBuff = attacker.effects.find(e => e.type === 'BUFF' && e.stat === 'strength');
    if (strengthBuff) damage += strengthBuff.value;

    return Math.max(damage - defense, 0);
  }

  applyDamage(target, damage) {
    target.health = Math.max(target.health - damage, 0);
  }

  triggerDeathEffect(deadUnit, enemies) {
    if (deadUnit.ability?.effectType === 'DEATH') {
      const target = this.selectTargets(deadUnit.ability.target, enemies)[0];
      if (target) target.health -= deadUnit.ability.value;
    }
  }

  cleanupEffects(player) {
    player.field.forEach(unit => {
      unit.effects = unit.effects.filter(e => e.expires > this.currentTurn);
    });
  }
}

module.exports = { CombatSystem };