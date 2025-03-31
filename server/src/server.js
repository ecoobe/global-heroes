const express = require('express');
const socketio = require('socket.io');
const redis = require('redis');

const app = express();
const server = app.listen(3000);
const io = socketio(server);

// Подключение к Redis
const redisClient = redis.createClient({
  host: 'redis',
  port: 6379
});

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('move', (data) => {
    // Сохраняем позицию в Redis
    redisClient.hset('players', socket.id, JSON.stringify(data));
    
    // Рассылаем обновления
    redisClient.hgetall('players', (err, players) => {
      io.emit('update', players);
    });
  });

  socket.on('disconnect', () => {
    redisClient.hdel('players', socket.id);
  });
});