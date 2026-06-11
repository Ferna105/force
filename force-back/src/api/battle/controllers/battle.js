'use strict';

/**
 * battle controller (code-only, patrón `shop`).
 *
 * Lobby de duelos de un battledome:
 *  - GET  /battle/duels?placeId=  → { open:[de otros], mine:[tuyos] }
 *  - POST /battle/duels           → crear duelo (escrow del wager del creador)
 *  - POST /battle/duels/:id/join  → inscribirse (escrow del wager del oponente)
 *  - POST /battle/duels/:id/cancel→ cancelar (reintegra el wager)
 *  - GET  /battle/duels/:id       → cargar el duelo (para la pantalla de batalla)
 *
 * El combate turno-a-turno corre en el servidor de sockets (src/socket.js);
 * acá sólo se administra el ciclo de vida y el escrow de monedas.
 */

const DUEL_UID = 'api::duel.duel';
const COMPANION_UID = 'api::companion.companion';
const PLACE_UID = 'api::place.place';
const USER_UID = 'plugin::users-permissions.user';

const mediaUrl = (m) => m?.url ?? null;

// Item equipado aplanado (con icon) para la pantalla de batalla.
function itemLite(it) {
  if (!it) return null;
  return {
    id: it.id,
    name: it.name,
    rarity: it.rarity,
    type: it.type,
    category: it.category ?? null,
    attack: it.attack || 0,
    defense: it.defense || 0,
    heal: it.heal || 0,
    iconUrl: mediaUrl(it.icon),
  };
}

// Companion aplanado para la pantalla de batalla.
function companionForBattle(c) {
  if (!c) return null;
  const monster = c.monster || {};
  return {
    id: c.id,
    monsterName: monster.Name || 'Criatura',
    biome: monster.Biome || null,
    imageUrl: mediaUrl(monster.Image),
    level: c.level || 1,
    maxHp: c.health || 100,
    currentHealth: c.currentHealth ?? c.health ?? 100,
    strength: c.strength || 10,
    defense: c.defense || 10,
    speed: c.speed || 10,
    luck: c.luck || 5,
    items: (c.equippedItems || []).map(itemLite).filter(Boolean),
  };
}

// Populate completo de un duelo para la pantalla de batalla.
const DUEL_POPULATE = {
  place: { fields: ['Name', 'Type', 'Biome'], populate: { World: { fields: ['id', 'Name'] } } },
  creator: { fields: ['id', 'username'] },
  opponent: { fields: ['id', 'username'] },
  winner: { fields: ['id', 'username'] },
  creatorCompanion: { populate: { monster: { populate: ['Image'] }, equippedItems: { populate: ['icon'] } } },
  opponentCompanion: { populate: { monster: { populate: ['Image'] }, equippedItems: { populate: ['icon'] } } },
};

function duelToRest(d) {
  const w = d.place?.World;
  return {
    id: d.id,
    status: d.status,
    wager: d.wager || 0,
    arena: d.place?.Biome || 'volcanic',
    place: d.place ? { id: d.place.id, name: d.place.Name, worldId: w?.id ?? null, worldName: w?.Name ?? null } : null,
    creator: d.creator ? { userId: d.creator.id, username: d.creator.username } : null,
    opponent: d.opponent ? { userId: d.opponent.id, username: d.opponent.username } : null,
    winner: d.winner ? { userId: d.winner.id, username: d.winner.username } : null,
    creatorCompanion: companionForBattle(d.creatorCompanion),
    opponentCompanion: companionForBattle(d.opponentCompanion),
    result: d.result || null,
  };
}

// Carga un companion validando que sea del usuario; devuelve el row o null
// (enviando el error por ctx).
async function loadOwnedCompanion(ctx, userId, companionId) {
  if (!companionId) { ctx.badRequest('Falta companionId.'); return null; }
  const c = await strapi.db.query(COMPANION_UID).findOne({
    where: { id: companionId },
    populate: { user: true },
  });
  if (!c) { ctx.notFound('Compañero no encontrado.'); return null; }
  if (!c.user || c.user.id !== userId) { ctx.forbidden('Ese compañero no es tuyo.'); return null; }
  if ((c.currentHealth ?? c.health ?? 0) <= 0) {
    ctx.badRequest('Tu compañero está debilitado. Curalo con una poción antes de pelear.');
    return null;
  }
  return c;
}

// ¿El companion ya está comprometido en un duelo abierto/activo?
async function companionBusy(companionId) {
  const existing = await strapi.db.query(DUEL_UID).findOne({
    where: {
      status: { $in: ['open', 'active'] },
      $or: [{ creatorCompanion: companionId }, { opponentCompanion: companionId }],
    },
  });
  return !!existing;
}

