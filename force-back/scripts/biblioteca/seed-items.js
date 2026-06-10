'use strict';

/**
 * Runner standalone para sembrar la "Biblioteca de objetos" sin pasar por el
 * bootstrap. Bootea una instancia de Strapi y delega en seed-items-core.js
 * (la misma lógica idempotente que corre en bootstrap vía src/seed.js).
 *
 *   docker compose exec -e SEED=false back node scripts/biblioteca/seed-items.js
 */

const strapiFactory = require('@strapi/strapi');
const seedBibliotecaItems = require('./seed-items-core');

async function run() {
  const strapi = await strapiFactory().load();
  try {
    await seedBibliotecaItems(strapi);
  } finally {
    await strapi.destroy();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
