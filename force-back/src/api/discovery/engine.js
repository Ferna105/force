'use strict';

/**
 * Motor de descubrimiento de monstruos.
 *
 * Cada monstruo puede tener una `DiscoveryStrategy` (campo json):
 *   { ordered: boolean, tasks: [{ type, params, label }] }
 *
 * Una estrategia se cumple cuando todas sus tareas están completas. Las tareas
 * se evalúan contra el historial de eventos del usuario (`user-event`), su
 * inventario y los monstruos que ya descubrió. Si `ordered` es true, las tareas
 * deben completarse en secuencia temporal (cada una sobre eventos posteriores a
 * la anterior); si es false, cada tarea se evalúa sobre todo el historial.
 *
 * Tipos de tarea soportados (params resueltos por nombre o id):
 *   - visit_place                { placeName | placeId }
 *   - play_place                 { placeName | placeId }
 *   - visit_all_places_in_world  { worldName | worldId }
 *   - play_in_world              { worldName | worldId }
 *   - buy_in_world               { worldName | worldId }
 *   - buy_item                   { itemName  | itemId }
 *   - own_item                   { itemName  | itemId }
 *   - own_item_of_rarity         { rarity }
 *   - own_item_of_type           { type }
 *   - enter_place_in_time_range  { placeName | placeId, fromHour, toHour }
 *   - discover_monster           { monsterName | monsterId }
 */

const USER_UID = 'plugin::users-permissions.user';
const MONSTER_UID = 'api::monster.monster';
const WORLD_UID = 'api::world.world';
const PLACE_UID = 'api::place.place';
const EVENT_UID = 'api::user-event.user-event';
const ENTRY_UID = 'api::inventory-entry.inventory-entry';

const EPOCH = new Date(0);

/* ============ Shape REST (para que el front consuma como un Monster) ============ */
const mediaToRest = (m) => (m ? { data: { id: m.id, attributes: m } } : null);

const monsterToRest = (m) => {
  const { Image, ...rest } = m;
  return { id: m.id, attributes: { ...rest, Image: mediaToRest(Image) } };
};

/* ============ Helpers de matching ============ */
// ¿La entidad referenciada por el task matchea esta entidad (por id o por nombre)?
function matchesById(entity, idParam) {
  return idParam != null && entity && entity.id === Number(idParam);
}
function nameEq(a, b) {
  return a != null && b != null && String(a).toLowerCase() === String(b).toLowerCase();
}

// Resuelve el mundo objetivo de un task a partir de sus params (id o nombre).
function resolveWorldId(params, worldsByName) {
  if (params.worldId != null) return Number(params.worldId);
  if (params.worldName) return worldsByName.get(String(params.worldName).toLowerCase())?.id ?? null;
  return null;
}
function resolvePlaceId(params, placesByName) {
  if (params.placeId != null) return Number(params.placeId);
  if (params.placeName) return placesByName.get(String(params.placeName).toLowerCase())?.id ?? null;
  return null;
}

/* ============ Evaluadores por tipo de tarea ============
   Cada evaluador recibe (params, ctx, events) donde `events` es la ventana de
   eventos visible (todo el historial si la estrategia no es ordenada, o solo
   los posteriores al cursor si lo es). Devuelve { done, completedAt, progress }.
   - completedAt: fecha en que la tarea quedó satisfecha (para encadenar orden);
     null si es por estado (inventario) y se considera "ahora".
   - progress: { current, total } opcional, para tareas acumulativas. */

function firstEventTime(events, predicate) {
  const match = events.filter(predicate);
  if (!match.length) return null;
  return match.reduce((min, e) => (e._date < min ? e._date : min), match[0]._date);
}

