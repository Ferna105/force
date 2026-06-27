'use strict';

/**
 * Catálogo de MOBILIARIO (objetos de la sección "Mobiliario y misceláneos" del
 * design system de Force). Cada objeto es un `item` con `type:'misc'` y
 * `category:'furniture'` (colocable en las casas del vecindario). Los precios y
 * descripciones son los del diseño (no se reescalan: `priceFor` saltea furniture).
 *
 * Doble uso:
 *  - `seedFurniture(strapi)` lo invoca el seed de bootstrap (src/seed.js).
 *  - Ejecutado directo (`node scripts/seed-furniture.js`) arranca su propia
 *    instancia de Strapi y corre lo mismo — sirve para poblar LOCAL (docker exec)
 *    y PROD (Railway por SSH) sin esperar un redeploy, igual que upload-image.js.
 *    Usar siempre con SEED=false para no re-disparar el seed de bootstrap.
 *
 * Idempotente: crea el item si falta y, si existe, lo converge a los valores del
 * catálogo (category/type/rarity/value/description). La imagen (`image`) es solo
 * referencia para cargar el ícono después con la skill upload-image.
 */

const ITEM_UID = 'api::item.item';
const ENTRY_UID = 'api::inventory-entry.inventory-entry';
const PLACEMENT_UID = 'api::house-placement.house-placement';

