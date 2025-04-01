const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const redis = require('redis');
const { PveGame } = require('../game/pve-engine');

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://coobe.ru",
        methods: ["GET", "POST"]
    }
});

const redisClient = redis.createClient({ url: 'redis://redis:6379' });
redisClient.connect();

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    socket.on('startPve', async (deck) => {
        const game = new PveGame(deck);
        await game.saveToRedis(redisClient);
        socket.emit('gameState', game.getPublicState());
    });
});

server.listen(3000, () => {
    console.log('Game server running on port 3000');
});