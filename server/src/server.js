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
        origin: "https://coobe.ru",
        methods: ["GET", "POST"]
    }
});

const metricsMiddleware = promBundle({
	includeMethod: true,
	includePath: true
  });


app.use(metricsMiddleware);

  // Эндпоинт для проверки работы
app.get("/health", (req, res) => {
	res.status(200).send("OK");
});

const redisClient = redis.createClient({ url: 'redis://redis:6379' });
redisClient.connect();

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    socket.on('startPve', async (deck) => {
		const game = new PveGame(deck);
		await game.saveToRedis(redisClient);
		const sessionId = sessionManager.createSession(deck);
		socket.join(sessionId);
		socket.emit('gameState', game.getPublicState());
	});
});

server.listen(3000, () => {
    console.log('Game server running on port 3000');
});