// Slug kebab-case sin acentos (igual criterio que src/seed.js).
function slugify(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Catálogo de mobiliario (26 objetos) — sección "Mobiliario y misceláneos".
const MOBILIARIO = [
  // — Común —
  { name: 'Mesa de Madera', rarity: 'common', value: 40, image: 'm-mesa.png', description: 'Tablón robusto de roble. El centro de todo refugio.' },
  { name: 'Taburete', rarity: 'common', value: 30, image: 'm-taburete.png', description: 'Asiento simple de tres patas. Práctico y liviano.' },
  { name: 'Barril', rarity: 'common', value: 45, image: 'm-barril.png', description: 'Guarda agua, grano o forraje para tus criaturas.' },
  { name: 'Cajón de Heno', rarity: 'common', value: 35, image: 'm-heno.png', description: 'Heno fresco para el descanso de las bestias.' },
  { name: 'Antorcha', rarity: 'common', value: 30, image: 'm-antorcha.png', description: 'Luz cálida para las noches en el refugio.' },
  { name: 'Maceta', rarity: 'common', value: 35, image: 'm-maceta.png', description: 'Una planta que alegra cualquier rincón del santuario.' },
  { name: 'Cubeta', rarity: 'common', value: 25, image: 'm-cubeta.png', description: 'Para el agua del aseo diario de tus criaturas.' },
  { name: 'Alfombra de Paja', rarity: 'common', value: 30, image: 'm-alfombra.png', description: 'Tejida a mano. Entibia el suelo del santuario.' },
  // — Poco común —
  { name: 'Banco de Roble', rarity: 'uncommon', value: 160, image: 'm-banco.png', description: 'Asiento rústico tallado a mano. Acogedor.' },
  { name: 'Cofre de Madera', rarity: 'uncommon', value: 200, image: 'm-cofre.png', description: 'Guarda tus objetos bajo cerradura de bronce.' },
  { name: 'Farol', rarity: 'uncommon', value: 140, image: 'm-farol.png', description: 'Llama protegida que no se apaga con el viento.' },
  { name: 'Estantería', rarity: 'uncommon', value: 220, image: 'm-estante.png', description: 'Ordena pócimas, tomos y reliquias menores.' },
  { name: 'Reloj de Arena', rarity: 'uncommon', value: 150, image: 'm-reloj-arena.png', description: 'Marca el tiempo de cada entrenamiento.' },
  { name: 'Cama de Paja', rarity: 'uncommon', value: 180, image: 'm-cama.png', description: 'Lecho mullido para recuperar energía.' },
  // — Raro —
  { name: 'Mesa de Mármol', rarity: 'rare', value: 360, image: 'm-mesa-marmol.png', description: 'Veta azulada pulida a espejo. La pieza del salón.' },
  { name: 'Brasero', rarity: 'rare', value: 320, image: 'm-brasero.png', description: 'Fuego eterno que entibia a criaturas de hielo.' },
  { name: 'Estandarte', rarity: 'rare', value: 300, image: 'm-tapiz.png', description: 'Luce el emblema de tu casa de domadores.' },
  { name: 'Lámpara de Cristal', rarity: 'rare', value: 420, image: 'm-lampara.png', description: 'Cristal de Egea que irradia luz fría y serena.' },
  { name: 'Espejo de Plata', rarity: 'rare', value: 380, image: 'm-espejo.png', description: 'Plata pulida de Koril. Refleja más que la imagen.' },
  // — Épico —
  { name: 'Caldero Umbral', rarity: 'epic', value: 900, image: 'm-caldero.png', description: 'Hierve brebajes con sombra destilada de Deo.' },
  { name: 'Pedestal Rúnico', rarity: 'epic', value: 1100, image: 'm-pedestal.png', description: 'Sostiene una runa flotante de poder antiguo.' },
  { name: 'Reloj Astral', rarity: 'epic', value: 1300, image: 'm-reloj-astral.png', description: 'Mide el tiempo por el giro de las estrellas.' },
  { name: 'Arpa Encantada', rarity: 'epic', value: 1200, image: 'm-arpa.png', description: 'Su melodía calma a la bestia más fiera.' },
  // — Legendario —
  { name: 'Trono de Roble', rarity: 'legendary', value: 2400, image: 'm-trono.png', description: 'Tallado de un roble milenario de Verdant Hollow.' },
  { name: 'Cofre del Tesoro', rarity: 'legendary', value: 3200, image: 'm-cofre-tesoro.png', description: 'Rebosa de Force. El orgullo de todo domador.' },
  { name: 'Candelabro Dorado', rarity: 'legendary', value: 2800, image: 'm-candelabro.png', description: 'Oro de las simas de Egea. Ilumina el gran salón.' },
];

// Muebles placeholder previos que el catálogo del diseño reemplaza (se borran,
// junto con sus entradas de inventario y placements). "Lámpara de Cristal" NO está
// acá: pertenece al catálogo nuevo, así que se conserva/converge.
const OBSOLETE_FURNITURE = [
  'Silla de Madera', 'Mesa Rústica', 'Cama Acogedora',
  'Estantería de Roble', 'Alfombra Tejida', 'Trono Tallado',
];

// Crea/actualiza los 26 muebles del catálogo y elimina los placeholders obsoletos.
// Devuelve { created, updated, removed }.
async function seedFurniture(strapi) {
  let created = 0;
  let updated = 0;
  let removed = 0;

  // 1) Upsert del catálogo (idempotente, converge a los valores del diseño).
  for (const m of MOBILIARIO) {
    const data = {
      name: m.name,
      slug: slugify(m.name),
      type: 'misc',
      category: 'furniture',
      rarity: m.rarity,
      value: m.value,
      description: m.description,
    };
    const existing = await strapi.db.query(ITEM_UID).findOne({ where: { name: m.name } });
    if (!existing) {
      // db.query.create (no entityService) para no validar el enum de category:
      // así corre también en un prod cuyo schema desplegado aún no tiene 'furniture'
      // (se reconcilia en el próximo redeploy). Defaults explícitos por las dudas.
      await strapi.db.query(ITEM_UID).create({
        data: {
          ...data,
          attack: 0, defense: 0, heal: 0,
          is_stackable: false, max_stack: 1, usable: false, cooldown: 0,
          publishedAt: new Date(),
        },
      });
      created += 1;
      strapi.log?.info?.(`[furniture] creado: ${m.name}`);
    } else {
      await strapi.db.query(ITEM_UID).update({ where: { id: existing.id }, data });
      updated += 1;
    }
  }

  // 2) Limpieza de los placeholders reemplazados (item + inventario + placements).
  for (const name of OBSOLETE_FURNITURE) {
    const obs = await strapi.db.query(ITEM_UID).findOne({ where: { name } });
    if (!obs) continue;
    const entries = await strapi.db.query(ENTRY_UID).findMany({ where: { item: obs.id } });
    for (const e of entries) await strapi.entityService.delete(ENTRY_UID, e.id);
    const placements = await strapi.db.query(PLACEMENT_UID).findMany({ where: { item: obs.id } });
    for (const p of placements) await strapi.entityService.delete(PLACEMENT_UID, p.id);
    await strapi.entityService.delete(ITEM_UID, obs.id);
    removed += 1;
    strapi.log?.info?.(`[furniture] placeholder eliminado: ${name}`);
  }

  return { created, updated, removed };
}

module.exports = { seedFurniture, MOBILIARIO, OBSOLETE_FURNITURE, slugify };

// Ejecución directa: arranca Strapi y corre el seed de mobiliario (local o prod).
if (require.main === module) {
  (async () => {
    const strapi = await require('@strapi/strapi')().load();
    try {
      const res = await seedFurniture(strapi);
      console.log('RESULT ' + JSON.stringify(res));
      console.log('SUMMARY ' + JSON.stringify({ ok: res.created + res.updated, removed: res.removed }));
    } finally {
      await strapi.destroy();
    }
    process.exit(0);
  })().catch((err) => {
    console.error('[seed-furniture] FALLÓ:', err);
    process.exit(1);
  });
}
