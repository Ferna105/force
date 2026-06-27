'use strict';

/**
 * house controller (motor de vecindarios/casas, code-only sobre el content type).
 *
 * Endpoints:
 *  - GET  /neighborhoods/:placeId/parcels  (público)  mapa de parcelas del vecindario
 *  - POST /neighborhoods/:placeId/buy      (auth)      comprar una casa en una parcela libre
 *  - GET  /houses/mine                     (auth)      mi casa (o null)
 *  - GET  /houses/:id                      (público)   entrar a una casa (pública o mía)
 *  - POST /houses/:id/place                (auth/dueño) colocar un mueble (consume 1 del inventario)
 *  - POST /houses/:id/remove               (auth/dueño) quitar un mueble (devuelve 1 al inventario)
 *  - POST /houses/:id/visibility           (auth/dueño) alternar pública/privada
 */

const { createCoreController } = require('@strapi/strapi').factories;
const {
  HOUSE_UID, DESIGN_UID, DEFAULT_SIZE, HOUSE_POPULATE,
  houseToRest, neighborhoodConfig, resolveParcels,
} = require('../engine');

const PLACE_UID = 'api::place.place';
const USER_UID = 'plugin::users-permissions.user';
const ITEM_UID = 'api::item.item';
const ENTRY_UID = 'api::inventory-entry.inventory-entry';

// Carga la casa `id` validando que sea del usuario autenticado. Devuelve la casa o
// envía el error apropiado por `ctx` y devuelve null.
async function loadOwnedHouse(ctx, id) {
  const house = await strapi.entityService.findOne(HOUSE_UID, id, {
    populate: { owner: { fields: ['id'] } },
  });
  if (!house) { ctx.notFound('Casa no encontrada.'); return null; }
  if (!house.owner || house.owner.id !== ctx.state.user.id) {
    ctx.forbidden('Esta casa no es tuya.');
    return null;
  }
  return house;
}

// Recarga la casa con el populate completo y la devuelve en shape REST.
async function sendHouse(ctx, id, isOwner) {
  const full = await strapi.entityService.findOne(HOUSE_UID, id, { populate: HOUSE_POPULATE });
  return ctx.send({ data: houseToRest(full), isOwner });
}

