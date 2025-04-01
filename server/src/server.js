const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const redis = require('redis');
const { PveGame } = require('../game/pve-engine');
const promBundle = require("express-prom-bundle");
const SessionManager = require('../game/session-manager');
const sessionManager = new SessionManager();

// Инициализация приложения
const app = express();
const server = createServer(app);

// Явное указание IP для прослушивания
server.listen(3000, '0.0.0.0', () => {
    console.log('Game server running on 0.0.0.0:3000');
});

// Улучшенная конфигурация Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      "https://coobe.ru",
      "https://www.coobe.ru",
      "http://localhost:3000" // Для локальной разработки
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 30000 // 30 секунд
  }
});

// Инициализация метрик
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  customLabels: { project: 'global-heroes' },
  promClient: { collectDefaultMetrics: {} }
});

app.use(metricsMiddleware);

// Эндпоинт для проверки работы
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Подключение Redis с обработкой ошибок
const redisClient = redis.createClient({ 
  url: 'redis://redis:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
  }
});

redisClient.on('error', (err) => console.error('Redis Error:', err));
redisClient.on('connect', () => console.log('Redis connected successfully'));
redisClient.on('reconnecting', () => console.log('Redis reconnecting...'));

(async () => {
  try {
    await redisClient.connect();
    console.log('Redis connection established');
  } catch (err) {
    console.error('Redis connection failed:', err);
    process.exit(1);
  }
})();

// Логирование подключений Socket.IO
io.engine.on("connection", (socket) => {
  console.log(`New connection attempt: ${socket.id}`);
});

// Глобальная обработка ошибок Socket.IO
io.on("error", (err) => {
  console.error(`Global Socket.IO error: ${err.message}`);
});

// Обработчики соединений
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Обработчик отключения
  socket.on('disconnect', (reason) => {
    console.log(`Player disconnected (${socket.id}): ${reason}`);
  });

  // Обработчик ошибок
  socket.on('error', (err) => {
    console.error(`Socket error (${socket.id}):`, err);
  });

  // Обработчик начала PVE игры
  socket.on('startPve', async (deck, callback) => {
    try {
      // Валидация входных данных
      if (!deck || !Array.isArray(deck)) {
        throw new Error("Invalid deck format: expected array");
      }

      // Создание игры
      const game = new PveGame(deck);
      await game.saveToRedis(redisClient);
      
      // Создание сессии
      const sessionId = sessionManager.createSession(deck);
      await socket.join(sessionId);
      
      // Отправка состояния
      const gameState = game.getPublicState();
      console.log(`New PVE game started (${sessionId})`);
      socket.emit('gameState', gameState);
      
      // Подтверждение клиенту
      if (typeof callback === 'function') {
        callback({ status: 'success', sessionId });
      }
    } catch (err) {
      console.error(`PVE Error [${socket.id}]:`, err);
      socket.emit('error', { 
        code: "GAME_INIT_FAILED",
        message: err.message 
      });
      
      if (typeof callback === 'function') {
        callback({ 
          status: 'error',
          code: "GAME_INIT_FAILED",
          message: err.message 
        });
      }
    }
  });
});

// Запуск сервера
server.listen(3000, '0.0.0.0', () => {
  console.log('Game server running on port 3000');
});

// Обработка завершения работы
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  try {
    await redisClient.quit();
    console.log('Redis connection closed');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  } catch (err) {
    console.error('Shutdown error:', err);
    process.exit(1);
  }
});