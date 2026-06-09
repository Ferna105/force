'use strict';

/**
 * shop controller
 *
 * Compra de un objeto: valida saldo del usuario autenticado, descuenta el
 * valor del objeto y suma 1 a la entrada de inventario correspondiente
 * (creándola si no existía).
 */

const { evaluateUser } = require('../../discovery/engine');

const USER_UID = 'plugin::users-permissions.user';
const ITEM_UID = 'api::item.item';
const ENTRY_UID = 'api::inventory-entry.inventory-entry';
const PLACE_UID = 'api::place.place';
const EVENT_UID = 'api::user-event.user-event';

module.exports = {
  async buy(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Debés iniciar sesión para comprar.');
    }

    const body = ctx.request.body ?? {};
    const itemId = body.itemId ?? body.data?.itemId;
    // Lugar (tienda) donde se hizo la compra: habilita tareas "comprar en mundo X".
    const placeId = body.placeId ?? body.data?.placeId ?? null;
    if (!itemId) {
      return ctx.badRequest('Falta itemId.');
    }

    const item = await strapi.entityService.findOne(ITEM_UID, itemId);
    if (!item) {
      return ctx.notFound('Objeto no encontrado.');
    }

    const price = item.value || 0;
    const balance = user.balance ?? 0;
    if (price > balance) {
      return ctx.badRequest('Saldo insuficiente.');
    }

    // Descontar saldo
    const newBalance = balance - price;
    await strapi.entityService.update(USER_UID, user.id, {
      data: { balance: newBalance },
    });

    // Upsert de la entrada de inventario
    const existing = await strapi.entityService.findMany(ENTRY_UID, {
      filters: { user: user.id, item: itemId },
      limit: 1,
    });

    let entry;
    if (existing && existing.length > 0) {
      entry = await strapi.entityService.update(ENTRY_UID, existing[0].id, {
        data: { quantity: (existing[0].quantity || 0) + 1 },
        populate: { item: { populate: ['icon'] } },
      });
    } else {
      entry = await strapi.entityService.create(ENTRY_UID, {
        data: { user: user.id, item: itemId, quantity: 1 },
        populate: { item: { populate: ['icon'] } },
      });
    }

    // Registrar el evento de compra (con su mundo derivado del lugar) y reevaluar
    // las estrategias de descubrimiento.
    let worldId = null;
    if (placeId) {
      const place = await strapi.entityService.findOne(PLACE_UID, placeId, {
        populate: { World: { fields: ['id'] } },
      });
      worldId = place?.World?.id ?? null;
    }
    await strapi.entityService.create(EVENT_UID, {
      data: { type: 'buy_item', user: user.id, item: itemId, place: placeId || null, world: worldId },
    });

    const { newlyDiscovered } = await evaluateUser(strapi, user.id);

    return ctx.send({ balance: newBalance, entry, newlyDiscovered });
  },
};
