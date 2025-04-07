export const DOMHelper = {
	validateElements(elements) {
	  Object.entries(elements).forEach(([name, element]) => {
		if (!element) throw new Error(`DOM element not found: ${name}`);
	  });
	},
  
	createCardElement(card) {
		// Добавить изображение и обработку ошибок
		return `
		  <div class="hand-card" data-id="${card.id}">
			<img src="${card.image}" 
				 alt="${card.name}" 
				 class="card-image"
				 onerror="this.src='/images/default-hero.png'">
			<div class="card-header">
			  <span class="card-cost">${card.cost}⚡</span>
			  <span class="card-name">${card.name}</span>
			</div>
			<div class="card-description">${card.description}</div>
		  </div>
		`;
	  },
	
	createUnitElement(unit, side) {
		// Добавить изображение юнита
		return `
		  <div class="unit ${side}-unit" data-id="${unit.id}">
			<img src="${unit.image}" 
				 alt="${unit.name}"
				 class="unit-image"
				 onerror="this.style.display='none'">
			<div class="unit-health">❤️${unit.health}</div>
			<div class="unit-strength">⚔️${unit.strength}</div>
			${unit.charges ? `<div class="unit-charges">🔵×${unit.charges}</div>` : ''}
		  </div>
		`;
	},
	
	createHeroCard(hero) {
		// Оптимизировать фондовое изображение
		return `
		  <div class="hero-card" data-id="${hero.id}">
			<div class="hero-image-container">
			  <img src="${hero.image || '/images/default-hero.png'}" 
				   alt="${hero.name}"
				   class="hero-image"
				   onerror="this.src='/images/default-hero.png'">
			</div>
			<h3>${hero.name}</h3>
			<div class="hero-stats">
			  <span>⚔️ ${hero.strength}</span>
			  <span>❤️ ${hero.health}</span>
			</div>
			<p class="ability">${hero.ability?.name || 'Без способности'}</p>
		  </div>
		`;
	}
};
	
	export const ErrorHandler = {
	  show(element, message, timeout = 5000) {
		if (!element) {
		  console.error('Error element not found:', message);
		  return;
		}
		element.textContent = message;
		element.classList.add('visible');
		if (timeout > 0) { // Добавить проверку timeout
		  setTimeout(() => element.classList.remove('visible'), timeout);
		}
	},
  
	showError(message) {
	  const errorEl = document.getElementById('error-message');
	  this.show(errorEl, message);
	  console.error('Game Error:', message);
	}
};