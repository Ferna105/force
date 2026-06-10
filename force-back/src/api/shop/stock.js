'use strict';

/**
 * Motor de stock de tiendas.
 *
 * Cada lugar de tipo `shop` vende un subconjunto de objetos definido por su
 * campo `ShopConfig` (json), p. ej. `{ "categories": ["fruit"] }`. Su stock
 * vivo se guarda en el content-type `shop-stock` (una fila por objeto con su
 * cantidad). Cuando se agota, la compra que lo vacía marca `RestockAt = now+5m`
 * y un cron (config/cron-tasks.js) regenera las tiendas vencidas.
 *
 * La generación corre SIEMPRE desde el cron (o el seed en bootstrap), nunca en
 * el camino de lectura: así dos usuarios entrando a la vez a una tienda agotada
 * no pueden disparar dos generaciones simultáneas (race de doble stock).
 */

const ITEM_UID = 'api::item.item';
const PLACE_UID = 'api::place.place';
const STOCK_UID = 'api::shop-stock.shop-stock';
const STOCK_TABLE = 'shop_stocks';

// Unidades por generación (fijo, según diseño).
const STOCK_SIZE = 30;
// Minutos de espera tras agotarse antes de regenerar.
const RESTOCK_MINUTES = 5;
// Probabilidad relativa de cada rareza (más raro ⇒ menos probable).
const RARITY_WEIGHTS = { common: 50, uncommon: 25, rare: 15, epic: 8, legendary: 2 };

const mediaToRest = (m) => (m ? { data: { id: m.id, attributes: m } } : null);

// Da forma REST a las filas de stock para que el frontend las consuma como items.
function stockToRest(rows) {
  return rows.map((r) => {
    const it = r.item || {};
    const { icon, ...rest } = it;
    return {
      quantity: r.quantity,
      item: { id: it.id, attributes: { ...rest, icon: mediaToRest(icon) } },
    };
  });
}

// Elige una rareza al azar entre las disponibles, ponderada por RARITY_WEIGHTS.
function pickWeightedRarity(rarities) {
  const weights = rarities.map((r) => RARITY_WEIGHTS[r] || 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < rarities.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return rarities[i];
  }
  return rarities[rarities.length - 1];
}

// Objetos que una tienda puede vender, según su ShopConfig. Sin config ⇒ todos.
async function eligibleItems(strapi, place) {
  const c = place.ShopConfig || {};
  const filters = { value: { $gt: 0 } };
  if (Array.isArray(c.categories) && c.categories.length) filters.category = { $in: c.categories };
  if (Array.isArray(c.types) && c.types.length) filters.type = { $in: c.types };
  if (Array.isArray(c.rarities) && c.rarities.length) filters.rarity = { $in: c.rarities };
  if (Array.isArray(c.itemNames) && c.itemNames.length) filters.name = { $in: c.itemNames };
  return strapi.entityService.findMany(ITEM_UID, {
    filters,
    fields: ['id', 'rarity'],
    publicationState: 'live',
    limit: -1,
  });
}

/**
 * (Re)genera el stock de una tienda: borra el anterior y crea STOCK_SIZE
 * unidades repartidas entre los objetos elegibles, ponderando por rareza.
 * Deja `RestockAt` en null. Pensado para correr desde el cron o el seed.
 */
async function generateStock(strapi, place) {
  const old = await strapi.db.query(STOCK_UID).findMany({ where: { place: { id: place.id } } });
  if (old.length) {
    await strapi.db.query(STOCK_UID).deleteMany({ where: { id: { $in: old.map((o) => o.id) } } });
  }

  const items = await eligibleItems(strapi, place);
  if (!items.length) {
    await strapi.db.query(PLACE_UID).update({ where: { id: place.id }, data: { RestockAt: null } });
    strapi.log.warn(`[shop] ${place.Name}: sin objetos elegibles para generar stock.`);
    return new Map();
  }

  const byRarity = {};
  for (const it of items) (byRarity[it.rarity] ||= []).push(it);
  const rarities = Object.keys(byRarity);

  const counts = new Map();
  for (let i = 0; i < STOCK_SIZE; i++) {
    const rarity = pickWeightedRarity(rarities);
    const pool = byRarity[rarity];
    const it = pool[Math.floor(Math.random() * pool.length)];
    counts.set(it.id, (counts.get(it.id) || 0) + 1);
  }

  for (const [itemId, quantity] of counts) {
    await strapi.entityService.create(STOCK_UID, { data: { place: place.id, item: itemId, quantity } });
  }
  await strapi.db.query(PLACE_UID).update({ where: { id: place.id }, data: { RestockAt: null } });
  strapi.log.info(`[shop] Stock generado para ${place.Name}: ${counts.size} objetos / ${STOCK_SIZE} u.`);
  return counts;
}

