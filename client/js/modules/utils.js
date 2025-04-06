export const DOMHelper = {
	validateElements(elements) {
	  Object.entries(elements).forEach(([name, element]) => {
		if (!element) throw new Error(`DOM element not found: ${name}`);
	  });
	},
  
	createCardElement(card) {
	  return `
		<div class="hand-card" data-id="${card.id}">
		  <div class="card-header">
			<span class="card-cost">${card.cost}⚡</span>
			<span class="card-name">${card.name}</span>
		  </div>
		  <div class="card-description">${card.description}</div>
		</div>
	  `;
	},
  
	createUnitElement(unit, side) {
	  return `
		<div class="unit ${side}-unit" data-id="${unit.id}">
		  <div class="unit-health">❤️${unit.health}</div>
		  <div class="unit-strength">⚔️${unit.strength}</div>
		  ${unit.charges ? `<div class="unit-charges">🔵×${unit.charges}</div>` : ''}
		</div>
	  `;
	},
  
	createHeroCard(hero) {
	  return `
		<div class="hero-card" data-id="${hero.id}">
		  <div class="hero-image" style="background-image: url('${hero.image || '/images/default-hero.png'}')"></div>
		  <h3>${hero.name}</h3>
		  <p>⚔️ ${hero.strength} ❤️ ${hero.health}</p>
		  <p class="ability">${hero.ability?.name || ''}</p>
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
	  setTimeout(() => element.classList.remove('visible'), timeout);
	},
  
	showError(message) {
	  const errorEl = document.getElementById('error-message');
	  this.show(errorEl, message);
	  console.error('Game Error:', message);
	}
};