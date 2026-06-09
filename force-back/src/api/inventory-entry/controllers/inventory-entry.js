'use strict';

/**
 * inventory-entry controller
 *
 * `mine`: inventario del usuario autenticado. Se resuelve server-side porque
 * la relación a users-permissions.user no es filtrable vía content API.
 */

const { createCoreController } = require('@strapi/strapi').factories;

const UID = 'api::inventory-entry.inventory-entry';

const mediaToRest = (m) => (m ? { data: { id: m.id, attributes: m } } : null);

const itemToRest = (it) => {
  if (!it) return { data: null };
  const { icon, ...rest } = it;
  return { data: { id: it.id, attributes: { ...rest, icon: mediaToRest(icon) } } };
};

module.exports = createCoreController(UID, () => ({
  async mine(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');
    const list = await strapi.entityService.findMany(UID, {
      filters: { user: user.id },
      populate: { item: { populate: ['icon'] } },
    });
    const data = list.map((e) => ({
      id: e.id,
      attributes: { quantity: e.quantity, item: itemToRest(e.item) },
    }));
    return ctx.send({ data });
  },
}));
