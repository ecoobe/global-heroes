// server/game/core/combat-system.js
class CombatSystem {
	calculateDamage(attacker, defender) {
	  return Math.max(attacker.strength - defender.defense, 0);
	}
  
	performAttack(attackerUnit, defenderUnit) {
	  const damage = this.calculateDamage(attackerUnit, defenderUnit);
	  defenderUnit.health -= damage;
	  return damage;
	}
  
	resolveCombat(attackerPlayer, defenderPlayer) {
	  attackerPlayer.field.forEach(attacker => {
		const target = this.selectTarget(defenderPlayer.field);
		if (target) {
		  this.performAttack(attacker, target);
		}
	  });
	}
  
	selectTarget(field) {
	  return field.length > 0 ? field[0] : null;
	}
}
  
module.exports = { CombatSystem };