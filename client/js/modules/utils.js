export const DOMHelper = {
	createCardElement(cardData, type = 'player') {
	  const card = document.createElement('div');
	  card.className = `card ${type}-card`;
  
	  if (type !== 'ai' && cardData) {
		card.innerHTML = `
		  <div class="card-content">
			<img src="/assets/cards/${cardData.id}.webp" 
				 alt="${cardData.name}" 
				 loading="lazy">
			<div class="card-cost">${cardData.cost}</div>
		  </div>
		`;
		card.dataset.cardId = cardData.id;
	  } else {
		card.innerHTML = `
		  <div class="card-back">
			<img src="/assets/cards/back.webp" 
				 alt="Card Back" 
				 loading="lazy">
		  </div>
		`;
	  }
	  
	  return card.outerHTML;
	}
  };
  
  export const ErrorHandler = {
	show(element, message, timeout = 5000) {
	  if (!element) return;
	  element.textContent = message;
	  element.classList.add('visible');
	  setTimeout(() => element.classList.remove('visible'), timeout);
	}
  };