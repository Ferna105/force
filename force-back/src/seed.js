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

const fs = require('fs');
const path = require('path');

const seedBibliotecaItems = require('../scripts/biblioteca/seed-items-core');
const BIBLIOTECA_ITEMS = require('../scripts/biblioteca/items.json');
const { restockDueShops } = require('./api/shop/stock');
const { statCap } = require('./api/training/engine');

// Mapa nombre→category del catálogo, para backfillear items ya creados sin categoría.
const ITEM_CATEGORY = Object.fromEntries(
  BIBLIOTECA_ITEMS.filter((i) => i.category).map((i) => [i.name, i.category])
);

// Config de tienda por nombre de lugar: qué objetos vende cada una.
// `seeded:true` marca lo sembrado para no pisar una edición manual del admin.
const SHOP_CONFIGS = {
  // Mercado de fruta del valle fértil: solo fruta.
  'Cañada Verdante': { categories: ['fruit'] },
  // Mercado isleño: pescados/mariscos, fruta y verdura, baratijas (tótems) y pociones.
  'Isla del Reposo de la Serpiente': { categories: ['seafood', 'fruit', 'vegetable', 'totem', 'potion'] },
};
// Config genérica para cualquier otra tienda sin entrada explícita (vende de todo).
const GENERIC_SHOP_CONFIG = {};

// Lugares que el seed convierte en battledome (arena de duelos por turnos).
const BATTLEDOME_PLACES = new Set(['Atalaya de Obsidiana']);

// Escuelas de entrenamiento de Eryndor (places de Type 'training') + sus entrenadores.
// Todas enseñan todas las disciplinas; lo que varía es la especialidad del entrenador
// (+2 en vez de +1). Se crean idempotentes (find-or-create por nombre / por place), en
// local y prod. Entre las tres cubren las 4 stats de combate.
const TRAINING_SCHOOLS = [
  {
    place: {
      name: 'Fragua de los Maestros',
      description: 'En lo más hondo de Eryndor, entre yunques al rojo vivo, los maestros forjan no metal sino criaturas. Pagá con un tótem y dejá que el fuego temple a tu compañero.',
      hotspot: { x: 52, y: 40 },
    },
    trainer: { name: 'Maestro Pyros', specialties: ['strength', 'defense'], image: 'maestro-pyros.png' },
  },
  {
    place: {
      name: 'Foso de Escamas',
      description: 'Un pozo de roca volcánica donde la Maestra Víbora enseña el arte del golpe veloz. Quien entrena acá aprende a atacar antes de ser visto.',
      hotspot: { x: 43, y: 58 },
    },
    trainer: { name: 'Maestra Víbora', specialties: ['speed', 'strength'], image: 'maestra-vibora.png' },
  },
  {
    place: {
      name: 'Santuario del Limo',
      description: 'Entre vapores tibios y musgo ardiente, el Maestro Babo predica la paciencia: aguantar todo lo que el rival tenga para dar, y seguir en pie.',
      hotspot: { x: 64, y: 47 },
    },
    trainer: { name: 'Maestro Babo', specialties: ['defense', 'health'], image: 'maestro-babo.png' },
  },
];
const TRAINER_ASSETS_DIR = path.join(__dirname, '..', 'scripts', 'assets');

// Sube la imagen de un entrenador a la media library (mismo patrón que el seed de items).
async function uploadTrainerImage(strapi, image, altName) {
  const filePath = path.join(TRAINER_ASSETS_DIR, image);
  const stats = fs.statSync(filePath);
  const [uploaded] = await strapi.plugin('upload').service('upload').upload({
    data: { fileInfo: { name: image, alternativeText: altName, caption: altName } },
    files: { name: image, type: 'image/png', size: stats.size, path: filePath },
  });
  return uploaded;
}

// Pociones de curación del battledome (campo `heal` en item). Se crean si faltan
// (idempotente por nombre) y se venden en la tienda isleña (categoría `potion`).
const POTIONS = [
  { name: 'Poción Menor', rarity: 'common', value: 60, heal: 40 },
  { name: 'Poción de Vida', rarity: 'uncommon', value: 140, heal: 80 },
  { name: 'Poción Mayor', rarity: 'rare', value: 280, heal: 140 },
  { name: 'Elixir Curativo', rarity: 'epic', value: 520, heal: 220 },
  { name: 'Elixir Divino', rarity: 'legendary', value: 1000, heal: 400 },
];

