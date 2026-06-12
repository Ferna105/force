'use strict';

/**
 * Aplica las estrategias de descubrimiento (MONSTER_STRATEGIES de src/seed.js)
 * directo a una base Postgres, matcheando por **nombre** de monstruo. Es la misma
 * fuente que usa el seed en bootstrap, así que local, prod y un futuro re-deploy
 * quedan consistentes (idempotente).
 *
 * Uso:
 *   node scripts/apply-discovery-strategies.js "postgresql://user:pass@host:port/db"
 *   DATABASE_URL=... node scripts/apply-discovery-strategies.js
 */

const { Client } = require('pg');
const { MONSTER_STRATEGIES } = require('../src/seed');

const conn = process.argv[2] || process.env.DATABASE_URL;
if (!conn) {
  console.error('Falta el connection string (arg 1 o DATABASE_URL).');
  process.exit(1);
}

// SSL solo para bases remotas (prod/Railway); local (db/localhost) va sin SSL.
const isLocal = /@(db|localhost|127\.0\.0\.1)[:/]/.test(conn);

(async () => {
  const client = new Client({
    connectionString: conn,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
  await client.connect();

  let updated = 0;
  const missing = [];
  for (const [name, strategy] of Object.entries(MONSTER_STRATEGIES)) {
    // Marca `seeded:true`: el seed refresca lo sembrado pero nunca pisa una edición
    // manual del admin; escribir el marcador mantiene ambos mundos consistentes.
    const payload = JSON.stringify({ ...strategy, seeded: true });
    const res = await client.query(
      'UPDATE monsters SET discovery_strategy = $1::jsonb WHERE name = $2',
      [payload, name]
    );
    if (res.rowCount) updated += res.rowCount;
    else missing.push(name);
  }

  console.log(`[apply-strategies] Monstruos actualizados: ${updated}/${Object.keys(MONSTER_STRATEGIES).length}`);
  if (missing.length) console.log(`[apply-strategies] Sin match en la base: ${missing.join(', ')}`);

  await client.end();
})().catch((err) => {
  console.error('[apply-strategies] Error:', err.message);
  process.exit(1);
});
