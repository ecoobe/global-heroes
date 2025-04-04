const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const { PveGame } = require('../game/modes/pve-engine');
const promBundle = require("express-prom-bundle");
const SessionManager = require('../game/session-manager');
const { Gauge } = require('prom-client');

// 1. Инициализация способностей (защищенная версия)
const abilities = Object.freeze(
  Object.entries({
    1: { id: 1, name: "Месть клинка", cost: 2, effectType: "DEATH", target: "RANDOM_ENEMY", value: 4 },
    2: { id: 2, name: "Невидимость", cost: 1, effectType: "PASSIVE", trigger: "FIRST_ATTACK" },
    3: { id: 3, name: "Тактик", cost: 3, effectType: "BUFF", target: "ALL_ALLIES", stat: "strength", value: 1 },
    4: { id: 4, name: "Стрела Луны", cost: 2, effectType: "ATTACK", target: "WEAKEST_ENEMY", pierce: true },
    5: { id: 5, name: "Щит предков", cost: 2, effectType: "DEFENSE", modifier: -2 }
  }).reduce((acc, [key, value]) => {
    const validated = {
      id: Number(key),
      name: String(value.name),
      cost: Math.max(1, Number(value.cost)),
      effectType: String(value.effectType),
      ...value
    };
    acc[String(key)] = Object.freeze(validated);
    return acc;
  }, {})
);

const app = express();
const server = createServer(app);

// 2. Конфигурация метрик
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  customLabels: { project: 'global-heroes' },
  promClient: { collectDefaultMetrics: { timeout: 5000 } }
});
app.use(metricsMiddleware);

// 3. Кастомные метрики
const redisStatusGauge = new Gauge({
  name: 'redis_status',
  help: 'Redis connection status',
  labelNames: ['service']
});

const wsConnectionsGauge = new Gauge({
  name: 'websocket_connections',
  help: 'Active WebSocket connections'
});

// 4. Подключение Redis с повторными попытками
const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  retryStrategy: times => Math.min(times * 100, 5000),
  maxRetriesPerRequest: null
});

// 5. Инициализация Socket.IO с улучшенной обработкой ошибок
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

// 6. Менеджер сессий с автоматической очисткой
const sessionManager = new SessionManager({
  sessionTTL: 3600000, // 1 час
  gcInterval: 300000   // Каждые 5 минут
});

// 7. Healthcheck endpoint
app.get("/health", async (req, res) => {
  try {
    await redisClient.ping();
    res.json({
      status: "OK",
      services: {
        redis: "active",
        websocket: io.engine.clientsCount > 0 ? "active" : "idle",
        abilities: Object.keys(abilities).length === 5 ? "valid" : "invalid"
      }
    });
  } catch (err) {
    res.status(503).json({ 
      status: "unavailable",
      error: err.message
    });
  }
});

// 8. Обработчики событий Redis
redisClient.on('ready', () => {
  console.log('✅ Redis connected');
  redisStatusGauge.set(1);
});

redisClient.on('error', (err) => {
  console.error(`⛔ Redis error: ${err.message}`);
  redisStatusGauge.set(0);
});

// 9. WebSocket обработчики
io.on('connection', (socket) => {
	wsConnectionsGauge.inc();
	console.log(`🎮 New connection: ${socket.id}`);
  
	socket.on('startPve', async (deckInput, callback) => {
		console.log('Received deck from client:', JSON.stringify(deckInput)); // Логируем колоду, как строку для наглядности
		const startTime = Date.now();
	  
		try {
		  // Валидация ввода
		  const { valid, deck, error } = validateDeck(deckInput);
		  console.log('Deck after validation:', deck); // Логируем колоду после валидации
	  
		  if (!valid) throw new Error(error);
	  
		  // Создание игры
		  const game = new PveGame(deck, abilities);
		  const session = sessionManager.createSession(socket.id, deck);
	  
		  // Успешный ответ
		  callback({
			status: 'success',
			sessionId: session.id,
			gameState: game.getPublicState()
		  });
	  
		  console.log(`🚀 Game started in ${Date.now() - startTime}ms`, {
			socketId: socket.id,
			deck: deck
		  });
	  
		} catch (error) {
		  console.error(`💥 Game init failed`, {
			socketId: socket.id,
			error: error.message,
			stack: error.stack
		  });
	  
		  callback({
			status: 'error',
			code: "INIT_FAILURE",
			message: error.message,
			retryable: isRetryableError(error)
		  });
		}
	});
  
	socket.on('disconnect', () => {
	  wsConnectionsGauge.dec();
	  console.log(`⚠️  Disconnected: ${socket.id}`);
	  sessionManager.destroySession(socket.id);
	});
});

// 10. Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Shutting down...');
  try {
    await Promise.all([
      redisClient.quit(),
      new Promise(resolve => server.close(resolve)),
      sessionManager.destroyAll()
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

// 11. Валидация колоды
function validateDeck(input) {
	try {
	  let parsed = input;
	  
	  // Парсинг JSON строки, если это строка
	  if (typeof input === 'string') {
		try {
		  parsed = JSON.parse(input);
		} catch (e) {
		  return { valid: false, error: "Invalid JSON format" };
		}
	  }
  
	  // Проверка типа
	  if (!Array.isArray(parsed)) {
		return { valid: false, error: "Deck must be an array" };
	  }
  
	  // Преобразование ID в объекты с дополнительной информацией
	  const deck = parsed.map(item => {
		const id = Number(item?.id ?? item);
		if (isNaN(id)) throw new Error(`Invalid ID: ${item}`);
		if (!abilities[String(id)]) throw new Error(`Ability ${id} not found`);
		return { id, ability: abilities[String(id)] }; // Преобразуем в объект
	  });
  
	  // Проверка размера
	  if (deck.length !== 5) {
		throw new Error("Deck must contain exactly 5 cards");
	  }
  
	  return { valid: true, deck };
	} catch (error) {
	  return { valid: false, error: error.message };
	}
}

// 12. Проверка возможности повтора
function isRetryableError(error) {
  const retryableMessages = [
    'timeout', 
    'connection',
    'busy',
    'temporarily'
  ];
  return retryableMessages.some(msg => error.message.includes(msg));
}

// 13. Запуск сервера
const startServer = async () => {
  try {
    await redisClient.ping();
    server.listen(3000, '0.0.0.0', () => {
      console.log('🚀 Server started on port 3000');
      console.log('🔗 Redis status:', redisClient.status);
    });
  } catch (err) {
    console.error('⛔ Server startup failed:', err);
    process.exit(1);
  }
};

// Явный вызов функции запуска
startServer(); // <-- Критически важная строка!