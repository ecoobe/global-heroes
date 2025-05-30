import { DOMHelper } from './utils.js';

export class UIManager {
  constructor(elements) {
    this.elements = {
      ...elements,
      confirmSelection: elements.confirmSelection || document.getElementById('confirmSelection')
    };
    
    this.validateElements();
    this.initDynamicElements();
    this.handleCardHover = this.handleCardHover.bind(this);
  }

  validateElements() {
    const requiredElements = [
      'mainMenu', 'heroSelectContainer', 'gameContainer',
      'playerHealth', 'aiHealth', 'playerDeck', 'aiDeck',
      'playerHand', 'endTurnBtn', 'errorMessage',
      'playerBattlefield', 'aiBattlefield', 'confirmSelection'
    ];
    
    requiredElements.forEach(name => {
      if (!this.elements[name]) {
        throw new Error(`Critical UI element missing: ${name}`);
      }
    });
  }

  initDynamicElements() {
    this.elements.heroCards = [];
    this.activeInterface = 'main';
  }

  toggleInterface(screen) {
    console.log('[UI] Transition to:', screen);

    [this.elements.mainMenu, this.elements.heroSelectContainer, this.elements.gameContainer].forEach(el => {
      el.classList.remove('active');
      el.hidden = true;
    });

    const target = {
      main: this.elements.mainMenu,
      heroSelect: this.elements.heroSelectContainer,
      game: this.elements.gameContainer
    }[screen];

    if (target) {
      target.classList.add('active');
      target.hidden = false;
      
      if (screen === 'game') {
        target.style.display = 'grid';
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  updateHeroSelection(selectedCount) {
    const isComplete = selectedCount === 5;
    this.elements.confirmSelection.disabled = !isComplete;
    
    const counter = this.elements.confirmSelection.querySelector('.btn-text');
    if (counter) {
      counter.textContent = `Подтвердить выбор (${selectedCount}/5)`;
      counter.classList.toggle('complete', isComplete);
    }
  }

  renderHeroCards(heroes, clickHandler) {
    this.elements.heroSelect.innerHTML = heroes
      .map(hero => `
        <div class="hero-card" data-hero-id="${hero.id}">
          <div class="hero-image-container">
            <img src="${hero.image}" 
                 class="hero-image"
                 alt="${hero.name}"
                 loading="lazy"
                 onerror="this.src='assets/heroes/images/default-hero.webp'">
          </div>
          <h3>${hero.name}</h3>
          <div class="hero-stats">
            <span>${hero.health}</span>
            <span>${hero.strength}</span>
          </div>
        </div>
      `).join('');

    this.elements.heroCards = Array.from(
      this.elements.heroSelect.querySelectorAll('.hero-card')
    );
    
    this.elements.heroCards.forEach(card => {
      card.addEventListener('click', () => clickHandler(card.dataset.heroId));
      card.addEventListener('mouseenter', this.handleCardHover);
    });
  }

  handleCardHover(event) {
    const heroId = event.currentTarget.dataset.heroId;
    // Логика показа подсказки
    console.log('Hover over hero:', heroId);
  }

  updateGameInterface(state) {
    this.elements.playerHealth.textContent = state.human.health;
    this.elements.aiHealth.textContent = state.ai.health;
    this.elements.playerDeck.textContent = state.human.deck.length;
    this.elements.aiDeck.textContent = state.ai.deck.length;
    
    this.renderBattlefield(state.human.field, state.ai.field);
    this.renderPlayerHand(state.human.hand);
  }

  renderPlayerHand(hand) {
    this.elements.playerHand.innerHTML = hand
      .map(card => this.createHandCardElement(card))
      .join('');
  }

  createHandCardElement(card) {
	return `
	  <div class="hero-card" data-card-id="${card.id}">
		<div class="hero-image-container">
		  <img src="${card.image}" 
			   class="hero-image"
			   alt="${card.name}"
			   onerror="this.src='assets/heroes/images/default-hero.webp'">
			   
		  <div class="card-stat health-stat">${card.health}</div>
		  <div class="card-stat strength-stat">${card.strength}</div>
		  <div class="hero-name">${card.name}</div>
		</div>
	  </div>
	`;
  }

  renderBattlefield(playerField, aiField) {
    this.clearBattlefield();
  
    playerField.forEach(unit => {
      const element = DOMHelper.createUnitElement(unit, 'player');
      this.elements.playerBattlefield.appendChild(element);
    });
  
    aiField.forEach(unit => {
      const element = DOMHelper.createUnitElement(unit, 'ai');
      this.elements.aiBattlefield.appendChild(element);
    });
  }

  clearBattlefield() {
    this.elements.playerBattlefield.innerHTML = '';
    this.elements.aiBattlefield.innerHTML = '';
  }

  showError(message, duration = 5000) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorMessage.classList.add('visible');
    
    setTimeout(() => {
      this.elements.errorMessage.classList.remove('visible');
    }, duration);
  }
}