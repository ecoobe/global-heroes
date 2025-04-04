const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const { PveGame } = require('../game/modes/pve-engine');
const promBundle = require("express-prom-bundle");
const { abilities } = require('../heroes/abilities');
const SessionManager = require('../game/session-manager');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const crypto = require('crypto');
const { Gauge } = require('prom-client');

const app = express();
const server = createServer(app);

// 1. Валидация колод
const deckSchema = Joi.array().items(
  Joi.number().integer().min(1).max(19)
).length(5).label('HeroDeck');

// 2. Настройка метрик
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  customLabels: { project: 'global-heroes' },
  promClient: { collectDefaultMetrics: { timeout: 10000 } }
});

// Кастомные метрики
const redisStatus = new Gauge({
  name: 'redis_status',
  help: 'Redis connection status',
  labelNames: ['service']
});

const websocketConnections = new Gauge({
  name: 'websocket_connections',
  help: 'Active WebSocket connections'
});

app.use(metricsMiddleware);

// 3. Подключение Redis
const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// 4. Инициализация Socket.IO
const io = new Server(server, {
  connectionStateRecovery: { maxDisconnectionDuration: 30000 },
  cors: {
    origin: ["https://coobe.ru", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket"]
});

// 5. Инициализация менеджера сессий
const sessionManager = new SessionManager();

// 6. Healthcheck
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

// 7. Запуск сервера
const startServer = async () => {
  try {
    await redisClient.ping();
    server.listen(3000, '0.0.0.0', () => {
      console.log('🚀 Сервер запущен на порту 3000');
      console.log('🔗 Redis:', redisClient.status);
    });
  } catch (err) {
    console.error('⛔ Ошибка запуска:', err);
    process.exit(1);
  }
};

// 8. Обработчики Redis
redisClient.on('ready', () => {
  console.log('✅ Подключение к Redis установлено');
  redisStatus.labels('main').set(1);
});

redisClient.on('error', (err) => {
  console.error('⛔ Ошибка Redis:', err.message);
  redisStatus.labels('main').set(0);
});

// 9. Логика WebSocket
io.on('connection', (socket) => {
  console.log(`🎮 Новое подключение: ${socket.id}`);
  websocketConnections.inc();

  socket.on('startPve', async (deck, callback) => {
	try {
	  console.log('[SERVER] Received deck:', deck);
	  console.log('[SERVER] Available ability IDs:', Object.keys(abilities).map(Number));
  
	  // Проверка загрузки способностей
	  if (!abilities || Object.keys(abilities).length === 0) {
		throw new Error('Hero abilities not loaded');
	  }
  
	  const numericDeck = deck.map(id => Number(id));
	  console.log('[SERVER] Numeric deck:', numericDeck);
  
	  // Проверка существования способностей
	  const invalidIds = numericDeck.filter(id => !abilities.hasOwnProperty(id));
	  if (invalidIds.length > 0) {
		throw new Error(`Invalid ability IDs: ${invalidIds.join(', ')}`);
	  }
  
	  // Формирование данных героев с проверкой
	  const heroesData = numericDeck.map(id => {
		const ability = abilities[id];
		if (!ability) {
		  throw new Error(`Ability data for ID ${id} is undefined`);
		}
		return { id, ...ability };
	  });
  
	  console.log('[SERVER] Heroes data:', heroesData);
  
	  // Создание игры
	  const game = new PveGame(heroesData);
	  const { sessionId } = sessionManager.createGameSession(heroesData);
  
	  callback({
		status: 'success',
		sessionId,
		gameState: game.getPublicState()
	  });
  
	} catch (err) {
	  console.error('[SERVER ERROR]', err.stack); // Логируем полный стек
	  callback({
		status: 'error',
		code: "GAME_INIT_FAILURE",
		message: err.message,
		invalidIds: []
	  });
	}
  });

  socket.on('disconnect', () => {
    console.log(`⚠️  Отключение: ${socket.id}`);
    websocketConnections.dec();
  });

  socket.on('error', (err) => {
    console.error(`⛔ Ошибка сокета (${socket.id}):`, err.message);
  });
});

// 10. Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Завершение работы...');
  try {
    await redisClient.quit();
    server.close();
    console.log('✅ Сервер остановлен');
    process.exit(0);
  } catch (err) {
    console.error('⛔ Ошибка завершения:', err);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();