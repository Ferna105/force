'use strict';

/**
 * Seed idempotente del universo Force.
 * - Setea biomas (world/place/monster), hotspots y datos faltantes de items.
 * - Da de alta los permisos de los roles Public y Authenticated.
 * - Crea un usuario demo (nora@force.dev / force1234) con saldo, compañero
 *   activo, inventario y bestiario descubierto.
 *
 * Se ejecuta en bootstrap y es seguro re-ejecutarlo: solo crea lo que falta.
 */

const seedBibliotecaItems = require('../scripts/biblioteca/seed-items-core');

const WORLD_BIOME = { Eryndor: 'volcanic', Koril: 'forest', Deo: 'arid', Egea: 'space' };
const MONSTER_BIOME = { Tronc: 'forest', Serpi: 'aqua', Triso: 'volcanic', Raya: 'arid', Terri: 'space' };
const PLACE_BIOME = {
  'Verdant Hollow': 'forest',
  "Serpent's Rest Island": 'aqua',
  'Frostpeak Citadel': 'snow',
  'Obsidian Watchtower': 'volcanic',
};
const PLACE_HOTSPOT = {
  'Verdant Hollow': { x: 38, y: 42 },
  "Serpent's Rest Island": { x: 60, y: 55 },
  'Frostpeak Citadel': { x: 64, y: 30 },
  'Obsidian Watchtower': { x: 36, y: 62 },
};
// Datos plausibles para items (solo se aplican si faltan)
const ITEM_DATA = {
  'Soft Wooden Chair': { rarity: 'legendary', value: 1480, type: 'misc' },
  'Sleek Cotton Sausages': { rarity: 'epic', value: 640, type: 'consumable', is_stackable: true, max_stack: 20, usable: true, cooldown: 30 },
  'Fanstastic Plastic Towels': { rarity: 'rare', value: 210, type: 'misc' },
  'Bespoke Rubber Gloves': { rarity: 'uncommon', value: 95, type: 'armor' },
  'Moder Granite Table': { rarity: 'common', value: 40, type: 'misc' },
};

const PUBLIC_ACTIONS = [
  'api::world.world.find', 'api::world.world.findOne',
  'api::place.place.find', 'api::place.place.findOne',
  'api::monster.monster.find', 'api::monster.monster.findOne',
  'api::item.item.find', 'api::item.item.findOne',
];
const AUTH_ACTIONS = [
  ...PUBLIC_ACTIONS,
  // Endpoints "mine" scopeados al usuario autenticado (las relaciones a
  // users-permissions.user no se pueden filtrar por el content API).
  'api::inventory-entry.inventory-entry.mine',
  'api::companion.companion.mine',
  'api::companion.companion.feed', 'api::companion.companion.play', 'api::companion.companion.pet',
  'api::shop.shop.buy',
  // Motor de descubrimiento: registrar eventos + reevaluar estrategias.
  'api::discovery.discovery.event',
  'api::discovery.discovery.sync',
  'plugin::users-permissions.user.me',
];

async function enablePermissions(strapi, roleType, actions) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: roleType } });
  if (!role) return;
  for (const action of actions) {
    const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({ where: { action, role: role.id } });
    if (!existing) {
      await strapi.db.query('plugin::users-permissions.permission').create({ data: { action, role: role.id } });
    }
  }
}

// Hotspot determinístico para lugares sin coords explícitas
function fallbackHotspot(id) {
  return { x: 30 + ((id * 37) % 40), y: 30 + ((id * 53) % 40) };
}

/**
 * Estrategias de descubrimiento explícitas por nombre de monstruo (datos demo).
 * Diseñadas para ser completables por un usuario recién registrado (saldo 500 F)
 * sin depender del tipo de cada lugar: usan visitas (cualquier lugar sirve) y la
 * tenencia / compra de objetos baratos. Ejercitan estrategias ordenadas y sin
 * orden, y varios tipos de tarea. Ver la tabla de tipos en CLAUDE.md.
 */
const MONSTER_STRATEGIES = {
  // Ordenada: hay que visitar los dos lugares EN ESTE ORDEN.
  Tronc: {
    ordered: true,
    tasks: [
      { type: 'visit_place', params: { placeName: 'Verdant Hollow' }, label: 'Primero adentrate en Verdant Hollow' },
      { type: 'visit_place', params: { placeName: 'Obsidian Watchtower' }, label: 'Después subí a la Obsidian Watchtower' },
    ],
  },
  // Sin orden: visitar su isla + tener cualquier objeto misceláneo en el inventario.
  Serpi: {
    ordered: false,
    tasks: [
      { type: 'visit_place', params: { placeName: "Serpent's Rest Island" }, label: 'Visitá Serpent’s Rest Island' },
      { type: 'own_item_of_type', params: { type: 'misc' }, label: 'Tené un objeto misceláneo (p. ej. Moder Granite Table, 40 F)' },
    ],
  },
  // Sin orden: visitar la ciudadela + tener un objeto poco común.
  Triso: {
    ordered: false,
    tasks: [
      { type: 'visit_place', params: { placeName: 'Frostpeak Citadel' }, label: 'Explorá la Frostpeak Citadel' },
      { type: 'own_item_of_rarity', params: { rarity: 'uncommon' }, label: 'Conseguí un objeto poco común (Bespoke Rubber Gloves, 95 F)' },
    ],
  },
  // Una sola tarea: comprar un objeto puntual (en cualquier tienda).
  Raya: {
    ordered: false,
    tasks: [
      { type: 'buy_item', params: { itemName: 'Moder Granite Table' }, label: 'Comprá una Moder Granite Table' },
    ],
  },
  // Sin orden: tener un objeto raro + visitar la torre.
  Terri: {
    ordered: false,
    tasks: [
      { type: 'own_item_of_rarity', params: { rarity: 'rare' }, label: 'Conseguí un objeto raro (Fanstastic Plastic Towels, 210 F)' },
      { type: 'visit_place', params: { placeName: 'Obsidian Watchtower' }, label: 'Asomate a la Obsidian Watchtower' },
    ],
  },
};

