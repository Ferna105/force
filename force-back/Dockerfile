# Strapi 4 — imagen de desarrollo (hot-reload vía bind mount en docker-compose)
FROM node:20-bookworm-slim

# Toolchain para compilar dependencias nativas (better-sqlite3, sharp, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias primero para aprovechar la cache de capas
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

ENV NODE_ENV=development
EXPOSE 1337

CMD ["yarn", "develop"]
