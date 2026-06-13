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

  // Torres de la Cordillera — plataformero de ascenso (mundo Koril). El cliente
  // envía como `points` la altura alcanzada en metros. Diseño: +8 F por metro,
  // que el motor clampea a [0..100] monedas. Igual que en `deo`, ese tope es la
  // red de integridad (§6): la altura la calcula el cliente, así que el clamp
  // acota cualquier puntaje inflado sin partida server-authoritative.
  torres: {
    label: 'Torres de la Cordillera',
    pointsToCoins(points) {
      const height = Math.max(0, Math.floor(Number(points) || 0));
      return height * 8; // 12.5 m ⇒ 100 monedas (tope del motor)
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

// Mejor puntaje crudo (en la unidad del juego, p. ej. metros) que el usuario
// alcanzó en ESE place, leído del mapa `gameBestScores`. 0 si nunca jugó.
function bestScore(user, placeId) {
  const map = (user && user.gameBestScores) || {};
  return Math.max(0, Math.floor(Number(map[placeId] ?? map[String(placeId)]) || 0));
}

/**
 * Tabla de récords (leaderboard) de un juego: el mejor puntaje de CADA usuario en
 * ese place, ordenado de mayor a menor. No hay tabla aparte: se agrega leyendo el
 * mapa `gameBestScores` de todos los usuarios (suficiente a esta escala; si crece,
 * conviene una content-type `game-score` indexada).
 *
 * Devuelve `{ total, top, me }`:
 *  - `top` — top-N entradas `{ rank, userId, username, score, me }`.
 *  - `me`  — standing del usuario actual `{ rank, score }` si quedó FUERA del top
 *            (null si está en el top, no jugó, o no hay sesión).
 */
async function leaderboard(strapi, placeId, currentUserId = null, limit = 5) {
  const lim = Math.max(1, Math.min(50, Math.floor(Number(limit) || 5)));
  const users = await strapi.db.query(USER_UID).findMany({
    select: ['id', 'username', 'gameBestScores'],
    where: { gameBestScores: { $notNull: true } },
  });

  const ranked = users
    .map((u) => ({ userId: u.id, username: u.username, score: bestScore(u, placeId) }))
    .filter((e) => e.score > 0)
    // Mayor puntaje primero; empate ⇒ el de menor id (más antiguo) va arriba.
    .sort((a, b) => b.score - a.score || a.userId - b.userId)
    .map((e, i) => ({ rank: i + 1, ...e, me: currentUserId != null && e.userId === currentUserId }));

  const top = ranked.slice(0, lim);
  let me = null;
  if (currentUserId != null && !top.some((e) => e.me)) {
    const mine = ranked.find((e) => e.userId === currentUserId);
    if (mine) me = { rank: mine.rank, score: mine.score };
  }
  return { total: ranked.length, top, me };
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
    fields: ['balance', 'gameCooldowns', 'gameBestScores'],
  });
  const status = claimStatus(user, placeId);
  if (!status.canClaim) return { error: 'cooldown', ...status };

  const key = gameKeyForPlace(place);
  const reward = clampReward(GAMES[key].pointsToCoins(points, { place, user }));
  const nowIso = new Date().toISOString();
  const balance = (user.balance ?? 0) + reward;
  // Sella el contador de ESTE juego, sin tocar el de los demás.
  const cooldowns = { ...(user.gameCooldowns || {}), [placeId]: nowIso };
  // Guarda el mejor puntaje crudo del usuario en ESTE juego (máximo histórico).
  const rawPoints = Math.max(0, Math.floor(Number(points) || 0));
  const newBest = Math.max(bestScore(user, placeId), rawPoints);
  const bestScores = { ...(user.gameBestScores || {}), [placeId]: newBest };

  await strapi.entityService.update(USER_UID, userId, {
    data: { balance, gameCooldowns: cooldowns, gameBestScores: bestScores },
  });

  return {
    reward,
    balance,
    gameKey: key,
    bestScore: newBest,
    ...claimStatus({ gameCooldowns: cooldowns }, placeId),
  };
}

module.exports = {
  GAMES,
  COOLDOWN_HOURS,
  MIN_REWARD,
  MAX_REWARD,
  clampReward,
  gameKeyForPlace,
  claimStatus,
  bestScore,
  leaderboard,
  claim,
};
