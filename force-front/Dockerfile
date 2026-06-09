# Next.js 15 — imagen de desarrollo (hot-reload vía bind mount en docker-compose)
FROM node:20-bookworm-slim

WORKDIR /app

# Instalar dependencias primero para aprovechar la cache de capas
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=development
EXPOSE 3000

# -H 0.0.0.0 para que el dev server sea accesible desde fuera del contenedor
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