/**
 * Stock actual de una tienda (solo lectura, NO genera). Devuelve los objetos
 * con cantidad + info de reabastecimiento si está agotada.
 */
async function getStock(strapi, placeId) {
  const rows = await strapi.entityService.findMany(STOCK_UID, {
    filters: { place: placeId, quantity: { $gt: 0 } },
    populate: { item: { populate: ['icon'] } },
    limit: -1,
  });
  const place = await strapi.entityService.findOne(PLACE_UID, placeId, { fields: ['RestockAt'] });
  const restockAt = place?.RestockAt || null;
  const restockInSeconds = restockAt
    ? Math.max(0, Math.ceil((new Date(restockAt).getTime() - Date.now()) / 1000))
    : null;
  const total = rows.reduce((a, r) => a + (r.quantity || 0), 0);
  return { items: stockToRest(rows), total, restockAt, restockInSeconds };
}

/**
 * Descuenta 1 unidad de un objeto en una tienda (al comprar). El decremento es
 * atómico a nivel DB para evitar sobreventa si dos usuarios compran la última
 * unidad a la vez. Si la tienda queda en 0, marca `RestockAt = now + 5min`.
 */
async function decrementStock(strapi, placeId, itemId) {
  const rows = await strapi.db.query(STOCK_UID).findMany({
    where: { place: { id: placeId }, item: { id: itemId }, quantity: { $gt: 0 } },
    limit: 1,
  });
  if (!rows.length) return { ok: false, reason: 'out_of_stock' };
  const row = rows[0];

  const affected = await strapi.db
    .connection(STOCK_TABLE)
    .where('id', row.id)
    .andWhere('quantity', '>', 0)
    .decrement('quantity', 1);
  if (!affected) return { ok: false, reason: 'out_of_stock' };

  const fresh = await strapi.db.query(STOCK_UID).findOne({ where: { id: row.id } });
  if (fresh && fresh.quantity <= 0) {
    await strapi.db.query(STOCK_UID).delete({ where: { id: row.id } });
  }

  const remaining = await strapi.db.query(STOCK_UID).count({
    where: { place: { id: placeId }, quantity: { $gt: 0 } },
  });
  if (remaining === 0) {
    const restockAt = new Date(Date.now() + RESTOCK_MINUTES * 60 * 1000);
    await strapi.db.query(PLACE_UID).update({ where: { id: placeId }, data: { RestockAt: restockAt } });
  }
  return { ok: true };
}

/**
 * Recorre todas las tiendas y regenera las que estén agotadas y cuyo cooldown
 * (`RestockAt`) ya venció o nunca se seteó. Punto único de generación: lo llama
 * el cron periódicamente y el seed una vez en bootstrap.
 */
async function restockDueShops(strapi) {
  const now = Date.now();
  const shops = await strapi.db.query(PLACE_UID).findMany({ where: { Type: 'shop' } });
  for (const place of shops) {
    const restockAt = place.RestockAt ? new Date(place.RestockAt).getTime() : null;
    if (restockAt && restockAt > now) continue; // todavía en cooldown

    const inStock = await strapi.db.query(STOCK_UID).count({
      where: { place: { id: place.id }, quantity: { $gt: 0 } },
    });
    if (inStock > 0) continue; // ya tiene stock

    await generateStock(strapi, place);
  }
}

module.exports = {
  STOCK_SIZE,
  RESTOCK_MINUTES,
  RARITY_WEIGHTS,
  eligibleItems,
  generateStock,
  getStock,
  decrementStock,
  restockDueShops,
};
