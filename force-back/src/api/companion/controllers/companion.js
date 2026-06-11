'use strict';

/**
 * companion controller
 *
 * - `mine`: lista los compañeros del usuario autenticado (las relaciones a
 *   users-permissions.user no se pueden filtrar por el content API, así que
 *   se resuelven server-side con ctx.state.user).
 * - `feed` / `play` / `pet`: acciones de cuidado que ajustan stats (0..100).
 */

const { createCoreController } = require('@strapi/strapi').factories;

const UID = 'api::companion.companion';
const ITEM_UID = 'api::item.item';
const ENTRY_UID = 'api::inventory-entry.inventory-entry';

// Tope de objetos equipados por compañero.
const MAX_EQUIP = 5;

const clamp = (n) => Math.max(0, Math.min(100, n));

// Envuelve una media aplanada en el shape REST { data: { id, attributes } }
const mediaToRest = (m) => (m ? { data: { id: m.id, attributes: m } } : null);

// Envuelve un monstruo aplanado en shape REST (con su Image envuelta)
const monsterToRest = (m) => {
  if (!m) return { data: null };
  const { Image, ...rest } = m;
  return { data: { id: m.id, attributes: { ...rest, Image: mediaToRest(Image) } } };
};

// Envuelve un item aplanado en shape REST (con su icon envuelto) — igual que el
// controller de inventory-entry, para que el front lo renderice directo.
const itemToRest = (it) => {
  if (!it) return null;
  const { icon, ...rest } = it;
  return { id: it.id, attributes: { ...rest, icon: mediaToRest(icon) } };
};

// Compañero aplanado -> shape REST que espera el front
const companionToRest = (c) => ({
  id: c.id,
  attributes: {
    happiness: c.happiness,
    energy: c.energy,
    bond: c.bond,
    isActive: c.isActive,
    lastInteraction: c.lastInteraction,
    // Stats de progresión/combate (arrancan en el base de la especie)
    health: c.health,
    // Salud actual: baja en los duelos del battledome; 0 = debilitado (no pelea).
    currentHealth: c.currentHealth ?? c.health,
    strength: c.strength,
    defense: c.defense,
    speed: c.speed,
    luck: c.luck,
    level: c.level,
    monster: monsterToRest(c.monster),
    // Objetos equipados (hasta MAX_EQUIP), en shape de lista REST.
    equippedItems: { data: (c.equippedItems || []).map(itemToRest).filter(Boolean) },
  },
});

// Aplica deltas de cuidado sobre el compañero del usuario autenticado
// Populate estándar de un compañero para devolverlo al front (monstruo + equipo).
const COMPANION_POPULATE = {
  monster: { populate: ['Image'] },
  equippedItems: { populate: ['icon'] },
};

// Carga el compañero `id` validando que sea del `user`. Devuelve { companion } o
// envía el error apropiado por `ctx` y devuelve null.
async function loadOwnedCompanion(ctx, id) {
  const companion = await strapi.entityService.findOne(UID, id, {
    populate: { user: true, equippedItems: true },
  });
  if (!companion) { ctx.notFound('Compañero no encontrado.'); return null; }
  if (!companion.user || companion.user.id !== ctx.state.user.id) {
    ctx.forbidden('Este compañero no es tuyo.');
    return null;
  }
  return companion;
}

// Recarga el compañero con el populate completo y lo devuelve en shape REST.
async function sendCompanion(ctx, id) {
  const full = await strapi.entityService.findOne(UID, id, { populate: COMPANION_POPULATE });
  return ctx.send({ data: companionToRest(full) });
}

async function care(ctx, deltas) {
  const user = ctx.state.user;
  if (!user) return ctx.unauthorized('Debés iniciar sesión.');

  const { id } = ctx.params;
  const companion = await strapi.entityService.findOne(UID, id, { populate: { user: true } });
  if (!companion) return ctx.notFound('Compañero no encontrado.');
  if (!companion.user || companion.user.id !== user.id) {
    return ctx.forbidden('Este compañero no es tuyo.');
  }

  const data = {
    happiness: clamp((companion.happiness || 0) + (deltas.happiness || 0)),
    energy: clamp((companion.energy || 0) + (deltas.energy || 0)),
    bond: clamp((companion.bond || 0) + (deltas.bond || 0)),
    lastInteraction: new Date().toISOString(),
  };

  const updated = await strapi.entityService.update(UID, id, { data });

  // Las acciones de cuidado devuelven los stats aplanados (la UI lee res.happiness)
  return ctx.send({ happiness: updated.happiness, energy: updated.energy, bond: updated.bond });
}

