# Strapi 4 — Dockerfile multi-stage.
#   stage "dev"  -> hot-reload para docker-compose (target: dev)
#   stage "prod" -> build de producción; es el ÚLTIMO stage, así que es el
#                   que Railway construye por defecto.

# ---- base: toolchain para compilar dependencias nativas (better-sqlite3, sharp) ----
FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- dev: servidor de desarrollo con autoReload (bind mount en compose) ----
FROM base AS dev
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
ENV NODE_ENV=development
EXPOSE 1337
CMD ["yarn", "develop"]

# ---- prod: build del admin + serve (lo que usa Railway) ----
FROM base AS prod
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
ENV NODE_ENV=production
RUN yarn build
EXPOSE 1337
# strapi start respeta la variable PORT que inyecta Railway
CMD ["yarn", "start"]
