# Next.js 15 — Dockerfile multi-stage.
#   stage "dev"  -> hot-reload para docker-compose (target: dev)
#   stage "prod" -> build de producción; es el ÚLTIMO stage, así que es el
#                   que Railway construye por defecto.

# ---- dev: servidor de desarrollo con hot-reload (bind mount en compose) ----
FROM node:20-bookworm-slim AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=development
EXPOSE 3000
# -H 0.0.0.0 para que el dev server sea accesible desde fuera del contenedor
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]

# ---- prod: build + serve (lo que usa Railway) ----
FROM node:20-bookworm-slim AS prod
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* se hornea en el build; Railway pasa las variables del servicio
# como build args automáticamente (hay que declararlas como ARG para recibirlas).
ARG NEXT_PUBLIC_STRAPI_URL
ENV NEXT_PUBLIC_STRAPI_URL=$NEXT_PUBLIC_STRAPI_URL
ENV NODE_ENV=production
RUN npm run build
EXPOSE 3000
# next start escucha en 0.0.0.0 y respeta la variable PORT que inyecta Railway
CMD ["npm", "run", "start"]
