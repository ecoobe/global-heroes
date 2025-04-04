module.exports = {
	1: {
	  id: 1,
	  name: "Месть клинка",
	  description: "При смерти наносит 4 урона случайному врагу",
	  cost: 2,
	  charges: 1,
	  effectType: "DEATH",
	  target: "RANDOM_ENEMY",
	  value: 4
	},
	2: {
	  id: 2,
	  name: "Невидимость",
	  description: "Избегает первой атаки в бою",
	  cost: 1,
	  charges: 2,
	  effectType: "PASSIVE",
	  trigger: "FIRST_ATTACK"
	},
	3: {
	  id: 3,
	  name: "Тактик",
	  description: "Увеличивает силу всех союзников на 1",
	  cost: 3,
	  charges: 1,
	  effectType: "BUFF",
	  target: "ALL_ALLIES",
	  stat: "strength",
	  value: 1
	},
	4: {
	  id: 4,
	  name: "Стрела Луны",
	  description: "Атакует самого слабого врага, игнорируя защиту",
	  cost: 2,
	  charges: 3,
	  effectType: "ATTACK",
	  target: "WEAKEST_ENEMY",
	  pierce: true
	},
	5: {
	  id: 5,
	  name: "Щит предков",
	  description: "Получает на 2 меньше урона от атак",
	  cost: 2,
	  charges: 2,
	  effectType: "DEFENSE",
	  modifier: -2
	}
};