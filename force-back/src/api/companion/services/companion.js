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
const { statCap } = require('../../training/engine');

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
   * Resuelve (perezosamente) un entrenamiento en curso del compañero `c`: si su
   * `trainingEndsAt` ya pasó, aplica el +`trainingGain` a la stat entrenada
   * (clamp al tope 2×nivel / 100), limpia los campos de entrenamiento y devuelve
   * el row actualizado. Si no hay nada que resolver, devuelve `c` tal cual.
   * Lo llaman el controller de training (info/start) y `companion.mine`.
   */
  async resolveTraining(c) {
    if (!c || !c.trainingStat || !c.trainingEndsAt) return c;
    if (new Date(c.trainingEndsAt).getTime() > Date.now()) return c; // todavía entrenando

    const stat = c.trainingStat;
    const gain = c.trainingGain || 1;
    const current = Number(c[stat]) || 0;
    const next = Math.min(current + gain, statCap(stat, c.level));

    const updated = await strapi.entityService.update(UID, c.id, {
      data: { [stat]: next, trainingStat: null, trainingEndsAt: null, trainingGain: 1 },
    });
    return { ...c, ...updated };
  },

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
        // La salud actual arranca llena (= salud máxima de la especie).
        currentHealth: base.health,
        ...extra,
      },
    });
  },
}));
