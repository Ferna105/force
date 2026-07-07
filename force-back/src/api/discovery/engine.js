'use strict';

/**
 * Motor de descubrimiento.
 *
 * Descubre **monstruos** y, desde la Fase 0 del plan Deo, también **mundos,
 * regiones y lugares** ocultos (`Hidden: true`). Cada entidad descubrible puede
 * tener una `DiscoveryStrategy` (campo json):
 *   { ordered: boolean, tasks: [{ type, params, label }] }
 *
 * Una estrategia se cumple cuando todas sus tareas están completas. Las tareas
 * se evalúan contra el historial de eventos del usuario (`user-event`), su
 * inventario y los monstruos que ya descubrió. Si `ordered` es true, las tareas
 * deben completarse en secuencia temporal (cada una sobre eventos posteriores a
 * la anterior); si es false, cada tarea se evalúa sobre todo el historial.
 *
 * Visibilidad (gating): una entidad es visible para un usuario si NO es `Hidden`
 * o si está en su set descubierto, respetando la jerarquía world → region →
 * place (una región solo es visible si su mundo lo es; un lugar solo si su
 * región —de tenerla— y su mundo lo son). Lo resuelve `visibleFor`.
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
const REGION_UID = 'api::region.region';
const PLACE_UID = 'api::place.place';
const EVENT_UID = 'api::user-event.user-event';
const ENTRY_UID = 'api::inventory-entry.inventory-entry';
const ITEM_UID = 'api::item.item';

const EPOCH = new Date(0);

/* ============ Shape REST (para que el front consuma como una entidad Strapi) ============ */
const mediaToRest = (m) => (m ? { data: { id: m.id, attributes: m } } : null);

// Aplana una entidad y envuelve su campo de media (Image/Banner) en shape REST.
function entityToRest(entity, mediaField) {
  const { [mediaField]: media, ...rest } = entity;
  return { id: entity.id, attributes: { ...rest, [mediaField]: mediaToRest(media) } };
}
const monsterToRest = (m) => entityToRest(m, 'Image');
const worldToRest = (w) => entityToRest(w, 'Image');
const regionToRest = (r) => entityToRest(r, 'Banner');
const placeToRest = (p) => entityToRest(p, 'Banner');

/* ============ Helpers de matching ============ */
function nameEq(a, b) {
  return a != null && b != null && String(a).toLowerCase() === String(b).toLowerCase();
}

// Resuelve el mundo/lugar objetivo de un task a partir de sus params (id o nombre).
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
  const [worlds, regions, places, monsters, items, events, inventory] = await Promise.all([
    strapi.entityService.findMany(WORLD_UID, {
      fields: ['id', 'Name', 'Description', 'Hidden', 'DiscoveryStrategy'],
      populate: { Image: true },
      publicationState: 'live',
    }),
    strapi.entityService.findMany(REGION_UID, {
      fields: ['id', 'Name', 'Description', 'Biome', 'Hidden', 'DiscoveryStrategy'],
      populate: { World: { fields: ['id', 'Name'] }, Banner: true },
      publicationState: 'live',
    }),
    strapi.entityService.findMany(PLACE_UID, {
      fields: ['id', 'Name', 'Description', 'Type', 'Biome', 'Hidden', 'DiscoveryStrategy'],
      populate: { World: { fields: ['id', 'Name'] }, region: { fields: ['id'] }, Banner: true },
      publicationState: 'live',
    }),
    // Sin restringir `fields`: el motor necesita DiscoveryStrategy y el modal del
    // front muestra Nature/Origin/InnateAbility/Biome.
    strapi.entityService.findMany(MONSTER_UID, {
      populate: { Image: true },
      publicationState: 'live',
    }),
    // Catálogo de items, para resolver tareas que referencian un objeto por nombre
    // (own_item / buy_item con itemName). Los ids difieren entre entornos, así que
    // las estrategias usan nombres y acá los traducimos a id.
    strapi.entityService.findMany(ITEM_UID, { fields: ['id', 'name'], publicationState: 'live' }),
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
    populate: {
      discoveredMonsters: { fields: ['id'] },
      discoveredWorlds: { fields: ['id'] },
      discoveredRegions: { fields: ['id'] },
      discoveredPlaces: { fields: ['id'] },
    },
  });
  const discoveredIds = new Set((userWithDiscovered?.discoveredMonsters || []).map((m) => m.id));
  const discoveredWorldIds = new Set((userWithDiscovered?.discoveredWorlds || []).map((w) => w.id));
  const discoveredRegionIds = new Set((userWithDiscovered?.discoveredRegions || []).map((r) => r.id));
  const discoveredPlaceIds = new Set((userWithDiscovered?.discoveredPlaces || []).map((p) => p.id));

  const worldsByName = new Map(worlds.map((w) => [String(w.Name).toLowerCase(), w]));
  const placesByName = new Map(places.map((p) => [String(p.Name).toLowerCase(), p]));
  const monstersByName = new Map(monsters.map((m) => [String(m.Name).toLowerCase(), m]));
  const itemsByName = new Map(items.map((i) => [String(i.name).toLowerCase(), i]));

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
    worlds,
    regions,
    places,
    monsters,
    discoveredIds,
    discoveredWorldIds,
    discoveredRegionIds,
    discoveredPlaceIds,
    worldsByName,
    placesByName,
    monstersByName,
    itemsByName,
    placesByWorld,
    events: normEvents,
    inventory: normInventory,
    now: new Date(),
  };
}