const EVALUATORS = {
  visit_place(params, ctx, events) {
    const placeId = resolvePlaceId(params, ctx.placesByName);
    const at = firstEventTime(events, (e) => e.type === 'visit_place' && e.placeId === placeId);
    return { done: at != null, completedAt: at };
  },

  play_place(params, ctx, events) {
    const placeId = resolvePlaceId(params, ctx.placesByName);
    const at = firstEventTime(events, (e) => e.type === 'play_place' && e.placeId === placeId);
    return { done: at != null, completedAt: at };
  },

  visit_all_places_in_world(params, ctx, events) {
    const worldId = resolveWorldId(params, ctx.worldsByName);
    const required = ctx.placesByWorld.get(worldId) ?? [];
    const total = required.length;
    const visited = new Set(
      events.filter((e) => e.type === 'visit_place' && e.worldId === worldId).map((e) => e.placeId)
    );
    const current = required.filter((pid) => visited.has(pid)).length;
    const done = total > 0 && current >= total;
    // completedAt = momento en que se visitó el último lugar pendiente (el que
    // completó el set), recorriendo las visitas a lugares del mundo en orden.
    let completedAt = null;
    if (done) {
      const seen = new Set();
      const ordered = events
        .filter((e) => e.type === 'visit_place' && required.includes(e.placeId))
        .sort((a, b) => a._date - b._date);
      for (const e of ordered) {
        seen.add(e.placeId);
        if (seen.size === total) { completedAt = e._date; break; }
      }
    }
    return { done, completedAt, progress: { current, total } };
  },

  play_in_world(params, ctx, events) {
    const worldId = resolveWorldId(params, ctx.worldsByName);
    const at = firstEventTime(events, (e) => e.type === 'play_place' && e.worldId === worldId);
    return { done: at != null, completedAt: at };
  },

  buy_in_world(params, ctx, events) {
    const worldId = resolveWorldId(params, ctx.worldsByName);
    const at = firstEventTime(events, (e) => e.type === 'buy_item' && e.worldId === worldId);
    return { done: at != null, completedAt: at };
  },

  buy_item(params, ctx, events) {
    const itemId = params.itemId != null
      ? Number(params.itemId)
      : ctx.itemsByName.get(String(params.itemName || '').toLowerCase())?.id ?? null;
    const at = firstEventTime(events, (e) => e.type === 'buy_item' && e.itemId === itemId);
    return { done: at != null, completedAt: at };
  },

  own_item(params, ctx) {
    const itemId = params.itemId != null
      ? Number(params.itemId)
      : ctx.itemsByName.get(String(params.itemName || '').toLowerCase())?.id ?? null;
    const done = ctx.inventory.some((e) => e.itemId === itemId && e.quantity > 0);
    return { done, completedAt: null };
  },

  own_item_of_rarity(params, ctx) {
    const rarity = String(params.rarity || '').toLowerCase();
    const done = ctx.inventory.some((e) => e.quantity > 0 && nameEq(e.rarity, rarity));
    return { done, completedAt: null };
  },

  own_item_of_type(params, ctx) {
    const type = String(params.type || '').toLowerCase();
    const done = ctx.inventory.some((e) => e.quantity > 0 && nameEq(e.itemType, type));
    return { done, completedAt: null };
  },

  enter_place_in_time_range(params, ctx, events) {
    const placeId = resolvePlaceId(params, ctx.placesByName);
    const from = Number(params.fromHour);
    const to = Number(params.toHour);
    // Rango que puede cruzar medianoche (p. ej. 22..6)
    const inRange = (h) => (from <= to ? h >= from && h < to : h >= from || h < to);
    const at = firstEventTime(
      events,
      (e) => e.type === 'visit_place' && e.placeId === placeId && inRange(e._date.getHours())
    );
    return { done: at != null, completedAt: at };
  },

  discover_monster(params, ctx) {
    const monsterId = params.monsterId != null
      ? Number(params.monsterId)
      : ctx.monstersByName.get(String(params.monsterName || '').toLowerCase())?.id ?? null;
    const done = monsterId != null && ctx.discoveredIds.has(monsterId);
    return { done, completedAt: null };
  },
};

/* ============ Evaluación de una estrategia completa ============ */
function evaluateStrategy(strategy, ctx) {
  const tasks = Array.isArray(strategy?.tasks) ? strategy.tasks : [];
  if (!tasks.length) return { done: false };

  const ordered = !!strategy.ordered;
  let cursor = EPOCH; // solo relevante en estrategias ordenadas

  for (const task of tasks) {
    const evaluator = EVALUATORS[task.type];
    if (!evaluator) return { done: false }; // tipo desconocido => nunca se cumple

    // Ventana de eventos visible para esta tarea
    const events = ordered ? ctx.events.filter((e) => e._date >= cursor) : ctx.events;
    const result = evaluator(task.params || {}, ctx, events);

    if (!result.done) return { done: false };

    // Solo avanzamos el cursor cuando la tarea tiene una fecha real de completitud
    // (tareas basadas en eventos). Las tareas por estado (p. ej. tener un objeto)
    // no tienen timestamp, así que no restringen la ventana de las siguientes.
    if (ordered && result.completedAt) {
      cursor = result.completedAt;
    }
  }

  return { done: true };
}

