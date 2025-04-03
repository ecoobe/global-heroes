const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const { PveGame } = require('../game/pve-engine');
const promBundle = require("express-prom-bundle");
const { abilities } = require('../heroes/abilities');
const SessionManager = require('../game/session-manager');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const crypto = require('crypto');
const { Gauge } = require('prom-client');

const app = express();
const server = createServer(app);

// 1. Конфигурация валидатора колод
const deckSchema = Joi.array().items(
  Joi.number().integer().min(1).max(19)
).length(5).label('HeroDeck');

// 2. Инициализация метрик
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  customLabels: { project: 'global-heroes' },
  promClient: {
    collectDefaultMetrics: {
      timeout: 10000
    }
  }
});

// Кастомные метрики
const redisStatus = new Gauge({
  name: 'redis_status',
  help: 'Redis connection status (1 = connected, 0 = disconnected)',
  labelNames: ['service']
});

const websocketConnections = new Gauge({
  name: 'websocket_connections',
  help: 'Active WebSocket connections count'
});

app.use(metricsMiddleware);

// 3. Конфигурация Redis
const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// 4. Инициализация Socket.IO
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 30000
  },
  cors: {
    origin: [
      "https://coobe.ru",
      "https://www.coobe.ru",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket"]
});

// 5. Менеджер сессий
const sessionManager = new SessionManager();

// 6. Healthcheck endpoint
app.get("/health", async (req, res) => {
  try {
    await redisClient.ping();
    res.json({
      status: "OK",
      services: {
        redis: "available",
        websocket: io.engine.clientsCount > 0 ? "active" : "idle"
      }
    });
  } catch (err) {
    res.status(503).json({
      status: "Service Unavailable",
      error: err.message
    });
  }
});

// 7. Инициализация сервера
const startServer = async () => {
  try {
    await redisClient.ping();
    server.listen(3000, '0.0.0.0', () => {
      console.log('🚀 Game server started on port 3000');
      console.log('🔗 Redis:', redisClient.status);
    });
  } catch (err) {
    console.error('⛔ Failed to start server:', err);
    process.exit(1);
  }
};

// 8. Обработчики Redis
redisClient.on('ready', () => {
  console.log('✅ Redis connection established');
  redisStatus.set({ service: 'main' }, 1);
});

redisClient.on('error', (err) => {
  console.error('⛔ Redis Error:', err.message);
  redisStatus.set({ service: 'main' }, 0);
});

// 9. Socket.IO логика
io.on('connection', (socket) => {
  console.log(`🎮 New connection: ${socket.id}`);
  websocketConnections.inc();

  socket.on('startPve', async (deck, callback) => {
    try {
      const { error } = deckSchema.validate(deck);
      if (error) throw new Error(error.details[0].message);

      const invalidIds = deck.filter(id => !abilities[id]);
      if (invalidIds.length > 0) {
        throw new Error(`Invalid hero IDs: ${invalidIds.join(', ')}`);
      }

      const game = new PveGame(deck);
      game.id = crypto.randomUUID();

      await redisClient.hset(
        'active_games',
        game.id,
        JSON.stringify(game.getPublicState())
      );

      const sessionId = sessionManager.createSession(game.id);
      await socket.join(sessionId);

      callback({
        status: 'success',
        sessionId,
        gameState: game.getPublicState()
      });

    } catch (err) {
      console.error(`[PVE] ${socket.id}:`, err.message);
      callback({
        status: 'error',
        code: "GAME_INIT_FAILURE",
        message: err.message
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`⚠️  Disconnected: ${socket.id} (${reason})`);
    websocketConnections.dec();
  });

  socket.on('error', (err) => {
    console.error(`⛔ Socket error (${socket.id}):`, err.message);
  });
});

// 10. Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Starting graceful shutdown...');
  
  try {
    await redisClient.quit();
    console.log('✅ Redis connection closed');

    await new Promise((resolve) => {
      server.close(resolve);
      setTimeout(resolve, 5000).unref();
    });
    console.log('✅ Server stopped');

    process.exit(0);
  } catch (err) {
    console.error('⛔ Shutdown error:', err);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Запуск сервера
startServer();