/* ============ API pública del motor ============ */

// Evalúa las entidades Hidden aún no descubiertas de una lista y devuelve las que
// completaron su estrategia (para conectarlas al set del usuario).
function newlyCompleted(entities, discoveredSet, ctx) {
  const out = [];
  for (const e of entities) {
    if (!e.Hidden) continue;
    if (discoveredSet.has(e.id)) continue;
    const strategy = e.DiscoveryStrategy;
    if (!strategy || !Array.isArray(strategy.tasks) || !strategy.tasks.length) continue;
    if (evaluateStrategy(strategy, ctx).done) {
      out.push(e);
      discoveredSet.add(e.id);
    }
  }
  return out;
}

/**
 * Evalúa todas las estrategias para el usuario dado. Descubre (conecta) los
 * monstruos / mundos / regiones / lugares cuyas estrategias se completaron y
 * devuelve los recién descubiertos en shape REST listo para los modales.
 *
 * @returns {Promise<{ newlyDiscovered, newWorlds, newRegions, newPlaces }>}
 */
async function evaluateUser(strapi, userId) {
  const empty = { newlyDiscovered: [], newWorlds: [], newRegions: [], newPlaces: [] };
  if (!userId) return empty;

  const ctx = await loadContext(strapi, userId);

  // Monstruos (comportamiento original)
  const newMonsters = [];
  for (const monster of ctx.monsters) {
    if (ctx.discoveredIds.has(monster.id)) continue;
    const strategy = monster.DiscoveryStrategy;
    if (!strategy || !Array.isArray(strategy.tasks) || !strategy.tasks.length) continue;
    if (evaluateStrategy(strategy, ctx).done) {
      newMonsters.push(monster);
      ctx.discoveredIds.add(monster.id); // por si un prerequisito depende de él en la misma corrida
    }
  }

  // Mundos / regiones / lugares ocultos con estrategia
  const newWorlds = newlyCompleted(ctx.worlds, ctx.discoveredWorldIds, ctx);
  const newRegions = newlyCompleted(ctx.regions, ctx.discoveredRegionIds, ctx);
  const newPlaces = newlyCompleted(ctx.places, ctx.discoveredPlaceIds, ctx);

  const data = {};
  if (newMonsters.length) data.discoveredMonsters = { connect: newMonsters.map((m) => ({ id: m.id })) };
  if (newWorlds.length) data.discoveredWorlds = { connect: newWorlds.map((w) => ({ id: w.id })) };
  if (newRegions.length) data.discoveredRegions = { connect: newRegions.map((r) => ({ id: r.id })) };
  if (newPlaces.length) data.discoveredPlaces = { connect: newPlaces.map((p) => ({ id: p.id })) };
  if (Object.keys(data).length) {
    await strapi.entityService.update(USER_UID, userId, { data });
  }

  return {
    newlyDiscovered: newMonsters.map(monsterToRest),
    newWorlds: newWorlds.map(worldToRest),
    newRegions: newRegions.map(regionToRest),
    newPlaces: newPlaces.map(placeToRest),
  };
}

/**
 * Conjunto visible para el usuario (o anónimo si userId es null): ids de
 * mundos/regiones/lugares que NO son Hidden o que el usuario ya descubrió,
 * respetando la jerarquía world → region → place.
 *
 * @returns {Promise<{ worlds:number[], regions:number[], places:number[] }>}
 */
