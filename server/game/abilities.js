// game/abilities.js
const abilities = Object.freeze(
	Object.entries({
	1: { 
		id: 1, 
		name: "Месть клинка", 
		cost: 2, 
		effectType: "DEATH", 
		target: "RANDOM_ENEMY", 
		value: 4 
	},

	2: { 
		id: 2, 
		name: "Невидимость", 
		cost: 1, 
		effectType: "PASSIVE", 
		trigger: "FIRST_ATTACK" 
	},

	3: { 
		id: 3, 
		name: "Тактик", 
		cost: 3, 
		effectType: "BUFF", 
		target: "ALL_ALLIES", 
		stat: "strength", 
		value: 1 
	},

	4: { 
		id: 4, 
		name: "Стрела Луны", 
		cost: 2, 
		effectType: "ATTACK", 
		target: "WEAKEST_ENEMY", 
		pierce: true 
	},

	5: { 
		id: 5, 
		name: "Щит предков", 
		cost: 2, 
		effectType: "DEFENSE", 
		modifier: -2 
	}
	
	}).reduce((acc, [key, value]) => {
	  const validated = {
		id: Number(key),
		name: String(value.name),
		cost: Math.max(1, Number(value.cost)),
		effectType: String(value.effectType),
		...value
	  };
	  acc[String(key)] = Object.freeze(validated);
	  return acc;
	}, {})
  );
  
  module.exports = { abilities };