/**
 * Fallback genérico para monstruos sin estrategia explícita: ancla 2–3 tareas a
 * un mundo con lugares (preferentemente del mismo bioma). Devuelve null si no hay
 * ningún mundo con lugares.
 */
function buildGenericStrategy(monster, worldsWithCounts, idx) {
  const withPlaces = worldsWithCounts.filter((w) => w.placeCount > 0);
  if (!withPlaces.length) return null;
  const biomeMatch = monster.Biome
    ? withPlaces.find((w) => WORLD_BIOME[w.Name] === monster.Biome)
    : null;
  const home = biomeMatch || withPlaces[idx % withPlaces.length];
  return {
    ordered: idx % 2 === 0,
    tasks: [
      { type: 'visit_all_places_in_world', params: { worldName: home.Name }, label: `Recorré todos los lugares de ${home.Name}` },
      { type: 'play_in_world', params: { worldName: home.Name }, label: `Jugá al menos una vez en ${home.Name}` },
      { type: 'buy_in_world', params: { worldName: home.Name }, label: `Comprá un objeto en una tienda de ${home.Name}` },
    ],
  };
}

// Estrategia a sembrar para un monstruo: explícita por nombre, o genérica.
function buildDiscoveryStrategy(monster, worldsWithCounts, idx) {
  const strategy = MONSTER_STRATEGIES[monster.Name] || buildGenericStrategy(monster, worldsWithCounts, idx);
  if (!strategy) return null;
  // Marca para distinguir lo sembrado de una edición manual del admin: el seed
  // refresca lo que tenga seeded:true pero nunca pisa una estrategia editada a mano.
  return { ...strategy, seeded: true };
}

