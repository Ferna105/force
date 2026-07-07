'use strict';

/**
 * place controller
 *
 * Extiende el core para aplicar el gating de descubrimiento (Fase 0): oculta los
 * lugares Hidden que el usuario no descubrió (o cuya región/mundo no es visible).
 * Ver src/api/discovery/gating.js.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { visibleSets } = require('../../discovery/gating');

module.exports = createCoreController('api::place.place', ({ strapi }) => ({
  async find(ctx) {
    const res = await super.find(ctx);
    const sets = await visibleSets(strapi, ctx);
    res.data = (res.data || []).filter((p) => sets.places.has(p.id));
    return res;
  },

  async findOne(ctx) {
    const res = await super.findOne(ctx);
    if (!res?.data) return res;
    const sets = await visibleSets(strapi, ctx);
    if (!sets.places.has(res.data.id)) return ctx.notFound();
    return res;
  },
}));
