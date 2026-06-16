'use strict';

/**
 * training controller (code-only, patrón `shop`/`battle`).
 *
 * Escuela de adiestramiento: el jugador paga con un tótem (de la rareza que
 * corresponde al nivel de su compañero) y, tras un tiempo real, sube una stat.
 *
 *  - GET  /training/:placeId/info?companionId=  → estado (tótem exigido, stats, entrenador)
 *  - POST /training/:placeId/start { companionId, stat } → inicia un entrenamiento
 *
 * El +1/+2 se aplica perezosamente al terminar (companion.service.resolveTraining).
 */

const {
  STATS, DAYS_BY_RARITY, rarityByLevel, statCap, statValue, canTrain, gainFor,
} = require('../engine');

const COMPANION_UID = 'api::companion.companion';
const TRAINER_UID = 'api::trainer.trainer';
const PLACE_UID = 'api::place.place';
const ITEM_UID = 'api::item.item';
const ENTRY_UID = 'api::inventory-entry.inventory-entry';
const DUEL_UID = 'api::duel.duel';

const mediaUrl = (m) => m?.url ?? null;

// Populate de un compañero para el motor de entrenamiento (incluye el tótem exigido).
const COMPANION_POPULATE = { user: true, demandedTotem: { populate: ['icon'] } };

// Carga el compañero `id` validando que sea de `userId`. Devuelve el row (con
// demandedTotem) o envía el error por `ctx` y devuelve null.
async function loadOwnedCompanion(ctx, userId, companionId) {
  if (!companionId) { ctx.badRequest('Falta companionId.'); return null; }
  const c = await strapi.entityService.findOne(COMPANION_UID, companionId, {
    populate: COMPANION_POPULATE,
  });
  if (!c) { ctx.notFound('Compañero no encontrado.'); return null; }
  if (!c.user || c.user.id !== userId) { ctx.forbidden('Ese compañero no es tuyo.'); return null; }
  return c;
}

// El entrenador de la escuela `placeId` (con su imagen). null si no hay.
async function trainerForPlace(placeId) {
  return strapi.db.query(TRAINER_UID).findOne({ where: { place: placeId }, populate: ['image'] });
}

// Payload del entrenador para el front.
function trainerToRest(t) {
  if (!t) return null;
  return { name: t.name, imageUrl: mediaUrl(t.image), specialties: t.specialties || [] };
}

// ¿El compañero está entrenando ahora mismo (fecha de fin en el futuro)?
function isTraining(c) {
  return !!(c.trainingStat && c.trainingEndsAt && new Date(c.trainingEndsAt).getTime() > Date.now());
}

// Tótems publicados de una rareza dada (con su icono).
async function totemsOfRarity(rarity) {
  return strapi.db.query(ITEM_UID).findMany({
    where: { category: 'totem', rarity, publishedAt: { $notNull: true } },
    populate: ['icon'],
  });
}

// ¿El usuario posee ese item (entrada de inventario con cantidad > 0)?
async function ownsItem(userId, itemId) {
  const entry = await strapi.db.query(ENTRY_UID).findOne({
    where: { user: userId, item: itemId, quantity: { $gt: 0 } },
  });
  return entry || null;
}

// Garantiza que `companion.demandedTotem` sea un tótem válido para la rareza
// requerida: si falta o cambió la banda de rareza, sortea uno nuevo y lo persiste.
// Devuelve el item del tótem exigido (con icono) o null si no hay tótems de esa rareza.
async function ensureDemandedTotem(companion, requiredRarity) {
  const cur = companion.demandedTotem;
  if (cur && cur.rarity === requiredRarity) return cur;

  const pool = await totemsOfRarity(requiredRarity);
  if (!pool.length) return null;
  const picked = pool[Math.floor(Math.random() * pool.length)];

  await strapi.entityService.update(COMPANION_UID, companion.id, {
    data: { demandedTotem: picked.id },
  });
  companion.demandedTotem = picked;
  return picked;
}

// Arma la respuesta de estado (idle / training) para un compañero ya resuelto.
async function buildInfo(userId, companion, trainer) {
  const trainerRest = trainerToRest(trainer);
  const specialties = trainerRest?.specialties || [];

  if (isTraining(companion)) {
    const secondsLeft = Math.max(0, Math.ceil((new Date(companion.trainingEndsAt).getTime() - Date.now()) / 1000));
    return {
      status: 'training',
      stat: companion.trainingStat,
      gain: companion.trainingGain || 1,
      endsAt: companion.trainingEndsAt,
      secondsLeft,
      trainer: trainerRest,
    };
  }

  const level = companion.level || 1;
  const requiredRarity = rarityByLevel(level);
  const days = DAYS_BY_RARITY[requiredRarity];
  const totem = await ensureDemandedTotem(companion, requiredRarity);
  const ownsDemanded = totem ? !!(await ownsItem(userId, totem.id)) : false;

  return {
    status: 'idle',
    level,
    requiredRarity,
    days,
    trainer: trainerRest,
    demandedTotem: totem
      ? { id: totem.id, name: totem.name, rarity: totem.rarity, iconUrl: mediaUrl(totem.icon) }
      : null,
    ownsDemanded,
    stats: STATS.map((key) => ({
      key,
      value: statValue(companion, key),
      cap: statCap(key, level),
      canTrain: canTrain(companion, key),
      gain: gainFor(key, specialties),
    })),
  };
}

