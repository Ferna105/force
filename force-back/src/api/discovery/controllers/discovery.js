'use strict';

/**
 * discovery controller
 *
 * - `event`: registra un evento de actividad del usuario (visitar un lugar,
 *   jugar) y reevalúa las estrategias de descubrimiento.
 * - `sync`: reevalúa sin registrar evento (útil al cargar la app, para resolver
 *   tareas basadas en estado como tener cierto objeto en el inventario).
 *
 * `event`/`sync` devuelven { newlyDiscovered, newWorlds, newRegions, newPlaces }
 * en shape REST (con su media) para los modales del front. El gating de
 * visibilidad (qué mundos/regiones/lugares ve cada usuario) NO vive acá: se
 * aplica a nivel de controller en world/region/place (ver discovery/gating.js).
 */

const { evaluateUser } = require('../engine');

const PLACE_UID = 'api::place.place';
const EVENT_UID = 'api::user-event.user-event';

const EVENT_TYPES = ['visit_place', 'play_place', 'buy_item'];

module.exports = {
  async event(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');

    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    const { type } = body;
    const placeId = body.placeId ?? null;
    const itemId = body.itemId ?? null;

    if (!EVENT_TYPES.includes(type)) {
      return ctx.badRequest(`Tipo de evento inválido. Esperado uno de: ${EVENT_TYPES.join(', ')}.`);
    }

    // Derivar el mundo a partir del lugar (si se envió uno)
    let worldId = null;
    if (placeId) {
      const place = await strapi.entityService.findOne(PLACE_UID, placeId, {
        populate: { World: { fields: ['id'] } },
      });
      if (!place) return ctx.notFound('Lugar no encontrado.');
      worldId = place.World?.id ?? null;
    }

    await strapi.entityService.create(EVENT_UID, {
      data: {
        type,
        user: user.id,
        place: placeId || null,
        world: worldId,
        item: itemId || null,
      },
    });

    const result = await evaluateUser(strapi, user.id);
    return ctx.send(result);
  },

  async sync(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');
    const result = await evaluateUser(strapi, user.id);
    return ctx.send(result);
  },
};
