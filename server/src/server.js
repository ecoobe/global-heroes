const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis'); // Используем ioredis
const { PveGame } = require('../game/pve-engine');
const promBundle = require("express-prom-bundle");
const { abilities } = require('../heroes/abilities')
const SessionManager = require('../game/session-manager');
const sessionManager = new SessionManager();

const app = express();
const server = createServer(app);

// Инициализация Socket.IO с явным указанием транспортов
const io = new Server(server, {
  cors: {
    origin: [
      "https://coobe.ru",
      "https://www.coobe.ru",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 30000
  },
  transports: ["websocket", "polling"]
});

// Prometheus metrics middleware
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  customLabels: { project: 'global-heroes' },
  promClient: { collectDefaultMetrics: {} }
});

app.use(metricsMiddleware);

// Redis client configuration
const redisClient = new Redis({
  host: 'redis',
  port: 6379,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  autoResendUnfulfilledCommands: false
});

// Healthcheck endpoint
app.get("/health", (req, res) => {
  res.status(redisClient.status === 'ready' ? 200 : 503)
    .json({ 
      status: redisClient.status === 'ready' ? "OK" : "Service Unavailable",
      redisStatus: redisClient.status
    });
});

// Start server after Redis connection
const startServer = async () => {
  try {
    await redisClient.ping();
    server.listen(3000, '0.0.0.0', () => {
      console.log('Game server started on port 3000');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

redisClient.on('ready', () => {
  console.log('Redis client ready');
  startServer();
});

redisClient.on('error', (err) => {
  console.error('Redis Error:', err);
});

// Socket.IO event handlers
io.engine.on("connection", (socket) => {
  console.log(`New connection attempt: ${socket.id}`);
});

io.on("error", (err) => {
  console.error(`Global Socket.IO error: ${err.message}`);
});

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`Player disconnected (${socket.id}): ${reason}`);
  });

  socket.on('error', (err) => {
    console.error(`Socket error (${socket.id}):`, err);
  });

  socket.on('startPve', async (deck, callback) => {
    try {
      if (!deck || !Array.isArray(deck)) {
        throw new Error("Invalid deck format: expected array of hero IDs");
      }

      const invalidIds = deck.filter(id => !abilities[id]);
      
      if (invalidIds.length > 0) {
        throw new Error(`Invalid hero IDs: ${invalidIds.join(', ')}`);
      }

      const game = new PveGame(deck);
      await game.saveToRedis(redisClient);
      
      const sessionId = sessionManager.createSession(game.id);
      await socket.join(sessionId);
      
      const gameState = game.getPublicState();
      socket.emit('gameState', gameState);
      
      callback({ 
        status: 'success', 
        sessionId,
        gameState 
      });
      
    } catch (err) {
      console.error(`PVE Error [${socket.id}]:`, err);
      callback({ 
        status: 'error',
        code: "GAME_INIT_FAILED",
        message: err.message 
      });
    }
  });
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  
  try {
    await Promise.all([
      redisClient.quit(),
      new Promise((resolve) => server.close(resolve))
    ]);
    console.log('Resources closed');
    process.exit(0);
  } catch (err) {
    console.error('Shutdown error:', err);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);