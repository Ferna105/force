'use strict';

/**
 * region controller
 *
 * Extiende el core para aplicar el gating de descubrimiento (Fase 0): oculta las
 * regiones Hidden que el usuario no descubrió (o cuyo mundo no es visible) y poda
 * los lugares no visibles poblados. Ver src/api/discovery/gating.js.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { visibleSets, pruneNested } = require('../../discovery/gating');

module.exports = createCoreController('api::region.region', ({ strapi }) => ({
  async find(ctx) {
    const res = await super.find(ctx);
    const sets = await visibleSets(strapi, ctx);
    res.data = (res.data || []).filter((r) => sets.regions.has(r.id)).map((r) => pruneNested(r, sets));
    return res;
  },

  async findOne(ctx) {
    const res = await super.findOne(ctx);
    if (!res?.data) return res;
    const sets = await visibleSets(strapi, ctx);
    if (!sets.regions.has(res.data.id)) return ctx.notFound();
    pruneNested(res.data, sets);
    return res;
  },
}));
