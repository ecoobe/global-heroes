const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const promBundle = require("express-prom-bundle");
const SessionManager = require('../game/session-manager');
const { Gauge } = require('prom-client');
const { abilities } = require('../game/abilities');

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

// Кастомные метрики
const redisStatusGauge = new Gauge({
  name: 'redis_status',
  help: 'Redis connection status',
  labelNames: ['service']
});

const wsConnectionsGauge = new Gauge({
  name: 'websocket_connections',
  help: 'Active WebSocket connections'
});

// Подключение Redis
const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  retryStrategy: times => Math.min(times * 100, 5000),
  maxRetriesPerRequest: null
});

// Инициализация Socket.IO
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 60000,
    skipMiddlewares: true
  },
  cors: {
    origin: ["https://coobe.ru", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket"]
});

// Менеджер сессий
const sessionManager = new SessionManager();

// Healthcheck endpoint
app.get("/health", async (req, res) => {
  try {
    await redisClient.ping();
    res.json({
      status: "OK",
      services: {
        redis: "active",
        websocket: io.engine.clientsCount > 0 ? "active" : "idle",
        abilities: Object.keys(abilities).length >= 5 ? "valid" : "invalid"
      }
    });
  } catch (err) {
    res.status(503).json({ 
      status: "unavailable",
      error: err.message
    });
  }
});

// Обработчики Redis
redisClient.on('ready', () => {
  console.log('✅ Redis connected');
  redisStatusGauge.set({ service: 'main' }, 1);
});

redisClient.on('error', (err) => {
  console.error(`⛔ Redis error: ${err.message}`);
  redisStatusGauge.set({ service: 'main' }, 0);
});

// WebSocket обработчики
io.on('connection', (socket) => {
  wsConnectionsGauge.inc();
  console.log(`🎮 New connection: ${socket.id}`);

  socket.on('startPve', async (deckInput, callback) => {
    try {
      const { valid, deck, error } = validateDeck(deckInput);
      if (!valid) throw new Error(error);

      const session = sessionManager.createGameSession(socket.id, deck);
      const gameState = sessionManager.getGame(session.gameId).getPublicState();

      callback({
        status: 'success',
        sessionId: session.sessionId,
        gameState: gameState
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
    wsConnectionsGauge.dec();
    console.log(`⚠️  Disconnected: ${socket.id}`);
    sessionManager.destroySession(socket.id);
  });
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Shutting down...');
  try {
    await Promise.all([
      redisClient.quit(),
      new Promise(resolve => server.close(resolve)),
      sessionManager.cleanupInactiveSessions(0) // Удалить все сессии
    ]);
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('⛔ Force shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Валидация колоды
function validateDeck(input) {
  try {
    let parsed = input;
    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input);
      } catch (e) {
        return { valid: false, error: "Invalid JSON format" };
      }
    }

    if (!Array.isArray(parsed)) {
      return { valid: false, error: "Deck must be an array" };
    }

    const deck = parsed.map(item => {
      const id = Number(item?.id ?? item);
      if (isNaN(id)) throw new Error(`Invalid ID: ${item}`);
      if (!abilities[String(id)]) throw new Error(`Ability ${id} not found`);
      return id;
    });

    if (deck.length !== 5) {
      throw new Error("Deck must contain exactly 5 cards");
    }

    return { valid: true, deck };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Запуск сервера
server.listen(3000, '0.0.0.0', () => {
  console.log('🚀 Server started on port 3000');
});