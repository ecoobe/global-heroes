const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const promBundle = require("express-prom-bundle");
const { v4: uuidv4 } = require('uuid');
const { PveGame } = require('../game/modes/pve-engine');
const SessionManager = require('../game/session-manager');
const { Gauge } = require('prom-client');
const { abilities } = require('../game/abilities');

// 0. Глобальная обработка ошибок
process.on('uncaughtException', (err) => {
  console.error('‼️ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('‼️ Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const server = createServer(app);

// 1. Конфигурация метрик
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  customLabels: { project: 'global-heroes' },
  promClient: { collectDefaultMetrics: { timeout: 5000 } }
});
app.use(metricsMiddleware);

// 2. Инициализация сервисов
const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  retryStrategy: times => Math.min(times * 100, 5000),
  maxRetriesPerRequest: null
});

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
  transports: ["websocket"],
  allowEIO3: true
});

const sessionManager = new SessionManager();

// 3. Метрики
const redisStatusGauge = new Gauge({
  name: 'redis_status',
  help: 'Redis connection status',
  labelNames: ['service']
});

const sessionGauge = new Gauge({
  name: 'active_sessions',
  help: 'Current active game sessions'
});

// 4. Healthcheck endpoint
app.get("/health", async (req, res) => {
  try {
    await redisClient.ping();
    res.json({
      status: "OK",
      services: {
        redis: "active",
        sessions: sessionManager.sessions.size,
        abilities: Object.keys(abilities).length
      }
    });
  } catch (err) {
    res.status(503).json({ 
      status: "unavailable",
      error: err.message
    });
  }
});

// 5. WebSocket обработчики
io.on('connection', (socket) => {
  console.log(`🎮 New connection: ${socket.id}`);

  socket.on('startPve', async (deckInput, callback) => {
    try {
      // Валидация ввода
      if (!deckInput) throw new Error('Missing deck data');
      
      const validation = validateDeck(deckInput);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Создание игры
      const game = new PveGame(validation.deck, abilities);
      const sessionId = uuidv4();
      
      // Сохранение сессии
      sessionManager.sessions.set(sessionId, game.id);
      sessionManager.games.set(game.id, {
        game,
        socketId: socket.id,
        lastActivity: Date.now()
      });

      // Обновление метрик
      sessionGauge.set(sessionManager.sessions.size);

      // Ответ клиенту
      callback({
        status: 'success',
        sessionId,
        gameState: game.getPublicState()
      });

      console.log(`🚀 Game ${game.id} started for ${socket.id}`);

    } catch (error) {
      console.error(`💥 Game init failed (${socket.id}):`, error.stack);
      callback({
        status: 'error',
        code: "INIT_FAILURE",
        message: error.message.replace(/[\n\r]/g, ' ')
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`⚠️  Disconnected: ${socket.id} (${reason})`);
    sessionManager.destroySession(socket.id);
    sessionGauge.set(sessionManager.sessions.size);
  });
});

// 6. Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}, shutting down...`);
  try {
    await Promise.all([
      redisClient.quit(),
      new Promise(resolve => server.close(resolve)),
      sessionManager.cleanupInactiveSessions(0)
    ]);
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('⛔ Force shutdown:', err);
    process.exit(1);
  }
};

['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  process.on(signal, () => shutdown(signal));
});

// 7. Валидация колоды
function validateDeck(input) {
	try {
	  // Добавляем проверку типа входных данных
	  if (typeof input !== 'string') {
		throw new Error('Input must be a string');
	  }
  
	  // Логируем сырые данные для отладки
	  console.log('[DEBUG] Raw deck input:', input);
  
	  // Убираем возможные пробелы и лишние символы
	  const sanitizedInput = input.trim().replace(/^"(.*)"$/, '$1');
	  
	  // Пытаемся распарсить
	  const parsed = JSON.parse(sanitizedInput);
	  
	  // Проверяем структуру
	  if (!Array.isArray(parsed)) {
		throw new Error('Deck must be an array');
	  }
  
	  // Проверяем длину
	  if (parsed.length !== 5) {
		throw new Error('Deck must contain exactly 5 cards');
	  }
  
	  // Нормализуем ID
	  const validated = parsed.map(item => {
		const id = Number(item?.id ?? item);
		if (isNaN(id)) throw new Error(`Invalid card ID: ${item}`);
		if (!abilities[id]) throw new Error(`Unknown ability ID: ${id}`);
		return id;
	  });
  
	  return { valid: true, deck: validated };
	} catch (error) {
	  console.error('[VALIDATION ERROR] Input:', input);
	  return { 
		valid: false, 
		error: `Deck validation failed: ${error.message}`
	  };
	}
}

// 8. Запуск сервера
server.listen(3000, '0.0.0.0', () => {
  console.log('🚀 Server started on port 3000');
  console.log('🔗 Redis status:', redisClient.status);
  console.log('📊 Abilities loaded:', Object.keys(abilities).length);
});