// Slug kebab-case a partir del nombre (sin acentos), para el uid del item.
function slugify(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const WORLD_BIOME = { Eryndor: 'volcanic', Koril: 'forest', Deo: 'arid', Egea: 'space' };
const MONSTER_BIOME = { Tronc: 'forest', Serpi: 'aqua', Triso: 'volcanic', Raya: 'arid', Terri: 'space' };

// Qué mini-juego corre cada place de tipo `game` (su GameKey, clave en GAMES del
// motor). Se completa SOLO si está vacío (no pisa una asignación hecha a mano en
// el admin). Los demás places `game` sin entrada caen al `template`.
const GAME_KEYS = { 'Los Ojos de Deo': 'deo', 'Torres de la Cordillera': 'torres' };

// Dificultad declarativa de cada place `game` (chip informativa en la ficha).
// Se completa SOLO si está vacía (no pisa una edición del admin). Sin entrada ⇒
// queda null y el front muestra «—».
const GAME_DIFFICULTY = { 'Los Ojos de Deo': 'hard', 'Torres de la Cordillera': 'medium' };

// Stats base de progresión/combate por especie. NINGÚN stat base supera 10 (la
// escuela de entrenamiento usa un tope de 2×nivel, así que los stats arrancan bajos
// y crecen entrenando). Se reparte por arquetipo de bioma para que estén equilibrados.
// Se backfillean / clampean a ≤10 en el seed (ver paso 3).
const MONSTER_BASE_STATS = {
  Tronc: { BaseHealth: 10, BaseStrength: 5, BaseDefense: 8, BaseSpeed: 3, BaseLuck: 4, BaseLevel: 1 }, // tanque
  Serpi: { BaseHealth: 8, BaseStrength: 5, BaseDefense: 4, BaseSpeed: 9, BaseLuck: 4, BaseLevel: 1 }, // ágil
  Triso: { BaseHealth: 9, BaseStrength: 9, BaseDefense: 5, BaseSpeed: 4, BaseLuck: 4, BaseLevel: 1 }, // ofensivo
  Raya: { BaseHealth: 8, BaseStrength: 6, BaseDefense: 6, BaseSpeed: 6, BaseLuck: 7, BaseLevel: 1 }, // equilibrado/afortunado
  Terri: { BaseHealth: 7, BaseStrength: 6, BaseDefense: 3, BaseSpeed: 9, BaseLuck: 6, BaseLevel: 1 }, // veloz frágil
};
// Arquetipo por bioma para monstruos sin entrada explícita en MONSTER_BASE_STATS.
// Mismo criterio (todo ≤10) que los anclas a medida, del que cada bioma deriva su
// sabor — así dos monstruos del mismo bioma comparten arquetipo.
const BIOME_BASE_STATS = {
  forest: { BaseHealth: 10, BaseStrength: 5, BaseDefense: 8, BaseSpeed: 3, BaseLuck: 4, BaseLevel: 1 }, // tanque (cf. Tronc)
  aqua: { BaseHealth: 8, BaseStrength: 5, BaseDefense: 4, BaseSpeed: 9, BaseLuck: 4, BaseLevel: 1 }, // ágil (cf. Serpi)
  volcanic: { BaseHealth: 9, BaseStrength: 9, BaseDefense: 5, BaseSpeed: 4, BaseLuck: 4, BaseLevel: 1 }, // ofensivo (cf. Triso)
  arid: { BaseHealth: 8, BaseStrength: 6, BaseDefense: 6, BaseSpeed: 6, BaseLuck: 7, BaseLevel: 1 }, // equilibrado/afortunado (cf. Raya)
  space: { BaseHealth: 7, BaseStrength: 6, BaseDefense: 3, BaseSpeed: 9, BaseLuck: 6, BaseLevel: 1 }, // veloz frágil (cf. Terri)
  snow: { BaseHealth: 9, BaseStrength: 5, BaseDefense: 8, BaseSpeed: 4, BaseLuck: 4, BaseLevel: 1 }, // defensivo/resistente
};
// Genérico final para monstruos sin entrada a medida y sin bioma (equilibrado, ≤10).
const GENERIC_BASE_STATS = { BaseHealth: 8, BaseStrength: 6, BaseDefense: 6, BaseSpeed: 6, BaseLuck: 5, BaseLevel: 1 };
const PLACE_BIOME = {
  'Cañada Verdante': 'forest',
  'Isla del Reposo de la Serpiente': 'aqua',
  'Ciudadela de la Cumbre Helada': 'snow',
  'Atalaya de Obsidiana': 'volcanic',
};
const PLACE_HOTSPOT = {
  'Cañada Verdante': { x: 38, y: 42 },
  'Isla del Reposo de la Serpiente': { x: 60, y: 55 },
  'Ciudadela de la Cumbre Helada': { x: 64, y: 30 },
  'Atalaya de Obsidiana': { x: 36, y: 62 },
};
// Datos plausibles para items (solo se aplican si faltan)
const ITEM_DATA = {
  'Soft Wooden Chair': { rarity: 'legendary', value: 1480, type: 'misc' },
  'Sleek Cotton Sausages': { rarity: 'epic', value: 640, type: 'consumable', is_stackable: true, max_stack: 20, usable: true, cooldown: 30 },
  'Fanstastic Plastic Towels': { rarity: 'rare', value: 210, type: 'misc' },
  'Bespoke Rubber Gloves': { rarity: 'uncommon', value: 95, type: 'armor' },
  'Moder Granite Table': { rarity: 'common', value: 40, type: 'misc' },
};

// Ataque/Defensa de equipamiento por familia × rareza. La familia se deriva de
// `category` (con fallback a `type`): armas (espadas) pegan, armaduras (escudos,
// yelmos, guantes, chalecos, corazas) aguantan, tótems dan un buff balanceado.
// Los alimentos / el resto quedan en 0/0.
//
// ESCALA: acorde a los stats base ≤10 y a los topes de la escuela (str/def/spd hasta
// 2×nivel, salud hasta 4×nivel). El bono de un objeto es modesto (máx +7) para que
// COMPLEMENTE a los stats entrenados sin reemplazarlos: pesa fuerte temprano/mitad de
// juego y se diluye en niveles altos (donde los stats entrenados son mucho mayores).
// Hasta 5 objetos equipados, así que el total razonable de una build es ~+10/+15.
const EQUIP_STATS = {
  weapon: {
    common: { attack: 1, defense: 0 },
    uncommon: { attack: 2, defense: 0 },
    rare: { attack: 3, defense: 0 },
    epic: { attack: 5, defense: 0 },
    legendary: { attack: 7, defense: 0 },
  },
  armor: {
    common: { attack: 0, defense: 1 },
    uncommon: { attack: 0, defense: 2 },
    rare: { attack: 0, defense: 3 },
    epic: { attack: 0, defense: 5 },
    legendary: { attack: 0, defense: 7 },
  },
  totem: {
    common: { attack: 1, defense: 1 },
    uncommon: { attack: 1, defense: 1 },
    rare: { attack: 2, defense: 2 },
    epic: { attack: 3, defense: 3 },
    legendary: { attack: 4, defense: 4 },
  },
};

// Familia de equipamiento de un item (o null si no es equipable: comida, etc.).
function equipFamily(item) {
  const cat = item.category;
  if (cat === 'weapon' || cat === 'armor' || cat === 'totem') return cat;
  // Fallback por tipo para items sin categoría cargada.
  if (item.type === 'weapon') return 'weapon';
  if (item.type === 'armor') return 'armor';
  return null;
}

// Ataque/Defensa deseados de un item según su familia y rareza (0/0 si no aplica).
function equipStatsFor(item) {
  const fam = equipFamily(item);
  if (!fam) return { attack: 0, defense: 0 };
  return EQUIP_STATS[fam]?.[item.rarity] || { attack: 0, defense: 0 };
}

const PUBLIC_ACTIONS = [
  'api::world.world.find', 'api::world.world.findOne',
  'api::place.place.find', 'api::place.place.findOne',
  'api::monster.monster.find', 'api::monster.monster.findOne',
  'api::item.item.find', 'api::item.item.findOne',
  // Stock de una tienda (solo lectura): visible sin sesión.
  'api::shop.shop.stock',
  // Tabla de récords de un juego (solo lectura): visible sin sesión.
  'api::game.game.leaderboard',
];
const AUTH_ACTIONS = [
  ...PUBLIC_ACTIONS,
  // Endpoints "mine" scopeados al usuario autenticado (las relaciones a
  // users-permissions.user no se pueden filtrar por el content API).
  'api::inventory-entry.inventory-entry.mine',
  'api::companion.companion.mine',
  'api::companion.companion.adopt',
  'api::companion.companion.feed', 'api::companion.companion.play', 'api::companion.companion.pet',
  'api::companion.companion.equip', 'api::companion.companion.unequip',
  'api::companion.companion.heal',
  'api::shop.shop.buy',
  // Battledome: lobby de duelos (el combate en vivo va por sockets).
  'api::battle.battle.duels',
  'api::battle.battle.create',
  'api::battle.battle.join',
  'api::battle.battle.cancel',
  'api::battle.battle.get',
  // Motor de descubrimiento: registrar eventos + reevaluar estrategias.
  'api::discovery.discovery.event',
  'api::discovery.discovery.sync',
  // Motor de juegos: estado (cooldown) + reclamo de recompensas.
  'api::game.game.status',
  'api::game.game.claim',
  // Escuela de entrenamiento: estado + iniciar entrenamiento.
  'api::training.training.info',
  'api::training.training.start',
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
 * Estrategias de descubrimiento por monstruo — UNA por especie, temática y única.
 *
 * Cada estrategia está pensada a partir del carácter del monstruo (su bioma, su
 * nombre y su "hogar" en el mapa) para que ningún monstruo se descubra igual que
 * otro: distintos lugares, distinto verbo (visitar/jugar/entrar a tal hora),
 * distinta combinación de objetos y mezcla de ordenadas / sin orden.
 *
 * Reglas de diseño:
 *  - Referencian entidades **por nombre** (no por id): los ids difieren entre la
 *    base local y la de prod, los nombres no. El motor los resuelve por nombre.
 *  - Completables por un usuario nuevo con poco saldo: los objetos pedidos son
 *    baratos (armas/armaduras de hierro 45–90 F, alimentos 15–45 F, Tótem Alfa 120 F)
 *    y se consiguen en las tiendas del mapa.
 *  - Mapa de referencia (bioma → mundo / lugares):
 *      volcanic → Eryndor: Grieta de Brasas, Lago Susurrante, Dunas de Ceniza
 *      forest   → Koril:   Torres de la Cordillera, Crateres Dorados, Mercado Bioluminiscente, …
 *      arid     → Deo,  space → Egea: El Corazon Ardiente, Templos de Obsidiana, Cavernas Cristalizadas
 *      aqua     → Isla del Reposo de la Serpiente (único lugar acuático)
 *      snow     → Ciudadela de la Cumbre Helada
 * Ver la tabla de tipos de tarea en CLAUDE.md.
 */
const MONSTER_STRATEGIES = {
  // — Volcánicos (Eryndor) —
  // Arqui: herrero de las brasas. Ordenada: encender las brasas, reflejarse en el
  // lago y forjar un arma.
  Arqui: {
    ordered: true,
    tasks: [
      { type: 'play_place', params: { placeName: 'Grieta de Brasas' }, label: 'Despertá las brasas jugando en la Grieta de Brasas' },
      { type: 'visit_place', params: { placeName: 'Lago Susurrante' }, label: 'Dejá que el Lago Susurrante refleje tu fuego' },
      { type: 'own_item_of_type', params: { type: 'weapon' }, label: 'Y forjá un arma digna de un herrero volcánico' },
    ],
  },
  // Triso: pura ofensiva. Sin orden: furia en las dunas + un objeto poco común.
  Triso: {
    ordered: false,
    tasks: [
      { type: 'play_place', params: { placeName: 'Dunas de Ceniza' }, label: 'Desatá tu furia jugando en las Dunas de Ceniza' },
      { type: 'own_item_of_rarity', params: { rarity: 'uncommon' }, label: 'Y tené un objeto poco común en tu inventario' },
    ],
  },

  // — De bosque (Koril) —
  // Bul: mole tranquila. Sin orden: recorrer todo Koril + ponerse una armadura.
  Bul: {
    ordered: false,
    tasks: [
      { type: 'visit_all_places_in_world', params: { worldName: 'Koril' }, label: 'Recorré cada rincón del bosque de Koril' },
      { type: 'own_item_of_type', params: { type: 'armor' }, label: 'Y cubrí tu mole con una armadura' },
    ],
  },
  // Pogo: saltarín de cuchillas afiladas. Ordenada: saltar dos lugares de juego y afilar un arma.
  Pogo: {
    ordered: true,
    tasks: [
      { type: 'play_place', params: { placeName: 'Torres de la Cordillera' }, label: 'Saltá entre las Torres de la Cordillera' },
      { type: 'play_place', params: { placeName: 'Crateres Dorados' }, label: 'Rebotá por los Cráteres Dorados' },
      { type: 'own_item_of_type', params: { type: 'weapon' }, label: 'Y afilá tus cuchillas con un arma' },
    ],
  },
  // Tronc: árbol-tanque. Ordenada: echar raíces en la Cañada y endurecer su corteza.
  Tronc: {
    ordered: true,
    tasks: [
      { type: 'visit_place', params: { placeName: 'Cañada Verdante' }, label: 'Echá raíces en la Cañada Verdante' },
      { type: 'own_item', params: { itemName: 'Chaleco de Cuero' }, label: 'Y endurecé tu corteza con un Chaleco de Cuero' },
    ],
  },

  // — Acuáticos (Isla del Reposo de la Serpiente) —
  // Co: pequeño pez. Ordenada: sumergirse y atrapar un pescado.
  Co: {
    ordered: true,
    tasks: [
      { type: 'visit_place', params: { placeName: 'Isla del Reposo de la Serpiente' }, label: 'Sumergite en la Isla del Reposo de la Serpiente' },
      { type: 'own_item', params: { itemName: 'Pescado' }, label: 'Y atrapá un Pescado fresco' },
    ],
  },
  // Indrog: criatura de las profundidades. Sin orden: conseguir un cangrejo + comerciar en Eryndor.
  Indrog: {
    ordered: false,
    tasks: [
      { type: 'own_item', params: { itemName: 'Cangrejo' }, label: 'Conseguí un Cangrejo de las profundidades' },
      { type: 'buy_in_world', params: { worldName: 'Eryndor' }, label: 'Y comerciá en una tienda de Eryndor' },
    ],
  },
  // Muro: defensa sólida como un muro. Sin orden: plantarse en la isla + coraza de hierro.
  Muro: {
    ordered: false,
    tasks: [
      { type: 'visit_place', params: { placeName: 'Isla del Reposo de la Serpiente' }, label: 'Plantate firme en la Isla del Reposo de la Serpiente' },
      { type: 'own_item', params: { itemName: 'Coraza de Hierro' }, label: 'Y vestí una Coraza de Hierro, sólida como un muro' },
    ],
  },
  // Serpi: serpiente ágil. Sin orden: sorprenderla al amanecer + un camarón.
  Serpi: {
    ordered: false,
    tasks: [
      { type: 'enter_place_in_time_range', params: { placeName: 'Isla del Reposo de la Serpiente', fromHour: 6, toHour: 12 }, label: 'Sorprendela al amanecer en su Isla (06:00–12:00)' },
      { type: 'own_item', params: { itemName: 'Camarón' }, label: 'Y tené un Camarón en tu inventario' },
    ],
  },

  // — Espaciales (Egea) —
  // Deo: fuego interno. Ordenada: seguir su rastro, sentir su fuego y canalizarlo en un tótem.
  Deo: {
    ordered: true,
    tasks: [
      { type: 'visit_place', params: { placeName: 'Templos de Obsidiana' }, label: 'Seguí su rastro por los Templos de Obsidiana' },
      { type: 'play_place', params: { placeName: 'El Corazon Ardiente' }, label: 'Sentí su fuego interno en El Corazón Ardiente' },
      { type: 'buy_item', params: { itemName: 'Tótem Alfa' }, label: 'Y reclamá un Tótem Alfa para canalizar su llama' },
    ],
  },
  // Eli: viajera estelar. Sin orden: surcar todo Egea + un objeto poco común.
  Eli: {
    ordered: false,
    tasks: [
      { type: 'visit_all_places_in_world', params: { worldName: 'Egea' }, label: 'Surcá todos los confines de Egea' },
      { type: 'own_item_of_rarity', params: { rarity: 'uncommon' }, label: 'Y tené un objeto poco común a bordo' },
    ],
  },
  // Giri: criatura nocturna. Sin orden: visitar los templos de noche + una reliquia (misc).
  Giri: {
    ordered: false,
    tasks: [
      { type: 'enter_place_in_time_range', params: { placeName: 'Templos de Obsidiana', fromHour: 20, toHour: 6 }, label: 'Visitá los Templos de Obsidiana bajo el cielo nocturno (20:00–06:00)' },
      { type: 'own_item_of_type', params: { type: 'misc' }, label: 'Y guardá una reliquia (un objeto misceláneo, p. ej. un tótem)' },
    ],
  },
  // Irig: minera de cristales. Ordenada: internarse en las cavernas y comprar en Egea.
  Irig: {
    ordered: true,
    tasks: [
      { type: 'visit_place', params: { placeName: 'Cavernas Cristalizadas' }, label: 'Internate en las Cavernas Cristalizadas' },
      { type: 'buy_in_world', params: { worldName: 'Egea' }, label: 'Y comprá algo en una tienda de Egea' },
    ],
  },
  // Terri: veloz y frágil. Ordenada: correr por las cavernas y atrapar un objeto raro al vuelo.
  Terri: {
    ordered: true,
    tasks: [
      { type: 'play_place', params: { placeName: 'Cavernas Cristalizadas' }, label: 'Corré veloz jugando en las Cavernas Cristalizadas' },
      { type: 'own_item_of_rarity', params: { rarity: 'rare' }, label: 'Y conseguí un objeto raro al vuelo' },
    ],
  },

  // — Árido (Deo) —
  // Raya: equilibrada y afortunada. Sin orden: cruzar todo el desierto + un objeto raro.
  Raya: {
    ordered: false,
    tasks: [
      { type: 'visit_all_places_in_world', params: { worldName: 'Deo' }, label: 'Cruzá entero el desierto de Deo' },
      { type: 'own_item_of_rarity', params: { rarity: 'rare' }, label: 'Y tené un objeto raro: que la suerte te acompañe' },
    ],
  },

  // — Nieve (Ciudadela de la Cumbre Helada) —
  // Li: criatura del hielo, defensiva. Ordenada: trepar la ciudadela helada y escudarse.
  Li: {
    ordered: true,
    tasks: [
      { type: 'visit_place', params: { placeName: 'Ciudadela de la Cumbre Helada' }, label: 'Trepá a la gélida Ciudadela de la Cumbre Helada' },
      { type: 'own_item', params: { itemName: 'Escudo de Hierro' }, label: 'Y resguardate tras un Escudo de Hierro' },
    ],
  },

  // — Sin bioma —
  // Insec: enjambre recolector. Sin orden: revolotear por el mercado del bosque + acumular alimento.
  Insec: {
    ordered: false,
    tasks: [
      { type: 'visit_place', params: { placeName: 'Mercado Bioluminiscente' }, label: 'Revoloteá por el Mercado Bioluminiscente' },
      { type: 'own_item_of_type', params: { type: 'consumable' }, label: 'Y acumulá algún alimento en tu inventario' },
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

    // 3) Biomas + stats base de monstruos.
    //    Los Base* se rellenan campo a campo si están null Y se BAJAN si superan 10
    //    (invariante de diseño: ningún stat base supera 10, para que el tope 2×nivel
    //    de la escuela tenga sentido). Un valor 1..10 puesto a mano se respeta.
    const monsters = await strapi.db.query('api::monster.monster').findMany({});
    for (const m of monsters) {
      const data = {};
      const biome = MONSTER_BIOME[m.Name];
      if (biome && m.Biome !== biome) data.Biome = biome;
      // Stats base: a medida por nombre → arquetipo del bioma → genérico.
      const effBiome = biome || m.Biome;
      const baseStats = MONSTER_BASE_STATS[m.Name] || BIOME_BASE_STATS[effBiome] || GENERIC_BASE_STATS;
      for (const [field, value] of Object.entries(baseStats)) {
        if (m[field] == null || m[field] > 10) data[field] = value;
      }
      if (Object.keys(data).length) {
        await strapi.db.query('api::monster.monster').update({ where: { id: m.id }, data });
      }
    }

    // 4) Biomas + hotspots de lugares + config de tienda (ShopConfig)
    const places = await strapi.db.query('api::place.place').findMany({ populate: { World: true } });
    for (const p of places) {
      const biome = PLACE_BIOME[p.Name] || WORLD_BIOME[p.World?.Name] || null;
      const hs = PLACE_HOTSPOT[p.Name] || fallbackHotspot(p.id);
      const data = {};
      if (biome && p.Biome !== biome) data.Biome = biome;
      if (p.HotspotX == null) data.HotspotX = hs.x;
      if (p.HotspotY == null) data.HotspotY = hs.y;
      // Convertir el/los lugares designados en battledome (arena de duelos).
      if (BATTLEDOME_PLACES.has(p.Name) && p.Type !== 'battledome') data.Type = 'battledome';
      // GameKey: qué juego corre cada place `game`. Solo si falta (no pisa el admin).
      if (p.Type === 'game' && !p.GameKey && GAME_KEYS[p.Name]) data.GameKey = GAME_KEYS[p.Name];
      // Difficulty: chip informativa del juego. Solo si falta (no pisa el admin).
      if (p.Type === 'game' && !p.Difficulty && GAME_DIFFICULTY[p.Name]) data.Difficulty = GAME_DIFFICULTY[p.Name];
      // ShopConfig: solo tiendas. Se (re)siembra si falta o si fue puesto por el
      // seed (seeded:true), nunca si fue editado a mano en el admin.
      if (p.Type === 'shop') {
        const cur = p.ShopConfig;
        const isManual = cur && typeof cur === 'object' && cur.seeded !== true;
        if (!isManual) {
          const base = SHOP_CONFIGS[p.Name] || GENERIC_SHOP_CONFIG;
          data.ShopConfig = { ...base, seeded: true };
        }
      }
      if (Object.keys(data).length) {
        await strapi.db.query('api::place.place').update({ where: { id: p.id }, data });
      }
    }

    // 4b) Escuelas de entrenamiento de Eryndor (places Type 'training' + entrenadores).
    //     Idempotente: crea cada place si falta, su trainer si falta, y sube la imagen
    //     del maestro. Corre en bootstrap → puebla local y prod (prod en redeploy).
    const eryndor = worlds.find((w) => w.Name === 'Eryndor');
    if (eryndor) {
      for (const { place: ph, trainer: th } of TRAINING_SCHOOLS) {
        let school = await strapi.db.query('api::place.place').findOne({ where: { Name: ph.name } });
        if (!school) {
          school = await strapi.entityService.create('api::place.place', {
            data: {
              Name: ph.name,
              Description: ph.description,
              Type: 'training',
              World: eryndor.id,
              Biome: 'volcanic',
              HotspotX: ph.hotspot.x,
              HotspotY: ph.hotspot.y,
              publishedAt: new Date(),
            },
          });
          strapi.log.info(`[seed] Escuela de entrenamiento creada: ${ph.name}`);
        }
        // Entrenador de la escuela (find-or-create por place).
        const trainer = await strapi.db.query('api::trainer.trainer').findOne({ where: { place: school.id }, populate: ['image'] });
        if (!trainer) {
          let imageId = null;
          try { imageId = (await uploadTrainerImage(strapi, th.image, th.name))?.id ?? null; }
          catch (err) { strapi.log.warn(`[seed] No se pudo subir la imagen de ${th.name}: ${err.message}`); }
          await strapi.entityService.create('api::trainer.trainer', {
            data: { name: th.name, specialties: th.specialties, place: school.id, image: imageId },
          });
          strapi.log.info(`[seed] Entrenador creado: ${th.name}`);
        } else if (!trainer.image) {
          // Backfill de la imagen si el entrenador ya existe pero sin imagen.
          try {
            const up = await uploadTrainerImage(strapi, th.image, th.name);
            if (up?.id) await strapi.db.query('api::trainer.trainer').update({ where: { id: trainer.id }, data: { image: up.id } });
          } catch (err) { strapi.log.warn(`[seed] No se pudo subir la imagen de ${th.name}: ${err.message}`); }
        }
      }
    }

    // 5) Completar datos de items faltantes
    const items = await strapi.db.query('api::item.item').findMany({});
    for (const it of items) {
      const data = {};
      // Backfill de categoría desde el catálogo (para items creados antes del campo).
      if (!it.category && ITEM_CATEGORY[it.name]) data.category = ITEM_CATEGORY[it.name];
      // Ataque/Defensa por familia × rareza. Para objetos equipables (arma/armadura/
      // tótem) se fija el valor canónico de la nueva escala (rellena 0/null y BAJA los
      // valores viejos de la escala anterior, p. ej. arma legendaria 35 → 7; también
      // pone en 0 los cross-terms viejos). Los no equipables (comida, etc.) quedan en 0.
      const itForFam = { ...it, category: it.category || data.category };
      const fam = equipFamily(itForFam);
      if (fam) {
        const stats = equipStatsFor(itForFam);
        if (it.attack !== stats.attack) data.attack = stats.attack;
        if (it.defense !== stats.defense) data.defense = stats.defense;
      }
      const d = ITEM_DATA[it.name];
      if (d) {
        if (!it.rarity) data.rarity = d.rarity;
        if (it.value == null || it.value === 0) data.value = d.value;
        if (!it.type) data.type = d.type;
        if (d.is_stackable && !it.is_stackable) { data.is_stackable = true; data.max_stack = d.max_stack; }
        if (d.usable && !it.usable) { data.usable = true; data.cooldown = d.cooldown; }
      }
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

    // 5c) Pociones de curación del battledome (idempotente por nombre).
    for (const p of POTIONS) {
      const exists = await strapi.db.query('api::item.item').findOne({ where: { name: p.name } });
      if (exists) {
        // Backfill del campo heal si quedó en 0 (p. ej. poción creada antes del campo).
        if (!exists.heal) {
          await strapi.db.query('api::item.item').update({ where: { id: exists.id }, data: { heal: p.heal } });
        }
        continue;
      }
      await strapi.entityService.create('api::item.item', {
        data: {
          name: p.name,
          slug: slugify(p.name),
          type: 'consumable',
          category: 'potion',
          rarity: p.rarity,
          value: p.value,
          heal: p.heal,
          is_stackable: true,
          max_stack: 20,
          usable: true,
          publishedAt: new Date(),
        },
      });
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
      // Usa el service para que los stats de progresión arranquen en el base de la especie.
      await strapi.service('api::companion.companion').createForUser(demo.id, tronc.id, {
        happiness: 82, energy: 64, bond: 45, isActive: true,
      });
    } else if (companions.length > 1) {
      for (const extra of companions.slice(1)) {
        await strapi.db.query('api::companion.companion').delete({ where: { id: extra.id } });
      }
    }

    // 9b) Stats de progresión/combate de compañeros:
    //     - se completan campo a campo desde el base de la especie si faltan;
    //     - se BAJAN al base si quedaron por encima del tope 2×nivel (datos viejos
    //       de la escala anterior: p. ej. salud 110 cuando el tope es 2). Un stat
    //       entrenado legítimamente nunca supera el tope, así que no se toca.
    const companionSvc = strapi.service('api::companion.companion');
    const allCompanions = await strapi.db.query('api::companion.companion').findMany({ populate: { monster: true } });
    for (const c of allCompanions) {
      const base = companionSvc.baseStatsFor(c.monster); // ya ≤10 (paso 3)
      const data = {};
      for (const [field, value] of Object.entries(base)) {
        if (c[field] == null) data[field] = value;
      }
      const lvl = data.level ?? c.level ?? 1;
      for (const field of ['health', 'strength', 'defense', 'speed']) {
        const cur = data[field] ?? c[field];
        if (cur != null && cur > statCap(field, lvl) && cur !== base[field]) data[field] = base[field];
      }
      // Salud actual: completa si falta y se clampa a la salud máxima resultante.
      const finalHealth = data.health ?? c.health ?? base.health;
      if (c.currentHealth == null) data.currentHealth = finalHealth;
      else if (c.currentHealth > finalHealth) data.currentHealth = finalHealth;
      if (Object.keys(data).length) {
        await strapi.db.query('api::companion.companion').update({ where: { id: c.id }, data });
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

    // 12) Stock inicial de tiendas. Corre en bootstrap (single-thread, sin race);
    //     genera el stock de las tiendas vacías cuyo cooldown ya venció. El cron
    //     (config/cron-tasks.js) se encarga de todos los restocks posteriores.
    await restockDueShops(strapi);

    strapi.log.info('[seed] Force seed completado ✓');
  } catch (err) {
    strapi.log.error(`[seed] Falló el seed de Force: ${err.message}`);
  }
};

// Exponer datos sembrables para herramientas externas (p. ej. el script que aplica
// las estrategias directo a una base sin levantar Strapi). Requerir este módulo solo
// define constantes y exporta esto; la función seed no corre hasta que se la invoca.
module.exports.MONSTER_STRATEGIES = MONSTER_STRATEGIES;
module.exports.buildDiscoveryStrategy = buildDiscoveryStrategy;