// Valida que el place sea una escuela de entrenamiento. Devuelve el place o null.
async function loadTrainingPlace(ctx, placeId) {
  const place = await strapi.entityService.findOne(PLACE_UID, placeId, { fields: ['Type'] });
  if (!place) { ctx.notFound('Lugar no encontrado.'); return null; }
  if (place.Type !== 'training') { ctx.badRequest('El lugar no es una escuela de entrenamiento.'); return null; }
  return place;
}

module.exports = {
  // Estado de la escuela para un compañero: tótem exigido, stats y entrenador.
  async info(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');
    const placeId = Number(ctx.params.placeId);
    const companionId = Number(ctx.query.companionId);

    if (!(await loadTrainingPlace(ctx, placeId))) return;
    let companion = await loadOwnedCompanion(ctx, user.id, companionId);
    if (!companion) return;

    // Resolver un entrenamiento ya vencido (aplica +gain) antes de responder.
    companion = await strapi.service(COMPANION_UID).resolveTraining(companion);

    const trainer = await trainerForPlace(placeId);
    return ctx.send(await buildInfo(user.id, companion, trainer));
  },

  // Inicia un entrenamiento: cobra el tótem exigido y deja al compañero entrenando.
  async start(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');
    const placeId = Number(ctx.params.placeId);
    const body = ctx.request.body || {};
    const companionId = Number(body.companionId);
    const stat = body.stat;

    if (!(await loadTrainingPlace(ctx, placeId))) return;
    if (!STATS.includes(stat)) return ctx.badRequest('Disciplina inválida.');

    let companion = await loadOwnedCompanion(ctx, user.id, companionId);
    if (!companion) return;

    // Resolver entrenamiento vencido y rechazar si ya está entrenando.
    companion = await strapi.service(COMPANION_UID).resolveTraining(companion);
    if (isTraining(companion)) return ctx.badRequest('Tu compañero ya está entrenando.');

    // No puede entrenar si está comprometido en un duelo (open/active).
    const busy = await strapi.db.query(DUEL_UID).findOne({
      where: {
        status: { $in: ['open', 'active'] },
        $or: [{ creatorCompanion: companionId }, { opponentCompanion: companionId }],
      },
    });
    if (busy) return ctx.badRequest('Tu compañero está en un duelo y no puede entrenar.');

    // Tope alcanzado: hay que subir nivel primero.
    if (!canTrain(companion, stat)) {
      if (stat === 'level') return ctx.badRequest('Tu compañero ya alcanzó el nivel máximo.');
      return ctx.badRequest('Esa característica llegó a su tope (2× el nivel). Subí el nivel primero.');
    }

    const level = companion.level || 1;
    const requiredRarity = rarityByLevel(level);

    // Garantizar el tótem exigido y exigir que el usuario lo posea.
    const totem = await ensureDemandedTotem(companion, requiredRarity);
    if (!totem) return ctx.badRequest('No hay tótems de la rareza requerida en el catálogo.');
    const entry = await ownsItem(user.id, totem.id);
    if (!entry) return ctx.badRequest(`El entrenador exige un ${totem.name}. Conseguilo antes de entrenar.`);

    // Cobrar el tótem (descuenta 1 del inventario).
    await strapi.entityService.update(ENTRY_UID, entry.id, { data: { quantity: entry.quantity - 1 } });

    // Programar el entrenamiento.
    const trainer = await trainerForPlace(placeId);
    const gain = gainFor(stat, trainer?.specialties);
    const days = DAYS_BY_RARITY[requiredRarity];
    const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    await strapi.entityService.update(COMPANION_UID, companionId, {
      data: { trainingStat: stat, trainingEndsAt: endsAt, trainingGain: gain, demandedTotem: null },
    });

    // Releer y devolver el estado (ahora "training").
    const fresh = await strapi.entityService.findOne(COMPANION_UID, companionId, { populate: COMPANION_POPULATE });
    return ctx.send(await buildInfo(user.id, fresh, trainer));
  },
};
