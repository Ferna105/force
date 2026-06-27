'use strict';

/**
 * Motor de vecindarios/casas.
 *
 * Un place `Type:'neighborhood'` es un mapa de parcelas (grilla cols×rows definida
 * en `place.NeighborhoodConfig`). Cada usuario puede comprar UNA casa en todo el
 * juego, que ocupa una parcela libre y guarda una grilla interior de muebles
 * (content type `house-placement`: item + x/y). Colocar un mueble consume 1 del
 * inventario; quitarlo lo devuelve.
 *
 * Acá viven los helpers de REST-shaping (mismo patrón `itemToRest`/`mediaToRest`
 * del controller de companion) y la resolución del mapa de parcelas. La lógica de
 * negocio (compra, colocar/quitar) vive en el controller.
 */

const HOUSE_UID = 'api::house.house';
const DESIGN_UID = 'api::house-design.house-design';

// Tamaño por defecto de la grilla interior (cubos por lado). Ampliable a futuro.
const DEFAULT_SIZE = 15;

// Layout por defecto de un vecindario sin NeighborhoodConfig cargado.
const DEFAULT_CONFIG = { cols: 5, rows: 4, price: 300 };

// Envuelve una media aplanada en el shape REST { data: { id, attributes } }.
const mediaToRest = (m) => (m ? { data: { id: m.id, attributes: m } } : null);

// URL directa de una media aplanada (o null).
const mediaUrl = (m) => m?.url ?? null;

// Item aplanado -> shape REST (con su icon envuelto), igual que inventory-entry.
const itemToRest = (it) => {
  if (!it) return { data: null };
  const { icon, ...rest } = it;
  return { data: { id: it.id, attributes: { ...rest, icon: mediaToRest(icon) } } };
};

// Diseño de casa aplanado -> shape REST (Image exterior + Interior envueltos).
const designToRest = (d) => {
  if (!d) return { data: null };
  const { Image, Interior, ...rest } = d;
  return { data: { id: d.id, attributes: { ...rest, Image: mediaToRest(Image), Interior: mediaToRest(Interior) } } };
};

// Mueble colocado -> shape REST { id, attributes: { x, y, item } }.
const placementToRest = (p) => ({
  id: p.id,
  attributes: { x: p.x, y: p.y, item: itemToRest(p.item) },
});

// Casa aplanada -> shape REST que espera el front.
const houseToRest = (h) => ({
  id: h.id,
  attributes: {
    parcelIndex: h.parcelIndex,
    visibility: h.visibility,
    width: h.width ?? DEFAULT_SIZE,
    height: h.height ?? DEFAULT_SIZE,
    owner: h.owner ? { id: h.owner.id, username: h.owner.username } : null,
    place: h.place ? { id: h.place.id, Name: h.place.Name } : null,
    design: designToRest(h.design),
    placements: { data: (h.placements || []).map(placementToRest) },
  },
});

// Populate estándar de una casa para devolverla al front (dueño + diseño + muebles).
const HOUSE_POPULATE = {
  owner: { fields: ['id', 'username'] },
  place: { fields: ['id', 'Name'] },
  design: { populate: ['Image', 'Interior'] },
  placements: { populate: { item: { populate: ['icon'] } } },
};

// Config de layout efectiva de un vecindario (cae a DEFAULT_CONFIG si falta).
function neighborhoodConfig(place) {
  const cfg = (place && typeof place.NeighborhoodConfig === 'object' && place.NeighborhoodConfig) || {};
  return {
    cols: Number(cfg.cols) > 0 ? Number(cfg.cols) : DEFAULT_CONFIG.cols,
    rows: Number(cfg.rows) > 0 ? Number(cfg.rows) : DEFAULT_CONFIG.rows,
    price: Number(cfg.price) >= 0 ? Number(cfg.price) : DEFAULT_CONFIG.price,
  };
}

/**
 * Resuelve el mapa de parcelas de un vecindario para `currentUserId` (puede ser
 * null si no hay sesión). Devuelve el layout + el estado de cada parcela (libre /
 * ocupada, de quién, pública o privada, si la puedo visitar) + mi casa (si tengo).
 */
async function resolveParcels(strapi, place, currentUserId) {
  const { cols, rows, price } = neighborhoodConfig(place);
  const total = cols * rows;

  const designs = await strapi.entityService.findMany(DESIGN_UID, {
    filters: { place: place.id },
    populate: ['Image', 'Interior'],
  });

  const houses = await strapi.entityService.findMany(HOUSE_UID, {
    filters: { place: place.id },
    populate: { owner: { fields: ['id', 'username'] }, design: { populate: ['Image'] } },
  });
  const houseByParcel = new Map(houses.map((h) => [h.parcelIndex, h]));

  // Mi casa: una sola en todo el juego (acá la buscamos para marcar myHouseId y, si
  // cae en este vecindario, resaltar mi parcela).
  let myHouse = null;
  if (currentUserId) {
    const mine = await strapi.entityService.findMany(HOUSE_UID, {
      filters: { owner: currentUserId },
      limit: 1,
    });
    myHouse = mine[0] || null;
  }

  const parcels = [];
  for (let index = 0; index < total; index += 1) {
    const h = houseByParcel.get(index);
    if (!h) {
      parcels.push({ index, occupied: false, owner: null, visibility: null, houseId: null, designImageUrl: null, canEnter: false, mine: false });
      continue;
    }
    const mine = currentUserId != null && h.owner?.id === currentUserId;
    parcels.push({
      index,
      occupied: true,
      owner: h.owner ? { id: h.owner.id, username: h.owner.username } : null,
      visibility: h.visibility,
      houseId: h.id,
      designImageUrl: mediaUrl(h.design?.Image),
      canEnter: h.visibility === 'public' || mine,
      mine,
    });
  }

  return {
    cols,
    rows,
    price,
    parcelImageUrl: mediaUrl(place.ParcelImage),
    designs: designs.map((d) => ({
      id: d.id,
      name: d.Name,
      imageUrl: mediaUrl(d.Image),
      interiorUrl: mediaUrl(d.Interior),
    })),
    parcels,
    myHouseId: myHouse?.id ?? null,
  };
}

module.exports = {
  HOUSE_UID,
  DESIGN_UID,
  DEFAULT_SIZE,
  HOUSE_POPULATE,
  mediaToRest,
  itemToRest,
  houseToRest,
  neighborhoodConfig,
  resolveParcels,
};
