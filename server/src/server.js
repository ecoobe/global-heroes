let isReady = false;

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
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

// Healthcheck endpoint
app.get("/health", (req, res) => {
  if (isReady && redisClient.status === 'ready') {
    res.status(200).json({ status: "OK" });
  } else {
    res.status(503).json({ status: "Service Unavailable" });
  }
});

// Redis client configuration
const redisClient = new Redis({
  host: 'redis',
  port: 6379,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3
});

// Redis event handlers
redisClient.on('connect', () => {
  console.log('Redis connection established');
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
  isReady = true;
});

redisClient.on('error', (err) => {
  console.error('Redis Error:', err);
  isReady = false;
});

redisClient.on('reconnecting', () => {
  console.log('Redis reconnecting...');
  isReady = false;
});

// Start server after Redis connection
redisClient.once('ready', () => {
  server.listen(3000, '0.0.0.0', () => {
    console.log('Game server started on port 3000');
  });
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

        // Теперь abilities доступен
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