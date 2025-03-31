const socket = io({
	transports: ['websocket'],
	secure: true,
	path: '/socket.io',
	reconnection: true,
	reconnectionDelay: 1000,
	reconnectionAttempts: Infinity,
	timeout: 20000,
	auth: {
	  token: localStorage.getItem('playerToken') || null
	}
  });
  
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 800;
  canvas.height = 600;
  
  let players = {};
  
  // Обработчики соединения
  socket.on('connect', () => {
	console.log('Connected with ID:', socket.id);
	localStorage.setItem('playerToken', socket.id);
  });
  
  socket.on('init', (initialPlayers) => {
	players = initialPlayers;
	render();
  });
  
  socket.on('update', (updatedPlayers) => {
	Object.assign(players, updatedPlayers);
	requestAnimationFrame(render);
  });
  
  socket.on('removePlayer', (playerId) => {
	delete players[playerId];
	requestAnimationFrame(render);
  });
  
  socket.on('connect_error', (err) => {
	console.error('Connection error:', err.message);
	setTimeout(() => socket.connect(), 5000);
  });
  
  // Обработка ввода
  const keys = new Set();
  document.addEventListener('keydown', (e) => keys.add(e.key));
  document.addEventListener('keyup', (e) => keys.delete(e.key));
  
  setInterval(() => {
	const direction = {
	  x: 0,
	  y: 0
	};
	
	if (keys.has('ArrowLeft')) direction.x = -1;
	if (keys.has('ArrowRight')) direction.x = 1;
	if (keys.has('ArrowUp')) direction.y = -1;
	if (keys.has('ArrowDown')) direction.y = 1;
  
	if (direction.x || direction.y) {
	  socket.emit('move', direction);
	}
  }, 50);
  
  // Отрисовка
  function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	Object.entries(players).forEach(([id, player]) => {
	  ctx.beginPath();
	  ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
	  ctx.fillStyle = player.color;
	  ctx.fill();
	  ctx.strokeStyle = '#333';
	  ctx.stroke();
	});
  }