async function visibleFor(strapi, userId) {
  const [worlds, regions, places] = await Promise.all([
    strapi.entityService.findMany(WORLD_UID, { fields: ['id', 'Hidden'], publicationState: 'live' }),
    strapi.entityService.findMany(REGION_UID, {
      fields: ['id', 'Hidden'],
      populate: { World: { fields: ['id'] } },
      publicationState: 'live',
    }),
    strapi.entityService.findMany(PLACE_UID, {
      fields: ['id', 'Hidden'],
      populate: { World: { fields: ['id'] }, region: { fields: ['id'] } },
      publicationState: 'live',
    }),
  ]);

  let dW = new Set(), dR = new Set(), dP = new Set();
  if (userId) {
    const u = await strapi.entityService.findOne(USER_UID, userId, {
      populate: {
        discoveredWorlds: { fields: ['id'] },
        discoveredRegions: { fields: ['id'] },
        discoveredPlaces: { fields: ['id'] },
      },
    });
    dW = new Set((u?.discoveredWorlds || []).map((w) => w.id));
    dR = new Set((u?.discoveredRegions || []).map((r) => r.id));
    dP = new Set((u?.discoveredPlaces || []).map((p) => p.id));
  }

  const visibleWorlds = new Set(worlds.filter((w) => !w.Hidden || dW.has(w.id)).map((w) => w.id));
  const visibleRegions = new Set(
    regions
      .filter((r) => visibleWorlds.has(r.World?.id) && (!r.Hidden || dR.has(r.id)))
      .map((r) => r.id)
  );
  const visiblePlaces = places
    .filter((p) => {
      if (!visibleWorlds.has(p.World?.id)) return false;
      if (p.region?.id != null && !visibleRegions.has(p.region.id)) return false;
      return !p.Hidden || dP.has(p.id);
    })
    .map((p) => p.id);

  return {
    worlds: [...visibleWorlds],
    regions: [...visibleRegions],
    places: visiblePlaces,
  };
}

/**
 * Conecta un mundo Hidden + su región + sus lugares al set descubierto del
 * usuario, de una sola vez (recompensa de evento / desbloqueo directo). Devuelve
 * lo recién conectado en shape REST para los modales en cascada.
 *
 * @returns {Promise<{ world, regions, places } | null>}
 */
async function discoverWorldTree(strapi, userId, worldName) {
  if (!userId || !worldName) return null;
  const [world] = await strapi.entityService.findMany(WORLD_UID, {
    filters: { Name: worldName },
    fields: ['id', 'Name', 'Description', 'Hidden', 'DiscoveryStrategy'],
    populate: {
      Image: true,
      regions: { fields: ['id', 'Name', 'Description', 'Biome', 'Hidden'], populate: { Banner: true } },
      places: { fields: ['id', 'Name', 'Description', 'Type', 'Biome', 'Hidden'], populate: { Banner: true } },
    },
    publicationState: 'live',
    limit: 1,
  });
  if (!world) return null;

  const u = await strapi.entityService.findOne(USER_UID, userId, {
    populate: {
      discoveredWorlds: { fields: ['id'] },
      discoveredRegions: { fields: ['id'] },
      discoveredPlaces: { fields: ['id'] },
    },
  });
  const dW = new Set((u?.discoveredWorlds || []).map((w) => w.id));
  const dR = new Set((u?.discoveredRegions || []).map((r) => r.id));
  const dP = new Set((u?.discoveredPlaces || []).map((p) => p.id));

  const newRegions = (world.regions || []).filter((r) => !dR.has(r.id));
  const newPlaces = (world.places || []).filter((p) => !dP.has(p.id));
  const worldIsNew = !dW.has(world.id);

  const data = {};
  if (worldIsNew) data.discoveredWorlds = { connect: [{ id: world.id }] };
  if (newRegions.length) data.discoveredRegions = { connect: newRegions.map((r) => ({ id: r.id })) };
  if (newPlaces.length) data.discoveredPlaces = { connect: newPlaces.map((p) => ({ id: p.id })) };
  if (Object.keys(data).length) {
    await strapi.entityService.update(USER_UID, userId, { data });
  }

  return {
    world: worldIsNew ? worldToRest(world) : null,
    regions: newRegions.map(regionToRest),
    places: newPlaces.map(placeToRest),
  };
}

module.exports = {
  evaluateUser,
  evaluateStrategy,
  visibleFor,
  discoverWorldTree,
  // Reutilizados por el motor de eventos (event/engine.js):
  loadContext,
  EVALUATORS,
};