module.exports = async function seed({ strapi }) {
  try {
    // 1) Permisos
    await enablePermissions(strapi, 'public', PUBLIC_ACTIONS);
    await enablePermissions(strapi, 'authenticated', AUTH_ACTIONS);

    // 2) Biomas de mundos
    const worlds = await strapi.db.query('api::world.world').findMany({});
    for (const w of worlds) {
      const biome = WORLD_BIOME[w.Name];
      if (biome && w.Biome !== biome) {
        await strapi.db.query('api::world.world').update({ where: { id: w.id }, data: { Biome: biome } });
      }
    }

    // 3) Biomas de monstruos
    const monsters = await strapi.db.query('api::monster.monster').findMany({});
    for (const m of monsters) {
      const biome = MONSTER_BIOME[m.Name];
      if (biome && m.Biome !== biome) {
        await strapi.db.query('api::monster.monster').update({ where: { id: m.id }, data: { Biome: biome } });
      }
    }

    // 4) Biomas + hotspots de lugares
    const places = await strapi.db.query('api::place.place').findMany({ populate: { World: true } });
    for (const p of places) {
      const biome = PLACE_BIOME[p.Name] || WORLD_BIOME[p.World?.Name] || null;
      const hs = PLACE_HOTSPOT[p.Name] || fallbackHotspot(p.id);
      const data = {};
      if (biome && p.Biome !== biome) data.Biome = biome;
      if (p.HotspotX == null) data.HotspotX = hs.x;
      if (p.HotspotY == null) data.HotspotY = hs.y;
      if (Object.keys(data).length) {
        await strapi.db.query('api::place.place').update({ where: { id: p.id }, data });
      }
    }

    // 5) Completar datos de items faltantes
    const items = await strapi.db.query('api::item.item').findMany({});
    for (const it of items) {
      const d = ITEM_DATA[it.name];
      if (!d) continue;
      const data = {};
      if (!it.rarity) data.rarity = d.rarity;
      if (it.value == null || it.value === 0) data.value = d.value;
      if (!it.type) data.type = d.type;
      if (d.is_stackable && !it.is_stackable) { data.is_stackable = true; data.max_stack = d.max_stack; }
      if (d.usable && !it.usable) { data.usable = true; data.cooldown = d.cooldown; }
      if (Object.keys(data).length) {
        await strapi.db.query('api::item.item').update({ where: { id: it.id }, data });
      }
    }

    // 5b) Catálogo "Biblioteca de objetos": crea los items que falten (con su
    //     imagen subida vía el plugin de upload). Idempotente: saltea existentes.
    //     Se puede desactivar con SEED_BIBLIOTECA=false.
    if (process.env.SEED_BIBLIOTECA !== 'false') {
      await seedBibliotecaItems(strapi);
    }

    // 6) Usuario demo
    let demo = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { email: 'nora@force.dev' } });
    if (!demo) {
      const authRole = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
      demo = await strapi.plugin('users-permissions').service('user').add({
        username: 'nora',
        email: 'nora@force.dev',
        password: 'force1234',
        confirmed: true,
        blocked: false,
        provider: 'local',
        role: authRole?.id,
      });
      // Saldo de demo acorde al diseño (1.480 F)
      await strapi.db.query('plugin::users-permissions.user').update({ where: { id: demo.id }, data: { balance: 1480 } });
      demo.balance = 1480;
      strapi.log.info('[seed] Usuario demo creado: nora@force.dev / force1234');
    }

    // 7) Saldo para todos los usuarios sin balance
    const allUsers = await strapi.db.query('plugin::users-permissions.user').findMany({});
    for (const u of allUsers) {
      if (u.balance == null) {
        await strapi.db.query('plugin::users-permissions.user').update({ where: { id: u.id }, data: { balance: 1480 } });
      }
    }

    // 8) Bestiario descubierto del demo (si está vacío)
    if (monsters.length) {
      const fresh = await strapi.entityService.findOne('plugin::users-permissions.user', demo.id, { populate: ['discoveredMonsters'] });
      if (!fresh.discoveredMonsters || fresh.discoveredMonsters.length === 0) {
        await strapi.entityService.update('plugin::users-permissions.user', demo.id, {
          data: { discoveredMonsters: monsters.map((m) => m.id) },
        });
      }
    }

    // 9) Compañero activo del demo (si no tiene); dedupe si quedaron de más
    const companions = await strapi.db.query('api::companion.companion').findMany({ where: { user: { id: demo.id } } });
    if (companions.length === 0 && monsters.length) {
      const tronc = monsters.find((m) => m.Name === 'Tronc') || monsters[0];
      await strapi.entityService.create('api::companion.companion', {
        data: { user: demo.id, monster: tronc.id, happiness: 82, energy: 64, bond: 45, isActive: true, lastInteraction: new Date().toISOString() },
      });
    } else if (companions.length > 1) {
      for (const extra of companions.slice(1)) {
        await strapi.db.query('api::companion.companion').delete({ where: { id: extra.id } });
      }
    }

    // 10) Inventario del demo (si está vacío)
    const invCount = await strapi.db.query('api::inventory-entry.inventory-entry').count({ where: { user: { id: demo.id } } });
    if (invCount === 0 && items.length) {
      const qty = [1, 3, 5, 2, 1];
      for (const [i, it] of items.slice(0, 5).entries()) {
        await strapi.entityService.create('api::inventory-entry.inventory-entry', {
          data: { user: demo.id, item: it.id, quantity: qty[i] || 1 },
        });
      }
    }

    // 11) Estrategias de descubrimiento para TODOS los monstruos.
    //     Se reconsultan para leer DiscoveryStrategy/Biome actuales.
    //     Se (re)siembra cuando el monstruo no tiene estrategia o cuando la que
    //     tiene fue puesta por el seed (seeded:true) — así un re-deploy actualiza
    //     los ejemplos sin pisar nunca una estrategia editada a mano en el admin.
    //     RESEED_STRATEGIES=true fuerza el re-sembrado aunque haya edición manual.
    const forceReseed = process.env.RESEED_STRATEGIES === 'true';
    const monstersFull = await strapi.db.query('api::monster.monster').findMany({});
    const placeCountByWorld = {};
    for (const p of places) {
      const wname = p.World?.Name;
      if (wname) placeCountByWorld[wname] = (placeCountByWorld[wname] || 0) + 1;
    }
    const worldsWithCounts = worlds.map((w) => ({ Name: w.Name, placeCount: placeCountByWorld[w.Name] || 0 }));
    let idx = 0;
    let seededCount = 0;
    for (const m of monstersFull) {
      const current = m.DiscoveryStrategy;
      const hasTasks = current && Array.isArray(current.tasks) && current.tasks.length;
      const isManual = hasTasks && current.seeded !== true;
      if (isManual && !forceReseed) continue; // respetar ediciones manuales
      const strategy = buildDiscoveryStrategy(m, worldsWithCounts, idx++);
      if (strategy) {
        await strapi.db.query('api::monster.monster').update({ where: { id: m.id }, data: { DiscoveryStrategy: strategy } });
        seededCount += 1;
      }
    }
    strapi.log.info(`[seed] Estrategias de descubrimiento sembradas: ${seededCount}`);

    strapi.log.info('[seed] Force seed completado ✓');
  } catch (err) {
    strapi.log.error(`[seed] Falló el seed de Force: ${err.message}`);
  }
};
