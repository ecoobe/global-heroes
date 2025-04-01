FROM node:18-alpine

WORKDIR /app

# Устанавливаем curl для healthcheck
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000
CMD ["node", "src/server.js"]