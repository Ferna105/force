'use strict';

/**
 * game controller
 *
 * Contrato de reclamo de recompensas para los places de tipo `game`.
 * La lógica (conversión por juego + cooldown global) vive en ../engine.js.
 */

const engine = require('../engine');

const PLACE_UID = 'api::place.place';
const USER_UID = 'plugin::users-permissions.user';

module.exports = {
  // Estado del juego para el usuario autenticado: qué juego corre + cooldown global.
  async status(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Iniciá sesión.');

    const placeId = Number(ctx.params.placeId);
    if (!placeId) return ctx.badRequest('Falta placeId.');

    const place = await strapi.entityService.findOne(PLACE_UID, placeId, {
      fields: ['Type', 'GameKey', 'Difficulty'],
    });
    if (!place) return ctx.notFound('Lugar no encontrado.');
    if (place.Type !== 'game') return ctx.badRequest('El lugar no es un juego.');

    // Releer el usuario para tener los contadores frescos (ctx.state.user puede estar cacheado).
    const fresh = await strapi.entityService.findOne(USER_UID, user.id, {
      fields: ['gameCooldowns', 'gameBestScores'],
    });

    return ctx.send({
      gameKey: engine.gameKeyForPlace(place),
      cooldownHours: engine.COOLDOWN_HOURS,
      difficulty: place.Difficulty ?? null,
      bestScore: engine.bestScore(fresh, placeId),
      maxReward: engine.MAX_REWARD,
      ...engine.claimStatus(fresh, placeId),
    });
  },

  // Reclama la recompensa del juego (acredita monedas y arranca el cooldown).
  async claim(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Iniciá sesión para reclamar.');

    const placeId = Number(ctx.params.placeId);
    if (!placeId) return ctx.badRequest('Falta placeId.');

    const body = ctx.request.body ?? {};
    const points = body.points ?? body.data?.points ?? 0;

    const res = await engine.claim(strapi, user.id, placeId, points);
    if (res.error === 'not_found') return ctx.notFound('Lugar no encontrado.');
    if (res.error === 'not_a_game') return ctx.badRequest('El lugar no es un juego.');
    if (res.error === 'cooldown') {
      return ctx.badRequest('Todavía no podés reclamar: el juego está en enfriamiento.', {
        secondsLeft: res.secondsLeft,
        nextClaimAt: res.nextClaimAt,
      });
    }

    return ctx.send(res);
  },

  // Tabla de récords del juego (mejor puntaje de cada usuario en ese place).
  // Pública: se puede ver sin sesión; si hay token, marca al usuario actual.
  async leaderboard(ctx) {
    const placeId = Number(ctx.params.placeId);
    if (!placeId) return ctx.badRequest('Falta placeId.');

    const place = await strapi.entityService.findOne(PLACE_UID, placeId, {
      fields: ['Type', 'GameKey'],
    });
    if (!place) return ctx.notFound('Lugar no encontrado.');
    if (place.Type !== 'game') return ctx.badRequest('El lugar no es un juego.');

    const userId = ctx.state.user?.id ?? null;
    const board = await engine.leaderboard(strapi, placeId, userId, ctx.query.limit);

    return ctx.send({ gameKey: engine.gameKeyForPlace(place), ...board });
  },
};
