const path = require('path');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const { PveGame } = require('../game/modes/pve-engine');
const promBundle = require("express-prom-bundle");
const SessionManager = require('../game/session-manager');
const { Gauge } = require('prom-client');

// 1. Инициализация способностей с нормализацией ключей
const abilities = Object.entries({
  1: {
    id: 1,
    name: "Месть клинка",
    description: "При смерти наносит 4 урона случайному врагу",
    cost: 2,
    charges: 1,
    effectType: "DEATH",
    target: "RANDOM_ENEMY",
    value: 4
  },
  2: {
    id: 2,
    name: "Невидимость",
    description: "Избегает первой атаки в бою",
    cost: 1,
    charges: 2,
    effectType: "PASSIVE",
    trigger: "FIRST_ATTACK"
  },
  3: {
    id: 3,
    name: "Тактик",
    description: "Увеличивает силу всех союзников на 1",
    cost: 3,
    charges: 1,
    effectType: "BUFF",
    target: "ALL_ALLIES",
    stat: "strength",
    value: 1
  },
  4: {
    id: 4,
    name: "Стрела Луны",
    description: "Атакует самого слабого врага, игнорируя защиту",
    cost: 2,
    charges: 3,
    effectType: "ATTACK",
    target: "WEAKEST_ENEMY",
    pierce: true
  },
  5: {
    id: 5,
    name: "Щит предков",
    description: "Получает на 2 меньше урона от атак",
    cost: 2,
    charges: 2,
    effectType: "DEFENSE",
    modifier: -2
  }
}).reduce((acc, [key, value]) => {
  acc[String(key)] = value; // Принудительно строковые ключи
  return acc;
}, {});

const app = express();
const server = createServer(app);

// 2. Настройка метрик
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  customLabels: { project: 'global-heroes' },
  promClient: { collectDefaultMetrics: { timeout: 10000 } }
});

// 3. Кастомные метрики
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

// 4. Подключение Redis
const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// 5. Инициализация Socket.IO
const io = new Server(server, {
  connectionStateRecovery: { maxDisconnectionDuration: 30000 },
  cors: {
    origin: ["https://coobe.ru", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket"]
});

// 6. Менеджер сессий
const sessionManager = new SessionManager();

// 7. Healthcheck
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

// 8. Обработчики Redis
redisClient.on('ready', () => {
  console.log('✅ Подключение к Redis установлено');
  redisStatus.labels('main').set(1);
});

redisClient.on('error', (err) => {
  console.error('⛔ Ошибка Redis:', err.message);
  redisStatus.labels('main').set(0);
});

// 9. WebSocket логика
io.on('connection', (socket) => {
  console.log(`🎮 Новое подключение: ${socket.id}`);
  websocketConnections.inc();

  socket.on('startPve', async (deckInput, callback) => {
    try {
      console.log('[SERVER] Получены данные:', { input: deckInput });

      // 10. Нормализация колоды
      let numericDeck;
      if (typeof deckInput === 'string') {
        try {
          numericDeck = JSON.parse(deckInput).map(id => {
            const numId = Number(id);
            if (isNaN(numId)) throw new Error(`Неверный ID: ${id}`);
            return numId;
          });
        } catch (e) {
          throw new Error(`Ошибка парсинга JSON: ${e.message}`);
        }
      } else if (Array.isArray(deckInput)) {
        numericDeck = deckInput.map(id => {
          const numId = Number(id);
          if (isNaN(numId)) throw new Error(`Неверный ID: ${id}`);
          return numId;
        });
      } else {
        throw new Error('Неверный формат колоды');
      }

      console.log('[SERVER] Нормализованная колода:', numericDeck);

      // 11. Проверка способностей
      const invalidIds = numericDeck.filter(id => !abilities.hasOwnProperty(String(id)));
      if (invalidIds.length > 0) {
        throw new Error(`Несуществующие ID способностей: ${invalidIds.join(', ')}`);
      }

      // 12. Создание игры
      console.log('[SERVER] Создание игры...');
      const game = new PveGame(numericDeck, abilities);
      
      // 13. Создание сессии
      const { sessionId } = sessionManager.createGameSession(numericDeck);
      
      callback({
        status: 'success',
        sessionId,
        gameState: game.getPublicState()
      });

      console.log('[SERVER] Игра успешно создана:', sessionId);

    } catch (error) {
      console.error('[SERVER ERROR]', {
        error: error.message,
        stack: error.stack,
        input: deckInput
      });
      
      callback({
        status: 'error',
        code: "GAME_INIT_FAILURE",
        message: error.message,
        invalidIds: []
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`⚠️ Отключение: ${socket.id}`);
    websocketConnections.dec();
  });

  socket.on('error', (err) => {
    console.error(`⛔ Ошибка сокета (${socket.id}):`, err.message);
  });
});

// 14. Graceful shutdown
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

// 15. Запуск сервера
const startServer = async () => {
  try {
    await redisClient.ping();
    server.listen(3000, '0.0.0.0', () => {
      console.log('🚀 Сервер запущен на порту 3000');
      console.log('🔗 Redis статус:', redisClient.status);
    });
  } catch (err) {
    console.error('⛔ Ошибка запуска:', err);
    process.exit(1);
  }
};

startServer();