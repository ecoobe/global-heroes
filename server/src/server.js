const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const redis = require('redis');
const { PveGame } = require('../game/pve-engine');
const promBundle = require("express-prom-bundle");
const SessionManager = require('../game/session-manager');
const sessionManager = new SessionManager();

const app = express();
const server = createServer(app);

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
  }
});

const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  customLabels: { project: 'global-heroes' },
  promClient: { collectDefaultMetrics: {} }
});

app.use(metricsMiddleware);

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK",
    redis: redisClient.isReady
  });
});

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
        throw new Error("Invalid deck format: expected array");
      }

      const game = new PveGame(deck);
      await game.saveToRedis(redisClient);
      
      const sessionId = sessionManager.createSession(deck);
      await socket.join(sessionId);
      
      const gameState = game.getPublicState();
      console.log(`New PVE game started (${sessionId})`);
      socket.emit('gameState', gameState);
      
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

// Единственный вызов server.listen
server.listen(3000, '0.0.0.0', () => {
  console.log('Game server running on port 3000');
});

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