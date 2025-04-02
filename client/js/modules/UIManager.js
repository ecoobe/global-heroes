export class UIManager {
	constructor(elements) {
	  this.elements = elements;
	}
  
	toggleInterface(screen) {
	  ['main', 'heroSelect', 'game'].forEach(ui => 
		this.elements[`${ui}${ui === 'main' ? 'Menu' : 'Container'}`]?.classList.remove('active')
	  );
	  if (screen === 'main') this.elements.mainMenu.classList.add('active');
	  else this.elements[`${screen}Container`]?.classList.add('active');
	}
  
	updateHeroSelection(selectedCount) {
	  this.elements.confirmButton.disabled = selectedCount !== 5;
	  this.elements.confirmButton.innerHTML = `
		<span class="btn-text">Подтвердить выбор (${selectedCount}/5)</span>
	  `;
	}
  
	renderHeroCards(heroes, clickHandler) {
	  this.elements.heroSelect.innerHTML = heroes.map(hero => `
		<div class="hero-card" data-id="${hero.id}">
		  <div class="hero-image" style="background-image: url('${hero.image}')"></div>
		  <h3>${hero.name}</h3>
		  <p>⚔️ ${hero.strength} ❤️ ${hero.health}</p>
		</div>
	  `).join('');
  
	  this.elements.heroSelect.querySelectorAll('.hero-card').forEach(card => {
		card.addEventListener('click', clickHandler);
	  });
	}
}