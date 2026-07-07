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
const EVENT_UID = 'api::event.event';
const PLACE_UID = 'api::place.place';

// Drop aleatorio del questline de Deo: al visitar el lugar del drop, si el
// usuario llegó al paso `stepKey` del evento y no tiene el item, hay `chance` de
// que aparezca. Config declarativa (el evento se referencia por Name).
const CRYSTAL_DROP = {
  eventName: 'La luna del origen',
  stepKey: 'get_crystal',
  placeName: 'Dunas de Ceniza',
  itemName: 'Cristal blanco oxidado',
  chance: 0.4,
};

/* ============ Evaluación de pasos (pura) ============ */

// Nombre de la flag de estado que marca un paso interactivo como cumplido.
function flagKey(step) {
  return (step.params && step.params.flag) || step.key;
}

// ¿El paso está cumplido, dado el contexto de descubrimiento (ctx) y el estado
// de puzzle del progreso (state)? Los pasos interactivos (los que tienen un
// resolver: flag/answer/telescope) se cumplen por su flag en `state`; el resto
// son pasivos y se resuelven contra el historial/inventario (EVALUATORS).
function isStepDone(step, ctx, state) {
  if (!step || !step.type) return false;
  if (STEP_RESOLVERS[step.type]) {
    return !!(state && state[flagKey(step)]);
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
   Un resolver valida el payload de un paso y devuelve `{ ok, patch, error }`:
   `patch` se aplica sobre `state` cuando ok. Tipos:
   - `flag`      — marca el paso (interacción simple: botón/lectura).
   - `answer`    — valida `body.value` contra `params.answer` (normalizado:
                   sin acentos/mayúsculas/símbolos). Traducción de la nave y
                   coordenadas de viaje de Deo.
   - `telescope` — gate horario: `body.hour` (hora local del cliente) debe caer
                   en [params.fromHour, params.toHour). Telescopio ancestral. */

// Normaliza para comparar respuestas: sin acentos, minúsculas, solo alfanumérico.
function normAnswer(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

const STEP_RESOLVERS = {
  flag(step /* , body, ctx */) {
    return { ok: true, patch: { [flagKey(step)]: true } };
  },

  answer(step, body) {
    const expected = normAnswer(step.params && step.params.answer);
    const given = normAnswer(body && (body.value ?? body.answer));
    if (!expected || given !== expected) return { ok: false, error: 'La respuesta no es correcta.' };
    return { ok: true, patch: { [flagKey(step)]: true } };
  },

  telescope(step, body) {
    const from = Number(step.params?.fromHour ?? 21);
    const to = Number(step.params?.toHour ?? 23);
    const h = Number(body && body.hour);
    const inRange = Number.isFinite(h) && (from <= to ? h >= from && h < to : h >= from || h < to);
    if (!inRange) {
      return { ok: false, error: 'No es un buen momento para mirar al cielo. Volvé de noche (21–23 h).' };
    }
    // Revela las coordenadas en el estado para que la escena las muestre (el
    // jugador las anota y luego las tipea en la nave — paso `travel`).
    return { ok: true, patch: { [flagKey(step)]: true, coordinates: step.params?.coordinates ?? null } };
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
// - El `label` de un paso solo se revela si ya está cumplido: los pasos pendientes
//   se descubren jugando en el mundo, no se listan de antemano.
// - Las `rewards` solo se exponen al completar el evento (nada de spoilers).
function toView(event, progress, completedKeys, currentStep) {
  const steps = Array.isArray(event.steps) ? event.steps : [];
  const doneSet = new Set(completedKeys);
  const completed = progress.status === 'completed';
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
      label: doneSet.has(s.key) ? (s.label ?? null) : null,
      type: s.type,
      done: doneSet.has(s.key),
      current: i === currentStep && !doneSet.has(s.key),
    })),
    rewards: completed ? (event.rewards ?? null) : null,
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

/**
 * Drop del "Cristal blanco oxidado" del questline de Deo. Se llama al registrar
 * una visita (discovery controller). Otorga el cristal (prob. `chance`) solo si:
 * el lugar visitado es el del drop, el evento está activo, el usuario está
 * parado justo en el paso `get_crystal`, y todavía no tiene el cristal. Devuelve
 * `{ itemName }` si dropeó, o null.
 */
async function maybeDropCrystal(strapi, userId, placeId) {
  if (!userId || !placeId) return null;
  const place = await strapi.entityService.findOne(PLACE_UID, placeId, { fields: ['Name'] });
  if (!place || place.Name !== CRYSTAL_DROP.placeName) return null;

  const [event] = await strapi.entityService.findMany(EVENT_UID, {
    filters: { Name: CRYSTAL_DROP.eventName }, limit: 1,
  });
  if (!event || !event.active) return null;
  const steps = Array.isArray(event.steps) ? event.steps : [];
  const dropIdx = steps.findIndex((s) => s.key === CRYSTAL_DROP.stepKey);
  if (dropIdx < 0) return null;

  const ctx = await loadContext(strapi, userId);
  const progress = await getOrCreateProgress(strapi, userId, event.id);
  const { currentStep } = evaluateSteps(steps, ctx, progress.state || {});
  if (currentStep !== dropIdx) return null; // solo cuando get_crystal es el paso actual

  const [item] = await strapi.entityService.findMany(ITEM_UID, {
    filters: { name: CRYSTAL_DROP.itemName }, fields: ['id'], limit: 1,
  });
  if (!item) return null;
  const [entry] = await strapi.entityService.findMany(ENTRY_UID, {
    filters: { user: userId, item: item.id }, limit: 1,
  });
  if (entry && (entry.quantity || 0) > 0) return null; // ya lo tiene

  if (Math.random() > CRYSTAL_DROP.chance) return null; // no dropeó esta vez

  if (entry) {
    await strapi.entityService.update(ENTRY_UID, entry.id, { data: { quantity: (entry.quantity || 0) + 1 } });
  } else {
    await strapi.entityService.create(ENTRY_UID, { data: { user: userId, item: item.id, quantity: 1 } });
  }
  return { itemName: CRYSTAL_DROP.itemName };
}

module.exports = {
  resolveEvent,
  getOrCreateProgress,
  evaluateSteps,
  isStepDone,
  grantRewards,
  toView,
  maybeDropCrystal,
  STEP_RESOLVERS,
};
