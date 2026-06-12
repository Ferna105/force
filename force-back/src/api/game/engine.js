'use strict';

/**
 * Motor de juegos — contrato de recompensas.
 *
 * Cada place de tipo `game` es un mini-juego distinto, ejecutable en la web, con
 * su propio sistema de puntos. El motor NO conoce las mecánicas: solo expone el
 * contrato para **reclamar recompensas**. Cada juego registra su propia
 * conversión puntos → monedas (`pointsToCoins`), que vive SIEMPRE en el servidor
 * (no se confía el resultado al cliente), y el motor la clampea a [0..100].
 *
 * El reclamo tiene un **enfriamiento por juego**: en cada place de tipo `game`
 * se puede reclamar una vez cada `COOLDOWN_HOURS` horas (cada juego lleva su
 * propio contador). El estado vive en el usuario como un mapa
 * `gameCooldowns = { [placeId]: ISO del último reclamo }`.
 *
 * Para sumar un juego nuevo: agregar una entrada a `GAMES` (con su conversión) y
 * setear el `GameKey` del place a esa clave desde el admin de Strapi. Sin cambios
 * de schema.
 */

const USER_UID = 'plugin::users-permissions.user';
const PLACE_UID = 'api::place.place';

const COOLDOWN_HOURS = 6;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;
const MIN_REWARD = 0;
const MAX_REWARD = 100;

// Toda recompensa cae en [0..100] monedas, redondeada.
const clampReward = (n) => Math.max(MIN_REWARD, Math.min(MAX_REWARD, Math.round(Number(n) || 0)));

/**
 * Registro de juegos. La clave es el `GameKey` del place.
 * `pointsToCoins(points, ctx)` convierte el puntaje interno del juego a monedas
 * (el motor la clampea igual, así que no hace falta clampear acá).
 */
const GAMES = {
  // Plantilla por defecto: aún no hay mecánica real. Otorga una recompensa
  // aleatoria 1..100 al reclamar (placeholder hasta definir cada juego).
  template: {
    label: 'Demo',
    pointsToCoins() {
      return 1 + Math.floor(Math.random() * MAX_REWARD);
    },
  },

  // Los Ojos de Deo — plataformero de descenso (mundo Deo). El cliente envía
  // como `points` la profundidad alcanzada en metros. Diseño: +10 F por metro,
  // que el motor clampea a [0..100] monedas. Ese tope es además la red de
  // integridad (§6): la profundidad se calcula en el cliente, así que el clamp
  // acota cualquier puntaje inflado sin necesidad de partida server-authoritative.
  deo: {
    label: 'Los Ojos de Deo',
    pointsToCoins(points) {
      const depth = Math.max(0, Math.floor(Number(points) || 0));
      return depth * 10; // 10 m ⇒ 100 monedas (tope del motor)
    },
  },
};

// Resuelve qué juego corre un place; si su GameKey no está registrado, usa la plantilla.
function gameKeyForPlace(place) {
  const key = place && place.GameKey;
  return key && GAMES[key] ? key : 'template';
}

// Estado del cooldown de UN juego (place) a partir del mapa del usuario.
function claimStatus(user, placeId, now = Date.now()) {
  const map = (user && user.gameCooldowns) || {};
  const lastIso = map[placeId] ?? map[String(placeId)];
  const last = lastIso ? new Date(lastIso).getTime() : 0;
  const nextMs = last + COOLDOWN_MS;
  const secondsLeft = Math.max(0, Math.ceil((nextMs - now) / 1000));
  return {
    canClaim: secondsLeft === 0,
    secondsLeft,
    nextClaimAt: last ? new Date(nextMs).toISOString() : null,
  };
}

/**
 * Reclama la recompensa del juego de `placeId` para el usuario.
 * Devuelve `{ error }` con un código si no se puede (`not_found`/`not_a_game`/
 * `cooldown`), o `{ reward, balance, gameKey, ...status }` si se acreditó.
 */
async function claim(strapi, userId, placeId, points) {
  const place = await strapi.entityService.findOne(PLACE_UID, placeId, {
    fields: ['Type', 'GameKey'],
  });
  if (!place) return { error: 'not_found' };
  if (place.Type !== 'game') return { error: 'not_a_game' };

  const user = await strapi.entityService.findOne(USER_UID, userId, {
    fields: ['balance', 'gameCooldowns'],
  });
  const status = claimStatus(user, placeId);
  if (!status.canClaim) return { error: 'cooldown', ...status };

  const key = gameKeyForPlace(place);
  const reward = clampReward(GAMES[key].pointsToCoins(points, { place, user }));
  const nowIso = new Date().toISOString();
  const balance = (user.balance ?? 0) + reward;
  // Sella el contador de ESTE juego, sin tocar el de los demás.
  const cooldowns = { ...(user.gameCooldowns || {}), [placeId]: nowIso };

  await strapi.entityService.update(USER_UID, userId, {
    data: { balance, gameCooldowns: cooldowns },
  });

  return { reward, balance, gameKey: key, ...claimStatus({ gameCooldowns: cooldowns }, placeId) };
}

module.exports = {
  GAMES,
  COOLDOWN_HOURS,
  MIN_REWARD,
  MAX_REWARD,
  clampReward,
  gameKeyForPlace,
  claimStatus,
  claim,
};
