'use strict';

/**
 * shop controller
 *
 * Compra de un objeto: valida saldo del usuario autenticado, descuenta el
 * valor del objeto y suma 1 a la entrada de inventario correspondiente
 * (creándola si no existía).
 */

const USER_UID = 'plugin::users-permissions.user';
const ITEM_UID = 'api::item.item';
const ENTRY_UID = 'api::inventory-entry.inventory-entry';

module.exports = {
  async buy(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Debés iniciar sesión para comprar.');
    }

    const itemId = ctx.request.body?.itemId ?? ctx.request.body?.data?.itemId;
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

    return ctx.send({ balance: newBalance, entry });
  },
};
