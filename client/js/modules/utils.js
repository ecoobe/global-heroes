export const DOMHelper = {
	validateElements(elements) {
	  Object.entries(elements).forEach(([name, element]) => {
		if (!element) throw new Error(`DOM element not found: ${name}`);
	  });
	},
  
	createCardElement(card, type = 'player') {
	  const element = document.createElement('div');
	  element.className = `${type}-card card`;
  
	  if (type === 'player' && card) {
		element.innerHTML = `
		  <div class="card-inner">
			<div class="card-front">
			  <img src="/assets/heroes/images/${card.id}.webp" 
				   alt="${card.name}" 
				   loading="lazy">
			  <div class="card-cost">${card.cost}⚡</div>
			</div>
		  </div>
		`;
		element.dataset.id = card.id;
	  } else {
		element.innerHTML = `
		  <div class="card-back">
			<img src="/assets/heroes/images/card-back.webp" 
				 alt="Card Back" 
				 loading="lazy">
			<div class="ai-label">AI</div>
		  </div>
		`;
		element.classList.add('disabled');
	  }
	  return element.outerHTML;
	},
  
	createUnitElement(unit, side) {
	  return `
		<div class="unit ${side}-unit" data-id="${unit.id}">
		  <img src="/assets/heroes/images/${unit.id}.webp" 
			   alt="${unit.name}" 
			   class="unit-image"
			   loading="lazy">
		  <div class="unit-health">❤️${unit.health}</div>
		  <div class="unit-strength">⚔️${unit.strength}</div>
		  ${unit.charges ? `<div class="unit-charges">🔵×${unit.charges}</div>` : ''}
		</div>
	  `;
	},
  
	createHeroCard(hero) {
	  return `
		<div class="hero-card" data-id="${hero.id}">
		  <img src="${hero.image || '/assets/heroes/images/default-hero.webp'}" 
			   alt="${hero.name}" 
			   class="hero-image"
			   loading="lazy">
		  <div class="hero-info">
			<h3>${hero.name}</h3>
			<div class="stats">
			  <span>⚔️ ${hero.strength}</span>
			  <span>❤️ ${hero.health}</span>
			</div>
			${hero.ability ? `<p class="ability">${hero.ability.name}</p>` : ''}
		  </div>
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