const socket = io({
	transports: ['websocket'],
	secure: true,
	path: '/socket.io'
  });
  
  // Элементы игры
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 800;
  canvas.height = 600;
  
  // Состояние игры
  let players = {};
  
  // Обработчики событий
  socket.on('connect', () => {
	console.log('Connected to game server!');
	canvas.style.display = 'block';
  });
  
  socket.on('init', (initialPlayers) => {
	players = initialPlayers;
	render();
  });
  
  socket.on('update', (updatedPlayer) => {
	players[updatedPlayer.id] = updatedPlayer;
	render();
  });
  
  socket.on('playerDisconnected', (playerId) => {
	delete players[playerId];
	render();
  });
  
  socket.on('connect_error', (err) => {
	console.error('Connection error:', err.message);
	canvas.style.display = 'none';
  });
  
  // Обработка ввода
  const keys = {};
  document.addEventListener('keydown', (e) => {
	keys[e.key] = true;
	handleInput();
  });
  
  document.addEventListener('keyup', (e) => {
	keys[e.key] = false;
	handleInput();
  });
  
  function handleInput() {
	const direction = {
	  x: 0,
	  y: 0
	};
  
	if (keys['ArrowLeft']) direction.x = -1;
	if (keys['ArrowRight']) direction.x = 1;
	if (keys['ArrowUp']) direction.y = -1;
	if (keys['ArrowDown']) direction.y = 1;
  
	if (direction.x !== 0 || direction.y !== 0) {
	  socket.emit('move', direction);
	}
  }
  
  // Отрисовка
  function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	Object.values(players).forEach(player => {
	  ctx.fillStyle = player.color;
	  ctx.beginPath();
	  ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
	  ctx.fill();
	});
  }