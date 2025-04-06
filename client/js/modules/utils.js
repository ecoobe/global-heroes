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
  
	createUnitElement() {
		throw new Error('Units deprecated! Use cards only');
	},
  
	createHeroCard() {
		throw new Error('Heroes deprecated! Use player health directly');
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