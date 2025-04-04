FROM node:18-alpine
WORKDIR /app

# Установка только необходимых зависимостей
RUN apk add --no-cache curl

# Копируем зависимости и устанавливаем их
COPY package*.json ./
RUN npm ci --production

# Точечное копирование нужных директорий
COPY server/heroes ./heroes
COPY server/src ./src
COPY server/game ./game

EXPOSE 3000
CMD ["node", "src/server.js"]  # Правильный путь к server.js