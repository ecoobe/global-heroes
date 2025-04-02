FROM node:18-alpine

WORKDIR /app

# Устанавливаем curl для healthcheck и python3 для сборки native модулей
RUN apk add --no-cache curl python3 make g++
RUN npm install redis@4.6.13

COPY package*.json ./

# Устанавливаем зависимости через npm install с production флагом
RUN npm install --production --no-package-lock --no-audit --fund=false

COPY . .

EXPOSE 3000
CMD ["node", "src/server.js"]