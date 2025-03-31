const socket = io('http://37.252.23.84');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let playerX = 400;
let playerY = 300;

socket.on('update', players => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  Object.entries(players).forEach(([id, data]) => {
    const pos = JSON.parse(data);
    ctx.fillStyle = id === socket.id ? 'red' : 'blue';
    ctx.fillRect(pos.x, pos.y, 50, 50);
  });
});

document.addEventListener('keydown', (e) => {
  const speed = 10;
  switch(e.key) {
    case 'ArrowLeft': playerX -= speed; break;
    case 'ArrowRight': playerX += speed; break;
    case 'ArrowUp': playerY -= speed; break;
    case 'ArrowDown': playerY += speed; break;
  }
  
  socket.emit('move', { x: playerX, y: playerY });
});

socket.on("connect_error", (err) => {
	console.log("Connection error:", err.message);
  });
  
  socket.on("connect", () => {
	console.log("Connected to server!");
  });