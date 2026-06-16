'use strict';

/**
 * Motor de la escuela de entrenamiento (lógica pura, sin acceso a Strapi).
 *
 * Reglas (ver CLAUDE.md / README de esta API):
 *  - Stats entrenables: fuerza, defensa, velocidad, salud y nivel.
 *  - Cada entrenamiento sube la stat elegida +1 (ó +2 si es especialidad del
 *    entrenador). El nivel sube siempre de a 1.
 *  - Tope de fuerza/defensa/velocidad/salud = 2 × nivel. Nivel máximo 100.
 *  - El pago es 1 tótem de la rareza que corresponde al nivel del compañero.
 *  - La duración (en días reales) depende de la rareza del tótem.
 */

// Stats que se pueden entrenar (claves en el companion).
const STATS = ['strength', 'defense', 'speed', 'health', 'level'];

// Stats con tope por nivel (el nivel tiene tope fijo 100; ver statCap).
const CAPPED_STATS = new Set(['strength', 'defense', 'speed', 'health']);

const MAX_LEVEL = 100;
// Multiplicador del tope por stat: la salud puede subir hasta 4×nivel; el resto 2×.
const CAP_MULT = { health: 4, strength: 2, defense: 2, speed: 2 };

// Días reales que tarda un entrenamiento según la rareza del tótem pagado.
const DAYS_BY_RARITY = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };

// Rareza del tótem exigido según la banda de nivel del compañero.
function rarityByLevel(level) {
  const lvl = Number(level) || 1;
  if (lvl <= 19) return 'common';
  if (lvl <= 39) return 'uncommon';
  if (lvl <= 59) return 'rare';
  if (lvl <= 79) return 'epic';
  return 'legendary';
}

// Tope al que puede entrenarse una stat dado el nivel actual. La salud llega a
// 4×nivel; fuerza/defensa/velocidad a 2×nivel; el nivel a 100.
function statCap(stat, level) {
  if (stat === 'level') return MAX_LEVEL;
  return (CAP_MULT[stat] ?? 2) * (Number(level) || 1);
}

// Valor actual de una stat en el companion.
function statValue(companion, stat) {
  return Number(companion?.[stat]) || 0;
}

// ¿Se puede seguir entrenando esa stat? (todavía por debajo del tope)
function canTrain(companion, stat) {
  return statValue(companion, stat) < statCap(stat, companion.level);
}

// Cuánto sube la stat al entrenar: +2 si el entrenador es especialista, si no +1.
function gainFor(stat, specialties) {
  return Array.isArray(specialties) && specialties.includes(stat) ? 2 : 1;
}

module.exports = {
  STATS,
  CAPPED_STATS,
  MAX_LEVEL,
  DAYS_BY_RARITY,
  rarityByLevel,
  statCap,
  statValue,
  canTrain,
  gainFor,
};
