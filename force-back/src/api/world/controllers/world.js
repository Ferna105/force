'use strict';

/**
 * world controller
 *
 * Extiende el core para aplicar el gating de descubrimiento (Fase 0): oculta los
 * mundos Hidden que el usuario no descubrió y poda regiones/lugares no visibles
 * poblados en la respuesta. Ver src/api/discovery/gating.js.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { visibleSets, pruneNested } = require('../../discovery/gating');

module.exports = createCoreController('api::world.world', ({ strapi }) => ({
  async find(ctx) {
    const res = await super.find(ctx);
    const sets = await visibleSets(strapi, ctx);
    res.data = (res.data || []).filter((w) => sets.worlds.has(w.id)).map((w) => pruneNested(w, sets));
    return res;
  },

  async findOne(ctx) {
    const res = await super.findOne(ctx);
    if (!res?.data) return res;
    const sets = await visibleSets(strapi, ctx);
    if (!sets.worlds.has(res.data.id)) return ctx.notFound();
    pruneNested(res.data, sets);
    return res;
  },
}));