module.exports = {
  // Lobby: duelos abiertos de otros + los propios (open/active) de este battledome.
  async duels(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');
    const placeId = Number(ctx.query.placeId);
    if (!placeId) return ctx.badRequest('Falta placeId.');

    const summaryPopulate = {
      creator: { fields: ['id', 'username'] },
      creatorCompanion: { populate: { monster: { populate: ['Image'] } } },
    };

    const openRows = await strapi.entityService.findMany(DUEL_UID, {
      filters: { place: placeId, status: 'open', creator: { id: { $ne: user.id } } },
      populate: summaryPopulate,
      sort: { createdAt: 'desc' },
    });
    const mineRows = await strapi.entityService.findMany(DUEL_UID, {
      filters: { place: placeId, creator: user.id, status: { $in: ['open', 'active'] } },
      populate: summaryPopulate,
      sort: { createdAt: 'desc' },
    });

    const toSummary = (d) => ({
      id: d.id,
      status: d.status,
      wager: d.wager || 0,
      creator: d.creator ? { userId: d.creator.id, username: d.creator.username } : null,
      monsterName: d.creatorCompanion?.monster?.Name || 'Criatura',
      monsterImageUrl: d.creatorCompanion?.monster?.Image?.url ?? null,
      level: d.creatorCompanion?.level || 1,
    });

    return ctx.send({ open: openRows.map(toSummary), mine: mineRows.map(toSummary) });
  },

  // Crear un duelo abierto. Escrow: descuenta el wager del creador.
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');
    const body = ctx.request.body || {};
    const placeId = Number(body.placeId);
    const companionId = Number(body.companionId);
    const wager = Math.max(0, Math.floor(Number(body.wager) || 0));

    const place = await strapi.entityService.findOne(PLACE_UID, placeId, { fields: ['Type'] });
    if (!place) return ctx.notFound('Lugar no encontrado.');
    if (place.Type !== 'battledome') return ctx.badRequest('El lugar no es un battledome.');

    const companion = await loadOwnedCompanion(ctx, user.id, companionId);
    if (!companion) return;
    if (await companionBusy(companionId)) return ctx.badRequest('Tu compañero ya está en un duelo.');

    const balance = user.balance ?? 0;
    if (wager > balance) return ctx.badRequest('Saldo insuficiente para esa apuesta.');

    // Escrow del creador.
    await strapi.entityService.update(USER_UID, user.id, { data: { balance: balance - wager } });

    const duel = await strapi.entityService.create(DUEL_UID, {
      data: {
        status: 'open',
        wager,
        place: placeId,
        creator: user.id,
        creatorCompanion: companionId,
      },
    });

    return ctx.send({ id: duel.id, balance: balance - wager });
  },

  // Inscribirse a un duelo abierto. Escrow: descuenta el wager del oponente.
  async join(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');
    const duelId = Number(ctx.params.id);
    const body = ctx.request.body || {};
    const companionId = Number(body.companionId);

    const duel = await strapi.db.query(DUEL_UID).findOne({
      where: { id: duelId }, populate: { creator: true },
    });
    if (!duel) return ctx.notFound('Duelo no encontrado.');
    if (duel.status !== 'open') return ctx.badRequest('Ese duelo ya no está disponible.');
    if (duel.creator && duel.creator.id === user.id) return ctx.badRequest('No podés inscribirte a tu propio duelo.');

    const companion = await loadOwnedCompanion(ctx, user.id, companionId);
    if (!companion) return;
    if (await companionBusy(companionId)) return ctx.badRequest('Tu compañero ya está en un duelo.');

    const balance = user.balance ?? 0;
    if ((duel.wager || 0) > balance) return ctx.badRequest('Saldo insuficiente para esa apuesta.');

    await strapi.entityService.update(USER_UID, user.id, { data: { balance: balance - (duel.wager || 0) } });

    await strapi.entityService.update(DUEL_UID, duelId, {
      data: { opponent: user.id, opponentCompanion: companionId, status: 'active' },
    });

    return ctx.send({ id: duelId, balance: balance - (duel.wager || 0) });
  },

  // Cancelar un duelo abierto propio (reintegra el wager).
  async cancel(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');
    const duelId = Number(ctx.params.id);
    const duel = await strapi.db.query(DUEL_UID).findOne({
      where: { id: duelId }, populate: { creator: true },
    });
    if (!duel) return ctx.notFound('Duelo no encontrado.');
    if (!duel.creator || duel.creator.id !== user.id) return ctx.forbidden('Ese duelo no es tuyo.');
    if (duel.status !== 'open') return ctx.badRequest('Sólo se pueden cancelar duelos abiertos.');

    const balance = user.balance ?? 0;
    await strapi.entityService.update(USER_UID, user.id, { data: { balance: balance + (duel.wager || 0) } });
    await strapi.entityService.update(DUEL_UID, duelId, { data: { status: 'cancelled' } });

    return ctx.send({ id: duelId, balance: balance + (duel.wager || 0) });
  },

  // Cargar un duelo (para la pantalla de batalla). Sólo creator u opponent.
  async get(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');
    const duelId = Number(ctx.params.id);
    const duel = await strapi.entityService.findOne(DUEL_UID, duelId, { populate: DUEL_POPULATE });
    if (!duel) return ctx.notFound('Duelo no encontrado.');
    const isCreator = duel.creator?.id === user.id;
    const isOpponent = duel.opponent?.id === user.id;
    if (!isCreator && !isOpponent) return ctx.forbidden('No participás de este duelo.');
    return ctx.send({ duel: duelToRest(duel) });
  },
};
