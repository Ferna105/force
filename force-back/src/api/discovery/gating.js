'use strict';

/**
 * Gating de descubrimiento a nivel de controller (Fase 0).
 *
 * Los controllers `find`/`findOne` de world/region/place reusan estos helpers
 * para NO devolver entidades ocultas (`Hidden: true`) que el usuario todavía no
 * descubrió, respetando la jerarquía world → region → place. Al ser server-side,
 * el gating es robusto (no depende de que el front filtre) y también poda las
 * relaciones anidadas (regiones/lugares poblados dentro de un mundo/región).
 */

const { visibleFor } = require('./engine');

// Sets de ids visibles para el usuario del request (o anónimo si no hay sesión).
async function visibleSets(strapi, ctx) {
  const v = await visibleFor(strapi, ctx.state.user?.id ?? null);
  return {
    worlds: new Set(v.worlds),
    regions: new Set(v.regions),
    places: new Set(v.places),
  };
}

// Poda las relaciones anidadas (regiones/lugares poblados) de una entidad ya
// transformada a shape REST ({ id, attributes }).
function pruneNested(entity, sets) {
  const a = entity?.attributes;
  if (!a) return entity;
  if (a.regions?.data) {
    a.regions.data = a.regions.data.filter((r) => sets.regions.has(r.id));
    for (const r of a.regions.data) {
      if (r.attributes?.places?.data) {
        r.attributes.places.data = r.attributes.places.data.filter((p) => sets.places.has(p.id));
      }
    }
  }
  if (a.places?.data) {
    a.places.data = a.places.data.filter((p) => sets.places.has(p.id));
  }
  return entity;
}

module.exports = { visibleSets, pruneNested };
