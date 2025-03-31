const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const { createClient } = require('redis');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://coobe.ru",
    methods: ["GET", "POST"]
  }
});

// Redis клиент
const redisClient = createClient({
  url: 'redis://redis:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
  }
});

(async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Redis connection error:', err);
  }
})();

// Игровое состояние
const gameState = {
  players: new Map()
};

io.on('connection', async (socket) => {
  console.log(`Player connected: ${socket.id}`);

  try {
    // Инициализация игрока
    const initialData = {
      x: Math.floor(Math.random() * 800),
      y: Math.floor(Math.random() * 600),
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };

    gameState.players.set(socket.id, initialData);
    await redisClient.hSet('players', socket.id, JSON.stringify(initialData));
    
    socket.emit('init', Object.fromEntries(gameState.players));
    io.emit('update', { [socket.id]: initialData });

    // Обработка движения
    socket.on('move', async (direction) => {
		console.log(`Move from ${socket.id}:`, direction);
		
		if (!isValidDirection(direction)) {
		  console.warn('Invalid direction:', direction);
		  return;
		}
	  
		try {
		  const player = gameState.players.get(socket.id);
		  player.x += direction.x * 5;
		  player.y += direction.y * 5;
	  
		  await redisClient.hSet('players', socket.id, JSON.stringify(player));
		  io.emit('update', { [socket.id]: player });
		} catch (err) {
		  console.error('Move error:', err);
		}
	});

    // Отключение
    socket.on('disconnect', async () => {
      gameState.players.delete(socket.id);
      await redisClient.hDel('players', socket.id);
      io.emit('removePlayer', socket.id);
    });

  } catch (err) {
    console.error('Socket error:', err);
  }
});

function isValidDirection(direction) {
  return (
    Math.abs(direction.x) <= 1 &&
    Math.abs(direction.y) <= 1 &&
    typeof direction.x === 'number' &&
    typeof direction.y === 'number'
  );
}

server.listen(3000, () => {
  console.log('Game server running on port 3000');
});