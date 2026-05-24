FROM node:20-alpine

WORKDIR /app

# Copia package*.json primero para aprovechar la caché de capas
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copia el código
COPY src/ src/

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "src/index.js"]