module.exports = createCoreController(UID, () => ({
  // Compañeros del usuario autenticado
  async mine(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');
    const list = await strapi.entityService.findMany(UID, {
      filters: { user: user.id },
      populate: COMPANION_POPULATE,
    });
    return ctx.send({ data: list.map(companionToRest) });
  },

  // Adoptar un monstruo como compañero del usuario autenticado.
  // Inicializa los stats al base de la especie (vía el service createForUser) y
  // evita duplicados (un compañero por monstruo por usuario).
  async adopt(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');

    const body = ctx.request.body || {};
    const monsterId = body.monsterId ?? body.data?.monsterId;
    if (!monsterId) return ctx.badRequest('Falta monsterId.');

    const monster = await strapi.db.query('api::monster.monster').findOne({ where: { id: monsterId } });
    if (!monster) return ctx.notFound('Monstruo no encontrado.');

    const existing = await strapi.db.query(UID).findOne({ where: { user: user.id, monster: monsterId } });
    if (existing) return ctx.badRequest('Ya tenés a esta criatura como compañera.');

    // Solo se permite un compañero por usuario.
    const count = await strapi.db.query(UID).count({ where: { user: user.id } });
    if (count > 0) return ctx.badRequest('Ya tenés un compañero. Solo podés tener uno.');

    // El primer (y único) compañero del usuario queda activo por defecto.
    const created = await strapi.service(UID).createForUser(user.id, monsterId, { isActive: count === 0 });

    const full = await strapi.entityService.findOne(UID, created.id, {
      populate: { monster: { populate: ['Image'] } },
    });
    return ctx.send({ data: companionToRest(full) });
  },

  // Equipar un objeto al compañero del usuario. Valida propiedad del compañero,
  // tenencia del objeto (inventario qty>0), tope de MAX_EQUIP y que no esté repetido.
  async equip(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');

    const { id } = ctx.params;
    const body = ctx.request.body || {};
    const itemId = body.itemId ?? body.data?.itemId;
    if (!itemId) return ctx.badRequest('Falta itemId.');

    const companion = await loadOwnedCompanion(ctx, id);
    if (!companion) return;

    const equipped = companion.equippedItems || [];
    if (equipped.some((it) => it.id === Number(itemId))) {
      return ctx.badRequest('Ese objeto ya está equipado.');
    }
    if (equipped.length >= MAX_EQUIP) {
      return ctx.badRequest(`Tu compañero ya tiene ${MAX_EQUIP} objetos equipados.`);
    }

    // El usuario debe poseer el objeto (entrada de inventario con cantidad > 0).
    const owns = await strapi.db.query('api::inventory-entry.inventory-entry').findOne({
      where: { user: user.id, item: itemId, quantity: { $gt: 0 } },
    });
    if (!owns) return ctx.badRequest('No tenés ese objeto en tu inventario.');

    await strapi.entityService.update(UID, id, {
      data: { equippedItems: { connect: [itemId] } },
    });
    return sendCompanion(ctx, id);
  },

  // Quitar un objeto del equipamiento del compañero del usuario.
  async unequip(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');

    const { id } = ctx.params;
    const body = ctx.request.body || {};
    const itemId = body.itemId ?? body.data?.itemId;
    if (!itemId) return ctx.badRequest('Falta itemId.');

    const companion = await loadOwnedCompanion(ctx, id);
    if (!companion) return;

    await strapi.entityService.update(UID, id, {
      data: { equippedItems: { disconnect: [itemId] } },
    });
    return sendCompanion(ctx, id);
  },

  // Curar al compañero con un objeto poción (heal>0). Consume 1 del inventario
  // y sube currentHealth (tope = health máxima). Reactiva compañeros debilitados.
  async heal(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');

    const { id } = ctx.params;
    const body = ctx.request.body || {};
    const itemId = body.itemId ?? body.data?.itemId;
    if (!itemId) return ctx.badRequest('Falta itemId.');

    const companion = await loadOwnedCompanion(ctx, id);
    if (!companion) return;

    const item = await strapi.entityService.findOne(ITEM_UID, itemId, { fields: ['heal', 'name'] });
    if (!item) return ctx.notFound('Objeto no encontrado.');
    if (!item.heal || item.heal <= 0) return ctx.badRequest('Ese objeto no cura.');

    const max = companion.health || 100;
    const cur = companion.currentHealth ?? max;
    if (cur >= max) return ctx.badRequest('Tu compañero ya tiene la salud completa.');

    // Debe poseer la poción (entrada de inventario con cantidad > 0).
    const entry = await strapi.db.query(ENTRY_UID).findOne({
      where: { user: user.id, item: itemId, quantity: { $gt: 0 } },
    });
    if (!entry) return ctx.badRequest('No tenés esa poción en tu inventario.');

    // Consumir 1 unidad y aplicar la curación.
    await strapi.entityService.update(ENTRY_UID, entry.id, { data: { quantity: entry.quantity - 1 } });
    const next = Math.min(max, cur + item.heal);
    await strapi.entityService.update(UID, id, { data: { currentHealth: next } });

    return sendCompanion(ctx, id);
  },

  async feed(ctx) {
    return care(ctx, { energy: 20, happiness: 5 });
  },
  async play(ctx) {
    return care(ctx, { happiness: 20, bond: 10, energy: -10 });
  },
  async pet(ctx) {
    return care(ctx, { happiness: 10, bond: 5 });
  },
}));