/* ============ Carga de contexto del usuario ============ */
async function loadContext(strapi, userId) {
  const [worlds, places, monsters, events, inventory] = await Promise.all([
    strapi.entityService.findMany(WORLD_UID, { fields: ['id', 'Name', 'Biome'], publicationState: 'live' }),
    strapi.entityService.findMany(PLACE_UID, {
      fields: ['id', 'Name'],
      populate: { World: { fields: ['id', 'Name'] } },
      publicationState: 'live',
    }),
    // Sin restringir `fields`: el motor necesita DiscoveryStrategy y el modal del
    // front muestra Nature/Origin/InnateAbility/Biome.
    strapi.entityService.findMany(MONSTER_UID, {
      populate: { Image: true },
      publicationState: 'live',
    }),
    strapi.entityService.findMany(EVENT_UID, {
      filters: { user: userId },
      populate: { place: { fields: ['id'] }, world: { fields: ['id'] }, item: { fields: ['id'] } },
      sort: { createdAt: 'asc' },
    }),
    strapi.entityService.findMany(ENTRY_UID, {
      filters: { user: userId },
      populate: { item: { fields: ['id', 'rarity', 'type'] } },
    }),
  ]);

  const userWithDiscovered = await strapi.entityService.findOne(USER_UID, userId, {
    populate: { discoveredMonsters: { fields: ['id'] } },
  });
  const discoveredIds = new Set((userWithDiscovered?.discoveredMonsters || []).map((m) => m.id));

  const worldsByName = new Map(worlds.map((w) => [String(w.Name).toLowerCase(), w]));
  const placesByName = new Map(places.map((p) => [String(p.Name).toLowerCase(), p]));
  const monstersByName = new Map(monsters.map((m) => [String(m.Name).toLowerCase(), m]));

  // Lugares por mundo (solo publicados)
  const placesByWorld = new Map();
  for (const p of places) {
    const wid = p.World?.id ?? null;
    if (wid == null) continue;
    if (!placesByWorld.has(wid)) placesByWorld.set(wid, []);
    placesByWorld.get(wid).push(p.id);
  }

  // Eventos normalizados con fecha parseada
  const normEvents = events.map((e) => ({
    type: e.type,
    placeId: e.place?.id ?? null,
    worldId: e.world?.id ?? null,
    itemId: e.item?.id ?? null,
    _date: new Date(e.createdAt),
  }));

  // Inventario normalizado
  const normInventory = inventory.map((e) => ({
    itemId: e.item?.id ?? null,
    quantity: e.quantity ?? 0,
    rarity: e.item?.rarity ?? null,
    itemType: e.item?.type ?? null,
  }));

  return {
    monsters,
    discoveredIds,
    worldsByName,
    placesByName,
    monstersByName,
    placesByWorld,
    events: normEvents,
    inventory: normInventory,
    now: new Date(),
  };
}

/* ============ API pública del motor ============ */

/**
 * Evalúa todas las estrategias para el usuario dado. Descubre (conecta) los
 * monstruos cuyas estrategias se completaron y devuelve los recién descubiertos
 * en shape REST listo para el modal del front.
 *
 * @returns {Promise<{ newlyDiscovered: Array }>}
 */
async function evaluateUser(strapi, userId) {
  if (!userId) return { newlyDiscovered: [] };

  const ctx = await loadContext(strapi, userId);
  const newly = [];

  for (const monster of ctx.monsters) {
    if (ctx.discoveredIds.has(monster.id)) continue;
    const strategy = monster.DiscoveryStrategy;
    if (!strategy || !Array.isArray(strategy.tasks) || !strategy.tasks.length) continue;

    const { done } = evaluateStrategy(strategy, ctx);
    if (done) {
      newly.push(monster);
      ctx.discoveredIds.add(monster.id); // por si un prerequisito depende de él en la misma corrida
    }
  }

  if (newly.length) {
    // Conectar los nuevos monstruos a la relación discoveredMonsters del usuario
    await strapi.entityService.update(USER_UID, userId, {
      data: { discoveredMonsters: { connect: newly.map((m) => ({ id: m.id })) } },
    });
  }

  return { newlyDiscovered: newly.map(monsterToRest) };
}

module.exports = { evaluateUser, evaluateStrategy };
