'use strict';

/**
 * Carga imágenes a un `place` (campo Banner) o un `item` (campo icon) usando el
 * plugin de upload de Strapi: genera el binario en public/uploads, la fila en
 * `files` (con sus formats) y el morph al campo de media. Corre con su propia
 * instancia de Strapi, por lo que sirve igual en LOCAL (container) y en PROD
 * (Railway por SSH). Siempre con SEED=false para no re-disparar el seed.
 *
 *   cd /app && SEED=false node <dir>/upload-image.js
 *
 * Lee `manifest.json` que está EN EL MISMO DIRECTORIO que este script. Formato:
 *   [
 *     { "kind": "place", "match": "Mercado Bioluminiscente", "file": "x.png" },
 *     { "kind": "item",  "id": 42, "field": "icon", "file": "y.png" }
 *   ]
 * Por entrada:
 *   - kind: "place" | "item"            (requerido)
 *   - match: nombre exacto del entry    (o usar `id`)
 *   - id: id numérico del entry         (alternativa a `match`)
 *   - field: campo de media a setear    (opcional; default place→Banner, item→icon)
 *   - file: nombre del archivo de imagen, junto a este script (requerido)
 *
 * Imprime una línea `RESULT {json}` por entrada para que el orquestador la parsee.
 */

const fs = require('fs');
const path = require('path');

const KINDS = {
  place: { uid: 'api::place.place', matchAttr: 'Name', defaultField: 'Banner' },
  item: { uid: 'api::item.item', matchAttr: 'name', defaultField: 'icon' },
  region: { uid: 'api::region.region', matchAttr: 'Name', defaultField: 'Banner' },
};

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
};

async function main() {
  const manifestPath = path.join(__dirname, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const strapi = await require('@strapi/strapi')().load();
  let ok = 0;
  let failed = 0;
  try {
    for (const row of manifest) {
      const out = { ...row };
      try {
        const kind = KINDS[row.kind];
        if (!kind) throw new Error(`kind inválido: "${row.kind}" (usar place|item)`);
        const field = row.field || kind.defaultField;

        const filePath = path.join(__dirname, row.file);
        if (!fs.existsSync(filePath)) throw new Error(`falta el archivo ${row.file}`);

        const where = row.id != null ? { id: row.id } : { [kind.matchAttr]: row.match };
        const entry = await strapi.db
          .query(kind.uid)
          .findOne({ where, populate: { [field]: true } });
        if (!entry) {
          throw new Error(
            `no existe ${row.kind} ${row.id != null ? `#${row.id}` : `"${row.match}"`}`
          );
        }

        if (entry[field] && entry[field].name === row.file) {
          out.status = 'skipped';
          out.id = entry.id;
          out.url = entry[field].url;
          strapi.log.info(`[upload-image] = ${row.kind} #${entry.id} ya tiene ${row.file} en ${field} — salteado`);
          console.log('RESULT ' + JSON.stringify(out));
          ok++;
          continue;
        }

        const stats = fs.statSync(filePath);
        const type = MIME[path.extname(row.file).toLowerCase()] || 'application/octet-stream';
        const [uploaded] = await strapi
          .plugin('upload')
          .service('upload')
          .upload({
            data: {
              fileInfo: {
                name: row.file,
                alternativeText: row.match || `${row.kind} ${entry.id}`,
                caption: row.match || '',
              },
            },
            files: { name: row.file, type, size: stats.size, path: filePath },
          });

        await strapi.entityService.update(kind.uid, entry.id, { data: { [field]: uploaded.id } });

        out.status = 'uploaded';
        out.id = entry.id;
        out.field = field;
        out.fileId = uploaded.id;
        out.url = uploaded.url;
        strapi.log.info(`[upload-image] ✓ ${row.kind} #${entry.id} ${field} -> #${uploaded.id} ${uploaded.url}`);
        console.log('RESULT ' + JSON.stringify(out));
        ok++;
      } catch (err) {
        out.status = 'error';
        out.error = err.message;
        console.log('RESULT ' + JSON.stringify(out));
        strapi.log.error(`[upload-image] ✗ ${JSON.stringify(row)}: ${err.message}`);
        failed++;
      }
    }
  } finally {
    await strapi.destroy();
  }
  console.log(`SUMMARY ${JSON.stringify({ ok, failed })}`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('[upload-image] FALLÓ:', err);
  process.exit(1);
});
