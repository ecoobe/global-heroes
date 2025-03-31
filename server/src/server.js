const express = require('express');
const socketio = require('socket.io');
const redis = require('redis');
const http = require('http');

// Инициализация приложения
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "https://coobe.ru",
    methods: ["GET", "POST"]
  }
});

// Подключение к Redis
const redisClient = redis.createClient({
  host: 'redis',
  port: 6379
});

// Middleware для CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://coobe.ru");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Игровое состояние
const gameState = {
  players: {}
};

// Обработчики WebSocket
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Инициализация игрока
  gameState.players[socket.id] = {
    x: Math.random() * 800,
    y: Math.random() * 600,
    color: `#${Math.floor(Math.random()*16777215).toString(16)}`
  };

  // Отправка начального состояния
  socket.emit('init', gameState.players);

  // Обработка движения
  socket.on('move', (direction) => {
    if (!isValidMove(direction)) return;

    const player = gameState.players[socket.id];
    player.x += direction.x * 5;
    player.y += direction.y * 5;

    // Сохранение в Redis и рассылка
    redisClient.hset('players', socket.id, JSON.stringify(player));
    io.emit('update', player);
  });

  // Отключение игрока
  socket.on('disconnect', () => {
    redisClient.hdel('players', socket.id);
    delete gameState.players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

// Валидация движения
function isValidMove(direction) {
  return (
    Math.abs(direction.x) <= 1 &&
    Math.abs(direction.y) <= 1 &&
    typeof direction.x === 'number' &&
    typeof direction.y === 'number'
  );
}

// Запуск сервера
server.listen(3000, () => {
  console.log('Game server listening on port 3000');
});