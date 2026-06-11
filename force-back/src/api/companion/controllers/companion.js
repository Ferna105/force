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

const clamp = (n) => Math.max(0, Math.min(100, n));

// Envuelve una media aplanada en el shape REST { data: { id, attributes } }
const mediaToRest = (m) => (m ? { data: { id: m.id, attributes: m } } : null);

// Envuelve un monstruo aplanado en shape REST (con su Image envuelta)
const monsterToRest = (m) => {
  if (!m) return { data: null };
  const { Image, ...rest } = m;
  return { data: { id: m.id, attributes: { ...rest, Image: mediaToRest(Image) } } };
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
    strength: c.strength,
    defense: c.defense,
    speed: c.speed,
    luck: c.luck,
    level: c.level,
    monster: monsterToRest(c.monster),
  },
});

// Aplica deltas de cuidado sobre el compañero del usuario autenticado
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
      populate: { monster: { populate: ['Image'] } },
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

    // El primer compañero del usuario queda activo por defecto.
    const count = await strapi.db.query(UID).count({ where: { user: user.id } });
    const created = await strapi.service(UID).createForUser(user.id, monsterId, { isActive: count === 0 });

    const full = await strapi.entityService.findOne(UID, created.id, {
      populate: { monster: { populate: ['Image'] } },
    });
    return ctx.send({ data: companionToRest(full) });
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
