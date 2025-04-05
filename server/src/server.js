const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const promBundle = require("express-prom-bundle");
const SessionManager = require('../game/session-manager');
const { Gauge } = require('prom-client');

const app = express();
const server = createServer(app);

// Конфигурация метрик
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  customLabels: { project: 'global-heroes' },
  promClient: { collectDefaultMetrics: { timeout: 5000 } }
});
app.use(metricsMiddleware);

// Инициализация сервисов
const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
const io = new Server(server, {
  cors: {
    origin: ["https://coobe.ru", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const sessionManager = new SessionManager();

// WebSocket обработчики
io.on('connection', (socket) => {
  console.log(`🎮 New connection: ${socket.id}`);

  socket.on('startPve', async (deckInput, callback) => {
    try {
      const { valid, deck, error } = validateDeck(deckInput);
      if (!valid) throw new Error(error);

      // Создаем сессию и получаем состояние игры
      const session = sessionManager.createGameSession(socket.id, deck);
      
      callback({
        status: 'success',
        sessionId: session.sessionId,
        gameState: session.gameState
      });

    } catch (error) {
      console.error(`💥 Game init failed: ${error.message}`);
      callback({
        status: 'error',
        code: "INIT_FAILURE",
        message: error.message
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`⚠️  Disconnected: ${socket.id}`);
    sessionManager.destroySession(socket.id);
  });
});

// Валидация колоды
function validateDeck(input) {
  try {
    const parsed = JSON.parse(input);
    if (!Array.isArray(parsed)) throw new Error("Deck must be an array");
    if (parsed.length !== 5) throw new Error("Deck must contain 5 cards");
    return { valid: true, deck: parsed };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Запуск сервера
server.listen(3000, '0.0.0.0', () => {
  console.log('🚀 Server started on port 3000');
});