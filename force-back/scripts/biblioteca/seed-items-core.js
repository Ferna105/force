'use strict';

/**
 * Siembra idempotente del catálogo "Biblioteca de objetos" (design handoff).
 *
 * Para cada item del manifest (`items.json`) que todavía no exista en la base
 * (match por `name`), sube su imagen a la media library vía el plugin de upload
 * y crea el item publicado con icon, rareza, descripción, precio (value) y tipo.
 *
 * Recibe una instancia de Strapi YA cargada, así puede usarse tanto desde el
 * bootstrap (src/seed.js) como desde el runner standalone (seed-items.js).
 * Re-ejecutar es seguro: saltea lo que ya está.
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'assets');
const ITEMS = require('./items.json');

// Slug ascii a partir del nombre (los uid no se autogeneran vía entityService).
function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function uploadIcon(strapi, imageFile, altName) {
  const filePath = path.join(ASSETS_DIR, imageFile);
  const stats = fs.statSync(filePath);
  const [uploaded] = await strapi
    .plugin('upload')
    .service('upload')
    .upload({
      data: { fileInfo: { name: imageFile, alternativeText: altName, caption: altName } },
      files: { name: imageFile, type: 'image/png', size: stats.size, path: filePath },
    });
  return uploaded;
}

module.exports = async function seedBibliotecaItems(strapi) {
  let created = 0;
  let skipped = 0;

  for (const item of ITEMS) {
    try {
      const existing = await strapi.db
        .query('api::item.item')
        .findOne({ where: { name: item.name } });
      if (existing) {
        skipped++;
        continue;
      }

      const icon = await uploadIcon(strapi, item.image, item.name);
      const { image, ...fields } = item;

      await strapi.entityService.create('api::item.item', {
        data: {
          ...fields,
          slug: slugify(item.name),
          icon: icon.id,
          publishedAt: new Date(),
        },
      });
      created++;
    } catch (err) {
      strapi.log.error(`[seed] Biblioteca: falló "${item.name}": ${err.message}`);
    }
  }

  strapi.log.info(
    `[seed] Biblioteca de objetos: creados ${created}, salteados ${skipped} (manifest ${ITEMS.length}).`
  );
  return { created, skipped };
};
