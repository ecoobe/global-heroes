FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src/ ./src/
COPY game/ ./game/
COPY heroes/ ./heroes/

EXPOSE 3000

CMD ["node", "src/server.js"]