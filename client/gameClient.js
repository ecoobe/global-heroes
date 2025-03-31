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
	  window.addEventListener('resize', () => this.resizeCanvas());
	  document.addEventListener('keydown', (e) => this.keys.add(e.key));
	  document.addEventListener('keyup', (e) => this.keys.delete(e.key));
	}
  
	initCanvas() {
	  this.canvas.width = window.innerWidth;
	  this.canvas.height = window.innerHeight;
	  this.ctx.imageSmoothingEnabled = true;
	}
  
	resizeCanvas() {
	  this.canvas.width = window.innerWidth;
	  this.canvas.height = window.innerHeight;
	  this.render();
	}
  
	gameLoop() {
		// Логирование текущих нажатых клавиш
		console.log('Active keys:', Array.from(this.keys));
	  
		// Рассчёт направления
		const direction = { x: 0, y: 0 };
		
		this.keys.forEach(key => {
		  switch(key) {
			case 'ArrowLeft': direction.x -= 1; break;
			case 'ArrowRight': direction.x += 1; break;
			case 'ArrowUp': direction.y -= 1; break;
			case 'ArrowDown': direction.y += 1; break;
		  }
		});
	
		// Логирование направления
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