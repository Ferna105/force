'use strict';

/**
 * companion service
 *
 * Además del CRUD core, expone:
 * - `baseStatsFor(monster)`: stats base de progresión/combate de una especie,
 *   leídos de los fields `Base*` del monstruo (con fallback genérico).
 * - `createForUser(userId, monsterId, extra)`: crea un compañero copiando esos
 *   stats base. Es el punto de enganche del futuro flujo de "obtener compañero".
 */

const { createCoreService } = require('@strapi/strapi').factories;

const UID = 'api::companion.companion';

// Fallback genérico para monstruos sin stats base cargados (equilibrado).
const GENERIC_BASE_STATS = { health: 100, strength: 10, defense: 10, speed: 10, luck: 5, level: 1 };

// Lee los Base* de la especie; cae al genérico campo a campo si falta alguno.
function baseStatsFor(monster) {
  const m = monster || {};
  const pick = (val, def) => (val == null ? def : val);
  return {
    health: pick(m.BaseHealth, GENERIC_BASE_STATS.health),
    strength: pick(m.BaseStrength, GENERIC_BASE_STATS.strength),
    defense: pick(m.BaseDefense, GENERIC_BASE_STATS.defense),
    speed: pick(m.BaseSpeed, GENERIC_BASE_STATS.speed),
    luck: pick(m.BaseLuck, GENERIC_BASE_STATS.luck),
    level: pick(m.BaseLevel, GENERIC_BASE_STATS.level),
  };
}

module.exports = createCoreService(UID, ({ strapi }) => ({
  baseStatsFor,
  GENERIC_BASE_STATS,

  /**
   * Crea un compañero para `userId` sobre `monsterId`, con sus stats de progresión
   * inicializados al base de la especie. `extra` permite sobreescribir stats de
   * cuidado / flags (p. ej. isActive). No define cómo se "consigue" el compañero:
   * ese flujo se enganchará llamando a este método.
   */
  async createForUser(userId, monsterId, extra = {}) {
    const monster = await strapi.db.query('api::monster.monster').findOne({ where: { id: monsterId } });
    const base = baseStatsFor(monster);
    return strapi.entityService.create(UID, {
      data: {
        user: userId,
        monster: monsterId,
        lastInteraction: new Date().toISOString(),
        ...base,
        ...extra,
      },
    });
  },
}));
