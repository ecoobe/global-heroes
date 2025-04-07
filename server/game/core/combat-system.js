// server/game/core/combat-system.js
const { abilities } = require('../abilities');

class CombatSystem {
  constructor() {
    this.effectDurations = {
      BUFF: 3,    // Баффы действуют 3 хода
      DEFENSE: 2   // Защита действует 2 хода
    };
  }

  calculateDamage(attacker, defender) {
    let defense = defender.defense;
    
    // Учёт способности "Щит предков"
    const shieldEffect = defender.effects.find(e => e.type === 'DEFENSE');
    if (shieldEffect) {
      defense += shieldEffect.modifier;
    }

    // Учёт "Стрелы Луны" (игнор защиты)
    if (attacker.activeAbility?.pierce) {
      defense = 0;
    }

    const baseDamage = attacker.strength - defense;
    return Math.max(baseDamage, 0) + (attacker.activeAbility?.value || 0);
  }

  applyEffect(unit, effect) {
    unit.effects = unit.effects.filter(e => e.type !== effect.type);
    unit.effects.push({
      ...effect,
      expires: this.currentTurn + (effect.duration || 0)
    });
  }

  processEffects(unit) {
    unit.effects = unit.effects.filter(e => e.expires > this.currentTurn);
  }

  performAttack(attacker, defender) {
    this.processEffects(attacker);
    this.processEffects(defender);

    const ability = attacker.activeAbility;
    let damage = this.calculateDamage(attacker, defender);
    
    if (ability?.effectType === 'ATTACK') {
      damage += ability.value || 0;
    }

    defender.health -= damage;
    return damage;
  }

  resolveCombat(attacker, defender) {
    this.currentTurn = (this.currentTurn || 0) + 1;
    
    // Обработка способности "Тактик"
    const buffs = attacker.field.filter(u => u.activeAbility?.effectType === 'BUFF');
    buffs.forEach(buffUnit => {
      const ability = buffUnit.activeAbility;
      attacker.field.forEach(ally => {
        this.applyEffect(ally, {
          type: 'BUFF',
          stat: ability.stat,
          value: ability.value,
          duration: this.effectDurations.BUFF
        });
      });
    });

    // Основная атака
    attacker.field.forEach(attackerUnit => {
      const ability = attackerUnit.activeAbility;
      let targets = [];
      
      switch(ability?.target) {
        case 'ALL_ALLIES':
          targets = attacker.field;
          break;
        case 'WEAKEST_ENEMY':
          targets = [defender.field.reduce((weakest, current) => 
            (current.health < weakest.health) ? current : weakest)];
          break;
        case 'RANDOM_ENEMY':
          targets = [defender.field[Math.floor(Math.random() * defender.field.length)]];
          break;
        default:
          targets = defender.field;
      }

      targets.forEach(target => {
        if (target && target.health > 0) {
          const damage = this.performAttack(attackerUnit, target);
          
          // Обработка смерти
          if (target.health <= 0 && target.activeAbility?.effectType === 'DEATH') {
            this.triggerDeathEffect(target);
          }
        }
      });
    });
  }

  triggerDeathEffect(deadUnit) {
    const ability = deadUnit.activeAbility;
    const targets = this.selectTargets(
      ability.target,
      deadUnit.owner === 'player1' ? enemyTeam : playerTeam
    );

    targets.forEach(target => {
      target.health -= ability.value;
    });
  }
  
  handleChannelAbilities(unit) {
	if (unit.ability?.effectType === 'CHANNEL') {
	  unit.ability.effects.forEach(effect => {
		if (effect.trigger === 'TURN_START' && this.currentTurn % 2 === 0) {
		  this.applyEffect(unit, { 
			type: effect.type,
			value: effect.value,
			duration: effect.duration
		  });
		}
	  });
	}
  }
  
  applyHealAOE(source, value) {
	const targets = this.getUnitsByTarget(source, 'ALL_ALLIES');
	targets.forEach(target => {
	  target.health = Math.min(target.maxHealth, target.health + value);
	});
  }
}

module.exports = { CombatSystem };