module.exports = createCoreController(HOUSE_UID, () => ({
  // Mapa de parcelas de un vecindario (público; usa la sesión si viene token).
  async parcels(ctx) {
    const placeId = Number(ctx.params.placeId);
    if (!placeId) return ctx.badRequest('Falta placeId.');
    const place = await strapi.entityService.findOne(PLACE_UID, placeId, {
      fields: ['Type', 'NeighborhoodConfig'],
      populate: ['ParcelImage'],
    });
    if (!place) return ctx.notFound('Lugar no encontrado.');
    if (place.Type !== 'neighborhood') return ctx.badRequest('El lugar no es un vecindario.');
    const data = await resolveParcels(strapi, place, ctx.state.user?.id ?? null);
    return ctx.send(data);
  },

  // Comprar una casa en una parcela libre del vecindario.
  async buy(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión para comprar una casa.');

    const placeId = Number(ctx.params.placeId);
    const body = ctx.request.body || {};
    const parcelIndex = Number(body.parcelIndex ?? body.data?.parcelIndex);
    const designId = body.designId ?? body.data?.designId ?? null;
    if (!placeId) return ctx.badRequest('Falta placeId.');
    if (!Number.isInteger(parcelIndex) || parcelIndex < 0) return ctx.badRequest('Parcela inválida.');

    const place = await strapi.entityService.findOne(PLACE_UID, placeId, {
      fields: ['Type', 'NeighborhoodConfig'],
    });
    if (!place) return ctx.notFound('Lugar no encontrado.');
    if (place.Type !== 'neighborhood') return ctx.badRequest('El lugar no es un vecindario.');

    const { cols, rows, price } = neighborhoodConfig(place);
    if (parcelIndex >= cols * rows) return ctx.badRequest('Esa parcela no existe en el vecindario.');

    // Una sola casa por usuario en todo el juego.
    const owned = await strapi.db.query(HOUSE_UID).count({ where: { owner: user.id } });
    if (owned > 0) return ctx.badRequest('Ya tenés una casa. Solo podés tener una.');

    // La parcela debe estar libre.
    const taken = await strapi.db.query(HOUSE_UID).findOne({ where: { place: placeId, parcelIndex } });
    if (taken) return ctx.badRequest('Esa parcela ya está ocupada.');

    // El diseño elegido debe pertenecer a este vecindario.
    let design = null;
    if (designId != null) {
      design = await strapi.db.query(DESIGN_UID).findOne({ where: { id: designId }, populate: { place: true } });
      if (!design || design.place?.id !== placeId) return ctx.badRequest('Ese diseño no pertenece a este vecindario.');
    }

    const balance = user.balance ?? 0;
    if (price > balance) return ctx.badRequest('Saldo insuficiente para comprar la casa.');

    const newBalance = balance - price;
    await strapi.entityService.update(USER_UID, user.id, { data: { balance: newBalance } });

    const created = await strapi.entityService.create(HOUSE_UID, {
      data: {
        owner: user.id,
        place: placeId,
        design: design ? design.id : null,
        parcelIndex,
        visibility: 'private',
        width: DEFAULT_SIZE,
        height: DEFAULT_SIZE,
      },
    });

    const full = await strapi.entityService.findOne(HOUSE_UID, created.id, { populate: HOUSE_POPULATE });
    return ctx.send({ data: houseToRest(full), balance: newBalance });
  },

  // Mi casa (o null) — una sola en todo el juego.
  async mine(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');
    const list = await strapi.entityService.findMany(HOUSE_UID, {
      filters: { owner: user.id },
      populate: HOUSE_POPULATE,
      limit: 1,
    });
    const house = list[0] || null;
    return ctx.send({ data: house ? houseToRest(house) : null, isOwner: true });
  },

  // Entrar a una casa: pública para cualquiera, privada solo para su dueño.
  async detail(ctx) {
    const id = Number(ctx.params.id);
    const house = await strapi.entityService.findOne(HOUSE_UID, id, { populate: HOUSE_POPULATE });
    if (!house) return ctx.notFound('Casa no encontrada.');
    const isOwner = ctx.state.user != null && house.owner?.id === ctx.state.user.id;
    if (house.visibility !== 'public' && !isOwner) {
      return ctx.forbidden('Esta casa es privada.');
    }
    return ctx.send({ data: houseToRest(house), isOwner });
  },

  // Colocar un mueble en un cubo vacío: valida dueño, cubo libre, que el objeto sea
  // de categoría `furniture` y que el usuario lo tenga. Consume 1 del inventario.
  async place(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');

    const { id } = ctx.params;
    const body = ctx.request.body || {};
    const itemId = body.itemId ?? body.data?.itemId;
    const x = Number(body.x ?? body.data?.x);
    const y = Number(body.y ?? body.data?.y);
    if (!itemId) return ctx.badRequest('Falta itemId.');
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) return ctx.badRequest('Coordenadas inválidas.');

    const house = await loadOwnedHouse(ctx, id);
    if (!house) return;

    const w = house.width ?? DEFAULT_SIZE;
    const h = house.height ?? DEFAULT_SIZE;
    if (x >= w || y >= h) return ctx.badRequest('Ese cubo está fuera de la casa.');

    // El cubo debe estar libre.
    const occupied = await strapi.db.query('api::house-placement.house-placement').findOne({
      where: { house: house.id, x, y },
    });
    if (occupied) return ctx.badRequest('Ese cubo ya tiene un mueble.');

    // El objeto debe ser un mueble.
    const item = await strapi.entityService.findOne(ITEM_UID, itemId, { fields: ['category', 'name'] });
    if (!item) return ctx.notFound('Objeto no encontrado.');
    if (item.category !== 'furniture') return ctx.badRequest('Solo se pueden colocar muebles.');

    // El usuario debe poseer el objeto (entrada de inventario con cantidad > 0).
    const entry = await strapi.db.query(ENTRY_UID).findOne({
      where: { user: user.id, item: itemId, quantity: { $gt: 0 } },
    });
    if (!entry) return ctx.badRequest('No tenés ese objeto en tu inventario.');

    // Consumir 1: si era la última unidad, borrar la entrada.
    if (entry.quantity > 1) {
      await strapi.entityService.update(ENTRY_UID, entry.id, { data: { quantity: entry.quantity - 1 } });
    } else {
      await strapi.entityService.delete(ENTRY_UID, entry.id);
    }

    await strapi.entityService.create('api::house-placement.house-placement', {
      data: { house: house.id, item: itemId, x, y },
    });

    return sendHouse(ctx, house.id, true);
  },

  // Quitar un mueble de un cubo: lo borra y devuelve 1 al inventario.
  async remove(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');

    const { id } = ctx.params;
    const body = ctx.request.body || {};
    const x = Number(body.x ?? body.data?.x);
    const y = Number(body.y ?? body.data?.y);
    if (!Number.isInteger(x) || !Number.isInteger(y)) return ctx.badRequest('Coordenadas inválidas.');

    const house = await loadOwnedHouse(ctx, id);
    if (!house) return;

    const placement = await strapi.db.query('api::house-placement.house-placement').findOne({
      where: { house: house.id, x, y }, populate: { item: true },
    });
    if (!placement) return ctx.badRequest('No hay ningún mueble en ese cubo.');

    const itemId = placement.item?.id;
    await strapi.entityService.delete('api::house-placement.house-placement', placement.id);

    // Devolver 1 al inventario (upsert de la entrada, como hace shop.buy).
    if (itemId) {
      const existing = await strapi.db.query(ENTRY_UID).findOne({ where: { user: user.id, item: itemId } });
      if (existing) {
        await strapi.entityService.update(ENTRY_UID, existing.id, { data: { quantity: (existing.quantity || 0) + 1 } });
      } else {
        await strapi.entityService.create(ENTRY_UID, { data: { user: user.id, item: itemId, quantity: 1 } });
      }
    }

    return sendHouse(ctx, house.id, true);
  },

  // Alternar la visibilidad de la casa (pública / privada).
  async visibility(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');

    const { id } = ctx.params;
    const body = ctx.request.body || {};
    const visibility = body.visibility ?? body.data?.visibility;
    if (visibility !== 'public' && visibility !== 'private') return ctx.badRequest('Visibilidad inválida.');

    const house = await loadOwnedHouse(ctx, id);
    if (!house) return;

    await strapi.entityService.update(HOUSE_UID, id, { data: { visibility } });
    return sendHouse(ctx, house.id, true);
  },
}));
