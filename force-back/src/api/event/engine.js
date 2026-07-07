'use strict';

/**
 * Motor de Eventos (genérico).
 *
 * Un **evento** (`event`) encapsula un questline multi-paso con recompensa. Sus
 * `steps` son una lista ordenada de pasos `{ key, type, params, label }`; cada
 * usuario tiene su propio `event-progress` (paso actual, pasos completados,
 * `state` de puzzle). Al completar todos los pasos se otorgan `event.rewards`
 * una sola vez.
 *
 * Tipos de paso (`type`):
 *   - `flag`  — paso interactivo: se cumple cuando `state[params.flag || key]`
 *               es truthy. Se marca vía `POST /events/:id/step/:key` (ver
 *               STEP_RESOLVERS; los puzzles de Deo enchufan validaciones acá).
 *   - cualquiera de los evaluadores de descubrimiento (`visit_place`,
 *     `play_place`, `own_item`, `buy_item`, ...): paso "pasivo" que se resuelve
 *     solo contra el historial/inventario del usuario (mismo `EVALUATORS`).
 *
 * Orden: los pasos se evalúan en orden y se corta en el primero no cumplido
 * (`currentStep` = índice del primer pendiente), así el questline avanza en
 * secuencia.
 */

const { loadContext, EVALUATORS, discoverWorldTree } = require('../discovery/engine');

const USER_UID = 'plugin::users-permissions.user';
const PROGRESS_UID = 'api::event-progress.event-progress';
const ITEM_UID = 'api::item.item';
const ENTRY_UID = 'api::inventory-entry.inventory-entry';

/* ============ Evaluación de pasos (pura) ============ */

// ¿El paso está cumplido, dado el contexto de descubrimiento (ctx) y el estado
// de puzzle del progreso (state)?
function isStepDone(step, ctx, state) {
  if (!step || !step.type) return false;
  if (step.type === 'flag') {
    const flag = (step.params && step.params.flag) || step.key;
    return !!(state && state[flag]);
  }
  const evaluator = EVALUATORS[step.type];
  if (!evaluator) return false; // tipo desconocido ⇒ nunca se cumple
  return !!evaluator(step.params || {}, ctx, ctx.events).done;
}

// Evalúa los pasos en orden; corta en el primer pendiente.
function evaluateSteps(steps, ctx, state) {
  const completedKeys = [];
  for (const step of steps) {
    if (isStepDone(step, ctx, state)) completedKeys.push(step.key);
    else break;
  }
  return {
    completedKeys,
    currentStep: completedKeys.length,
    allDone: steps.length > 0 && completedKeys.length === steps.length,
  };
}

/* ============ Resolvers de pasos interactivos (POST step) ============
   Un resolver valida el payload de un paso y devuelve el parche a aplicar sobre
   `state`. Los puzzles de Deo (traducción, coordenadas, telescopio) agregarán
   sus resolvers acá en una fase posterior. Por defecto, un paso `flag` se marca
   como cumplido. */
const STEP_RESOLVERS = {
  flag(step /* , body, ctx */) {
    const flag = (step.params && step.params.flag) || step.key;
    return { ok: true, patch: { [flag]: true } };
  },
};

/* ============ Recompensas ============ */
async function grantRewards(strapi, userId, rewards) {
  const result = { coins: 0, items: [], discovery: null };
  if (!rewards || typeof rewards !== 'object') return result;

  if (rewards.coins) {
    const u = await strapi.entityService.findOne(USER_UID, userId, { fields: ['balance'] });
    await strapi.entityService.update(USER_UID, userId, {
      data: { balance: (u?.balance || 0) + rewards.coins },
    });
    result.coins = rewards.coins;
  }

  for (const it of rewards.items || []) {
    const qty = it.quantity || 1;
    let itemId = it.itemId ?? null;
    if (!itemId && it.name) {
      const [item] = await strapi.entityService.findMany(ITEM_UID, {
        filters: { name: it.name }, fields: ['id'], limit: 1,
      });
      itemId = item?.id ?? null;
    }
    if (!itemId) continue;
    const [entry] = await strapi.entityService.findMany(ENTRY_UID, {
      filters: { user: userId, item: itemId }, limit: 1,
    });
    if (entry) {
      await strapi.entityService.update(ENTRY_UID, entry.id, { data: { quantity: (entry.quantity || 0) + qty } });
    } else {
      await strapi.entityService.create(ENTRY_UID, { data: { user: userId, item: itemId, quantity: qty } });
    }
    result.items.push({ itemId, quantity: qty });
  }

  if (rewards.discoverWorld) {
    result.discovery = await discoverWorldTree(strapi, userId, rewards.discoverWorld);
  }

  return result;
}

/* ============ Progreso por usuario ============ */
async function getOrCreateProgress(strapi, userId, eventId) {
  const [existing] = await strapi.entityService.findMany(PROGRESS_UID, {
    filters: { user: userId, event: eventId }, limit: 1,
  });
  if (existing) return existing;
  return strapi.entityService.create(PROGRESS_UID, {
    data: {
      user: userId, event: eventId, currentStep: 0,
      completedSteps: [], state: {}, status: 'not_started', startedAt: new Date(),
    },
  });
}

// Vista para el front: el evento + el progreso del usuario con cada paso anotado.
function toView(event, progress, completedKeys, currentStep) {
  const steps = Array.isArray(event.steps) ? event.steps : [];
  const doneSet = new Set(completedKeys);
  return {
    eventId: event.id,
    name: event.Name,
    description: event.Description ?? null,
    active: !!event.active,
    startsAt: event.startsAt ?? null,
    status: progress.status,
    currentStep,
    total: steps.length,
    steps: steps.map((s, i) => ({
      key: s.key,
      label: s.label ?? null,
      type: s.type,
      done: doneSet.has(s.key),
      current: i === currentStep && !doneSet.has(s.key),
    })),
    state: progress.state || {},
  };
}

/**
 * Reevalúa el progreso de un usuario en un evento (lazy): recalcula pasos
 * completados desde su `state` + historial, avanza `currentStep`, y al completar
 * todo otorga `event.rewards` una sola vez. Devuelve { view, rewardsGranted }.
 */
async function resolveEvent(strapi, userId, event, ctx) {
  const context = ctx || (await loadContext(strapi, userId));
  const steps = Array.isArray(event.steps) ? event.steps : [];
  const progress = await getOrCreateProgress(strapi, userId, event.id);
  const state = progress.state || {};

  const { completedKeys, currentStep, allDone } = evaluateSteps(steps, context, state);

  const data = {
    completedSteps: completedKeys,
    currentStep,
    status: allDone ? 'completed' : completedKeys.length ? 'in_progress' : 'not_started',
  };

  let rewardsGranted = null;
  if (allDone && progress.status !== 'completed') {
    data.completedAt = new Date();
    rewardsGranted = await grantRewards(strapi, userId, event.rewards);
  }

  const updated = await strapi.entityService.update(PROGRESS_UID, progress.id, { data });
  return { view: toView(event, updated, completedKeys, currentStep), rewardsGranted };
}

module.exports = {
  resolveEvent,
  getOrCreateProgress,
  evaluateSteps,
  isStepDone,
  grantRewards,
  toView,
  STEP_RESOLVERS,
};
