class GameClient {
	constructor() {
	  this.canvas = document.getElementById('gameCanvas');
	  this.ctx = this.canvas.getContext('2d');
	  this.statusElement = document.getElementById('connectionStatus');
	  this.players = new Map();
	  this.keys = new Set();
	  
	  this.initSocket();
	  this.initEventListeners();
	  this.initCanvas();
	  this.gameLoop();
	}
  
	initSocket() {
	  this.socket = io({
		transports: ['websocket'],
		secure: true,
		path: '/socket.io',
		reconnection: true,
		reconnectionAttempts: Infinity,
		auth: {
		  token: localStorage.getItem('playerToken')
		}
	  });
  
	  this.socket.on('connect', () => this.handleConnect());
	  this.socket.on('disconnect', () => this.handleDisconnect());
	  this.socket.on('init', (data) => this.handleInit(data));
	  this.socket.on('update', (data) => this.handleUpdate(data));
	  this.socket.on('removePlayer', (id) => this.handleRemovePlayer(id));
	  this.socket.on('connect_error', (err) => this.handleError(err));
	}
  
	initEventListeners() {
		// Заменяем слушатели на версию с фильтрацией
		const validKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
		
		document.addEventListener('keydown', (e) => {
		  if (validKeys.has(e.key)) {
			this.keys.add(e.key);
			console.log('Key added:', e.key); // Для отладки
		  }
		});
	  
		document.addEventListener('keyup', (e) => {
		  if (validKeys.has(e.key)) {
			this.keys.delete(e.key);
			console.log('Key removed:', e.key); // Для отладки
		  }
		});
	}
  
	initCanvas() {
		this.canvas.tabIndex = 0; // Делаем элемент фокусируемым
		this.canvas.focus(); // Устанавливаем фокус
		this.canvas.style.outline = 'none'; // Убираем стандартный outline
		
		this.canvas.addEventListener('blur', () => {
		  this.keys.clear(); // Сбрасываем клавиши при потере фокуса
		  console.log('Canvas lost focus!');
		});
	}
  
	resizeCanvas() {
	  this.canvas.width = window.innerWidth;
	  this.canvas.height = window.innerHeight;
	  this.render();
	}
  
	gameLoop() {
		// Переместите фильтрацию клавиш В начало
		const filteredKeys = Array.from(this.keys).filter(key => 
		  ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)
		);
	  
		console.log('Filtered keys:', filteredKeys); // Теперь переменная определена
	  
		const direction = { x: 0, y: 0 };
		
		filteredKeys.forEach(key => { // Используем отфильтрованные клавиши
		  switch(key) {
			case 'ArrowLeft': direction.x -= 1; break;
			case 'ArrowRight': direction.x += 1; break;
			case 'ArrowUp': direction.y -= 1; break;
			case 'ArrowDown': direction.y += 1; break;
		  }
		});
	  
		if (direction.x !== 0 || direction.y !== 0) {
		  console.log('Sending movement:', direction);
		  this.socket.emit('move', direction);
		}
	  
		requestAnimationFrame(() => this.gameLoop());
	}
  
	handleConnect() {
	  this.statusElement.className = 'connected';
	  this.statusElement.textContent = `Connected (ID: ${this.socket.id})`;
	  localStorage.setItem('playerToken', this.socket.id);
	}
  
	handleDisconnect() {
	  this.statusElement.className = 'connecting';
	  this.statusElement.textContent = 'Reconnecting...';
	}
  
	handleInit(data) {
	  this.players = new Map(Object.entries(data));
	  this.render();
	}
  
	handleUpdate(data) {
	  Object.entries(data).forEach(([id, player]) => {
		this.players.set(id, player);
	  });
	  this.render();
	}
  
	handleRemovePlayer(id) {
	  this.players.delete(id);
	  this.render();
	}
  
	handleError(err) {
	  this.statusElement.className = 'error';
	  this.statusElement.textContent = `Error: ${err.message}`;
	  console.error('Connection error:', err);
	}
  
	render() {
	  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	  
	  this.players.forEach(player => {
		this.ctx.beginPath();
		this.ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
		this.ctx.fillStyle = player.color;
		this.ctx.fill();
		this.ctx.strokeStyle = '#34495e';
		this.ctx.lineWidth = 2;
		this.ctx.stroke();
	  });
	}
  }
  
  // Инициализация игры при полной загрузке DOM
  document.addEventListener('DOMContentLoaded', () => {
	new GameClient();
  });