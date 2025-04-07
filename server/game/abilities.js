// game/abilities.js
const abilities = Object.freeze(
	Object.entries({
	1: { 
		id: 1,							// Уникальный идентификатор
		name: "Месть клинка",			// Название для интерфейса
		cost: 2,						// Стоимость использования (энергия/ресурс)
		effectType: "DEATH",			// Срабатывает при смерти носителя
		target: "RANDOM_ENEMY",			// Цель: случайный враг
		value: 4						// Наносимый урон
	},

	2: { 
		id: 2,							// Уникальный идентификатор
		name: "Невидимость",			// Название для интерфейса
		cost: 1,						// Низкая стоимость
		effectType: "PASSIVE",			// Постоянный эффект
		trigger: "FIRST_ATTACK"			// Активация при первой атаке
	},

	3: { 
		id: 3,							// Уникальный идентификатор
		name: "Тактик",					// Название для интерфейса
		cost: 3,						// Высокая стоимость
		effectType: "BUFF",				// Усиление союзников
		target: "ALL_ALLIES",			// Все члены команды
		stat: "strength",				// Атрибут для усиления
		value: 1,						// Значение усиления (+1 к силе)
		duration: 3						// Длительность баффа
	},

	4: { 
		id: 4,							// Уникальный идентификатор
		name: "Стрела Луны",			// Название для интерфейса
		cost: 2,						// Средняя стоимость
		effectType: "ATTACK",			// Активная атака
		target: "WEAKEST_ENEMY",		// Цель: враг с наименьшим здоровьем
		pierce: true,					// Игнорирует защиту
		value: 4						// Наносит 4 урона поверх базовой атаки
	},

	5: { 
		id: 5,							// Уникальный идентификатор
		name: "Щит предков",			// Название для интерфейса
		cost: 2,						// Средняя стоимость
		effectType: "DEFENSE",			// Защитный эффект
		modifier: -2,					// Модификатор получаемого урона (-2)
		duration: 2						// Эффект длится 2 хода
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