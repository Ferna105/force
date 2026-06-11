'use strict';

/* ===================================================================
   FORCE — Battledome · motor de combate por turnos (server-authoritative).

   Funciones puras (sin strapi): el servidor de sockets carga el duelo
   poblado, llama `startBattle(duel)` para armar el estado inicial y
   `resolveMove(state, side, move)` en cada jugada. El estado es
   serializable y se difunde tal cual a los dos clientes.
   =================================================================== */

// Multiplicador de ataque por bioma de la arena (sabor del entorno).
const ENV_MULT = {
  volcanic: 1.12, // las brasas avivan los ataques
  arid: 1.05, // el calor castiga
  forest: 1.0,
  aqua: 1.0,
  snow: 1.0,
  space: 1.0,
};

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Aplana un item equipado (con su icon poblado) a un objeto liviano serializable.
function itemLite(it) {
  if (!it) return null;
  const iconUrl = it.icon?.url ?? null;
  return {
    id: it.id,
    name: it.name,
    rarity: it.rarity,
    type: it.type,
    category: it.category ?? null,
    attack: it.attack || 0,
    defense: it.defense || 0,
    heal: it.heal || 0,
    iconUrl,
  };
}

// Construye el estado de un peleador desde su companion (poblado con monster +
// equippedItems+icon). hp arranca en currentHealth; maxHp es la salud máxima.
function fighterFromCompanion(side, user, companion) {
  const monster = companion.monster || {};
  const maxHp = companion.health || 100;
  // El combate arranca con la salud ACTUAL persistente del compañero.
  const startHp = clamp(companion.currentHealth ?? maxHp, 1, maxHp);
  return {
    side,
    userId: user.id,
    username: user.username,
    companionId: companion.id,
    monsterName: monster.Name || 'Criatura',
    biome: monster.Biome || null,
    level: companion.level || 1,
    maxHp,
    hp: startHp,
    strength: companion.strength || 10,
    defense: companion.defense || 10,
    speed: companion.speed || 10,
    luck: companion.luck || 5,
    guard: null, // {type:'defend',mult,defBonus} | {type:'dodge',chance} | null
    items: (companion.equippedItems || []).map(itemLite).filter(Boolean),
  };
}

/**
 * Estado inicial del combate a partir del duelo poblado.
 * El primer turno es de quien tiene más velocidad (desempate: el creador).
 */
function startBattle(duel) {
  const arena = duel.place?.Biome || 'volcanic';
  const creator = fighterFromCompanion('creator', duel.creator, duel.creatorCompanion);
  const opponent = fighterFromCompanion('opponent', duel.opponent, duel.opponentCompanion);
  const firstMover = opponent.speed > creator.speed ? 'opponent' : 'creator';
  return {
    duelId: duel.id,
    arena,
    wager: duel.wager || 0,
    round: 1,
    firstMover,
    turn: firstMover,
    over: false,
    winner: null,
    creator,
    opponent,
  };
}

const other = (side) => (side === 'creator' ? 'opponent' : 'creator');

/**
 * Resuelve una jugada del peleador `side`.
 * move = { action: 'atacar'|'defender'|'esquivar', itemId }
 * Devuelve { state, log } con el estado mutado y una entrada de historial
 * estructurada (el frontend la formatea en español).
 */
function resolveMove(state, side, move) {
  const actor = state[side];
  const def = state[other(side)];
  const item = actor.items.find((i) => i.id === Number(move.itemId)) || null;
  const envMult = ENV_MULT[state.arena] ?? 1.0;

  const log = {
    round: state.round,
    side,
    actorName: actor.monsterName,
    action: move.action,
    item: item ? { name: item.name, rarity: item.rarity } : null,
  };

  if (move.action === 'atacar') {
    // ¿El defensor tenía preparada una esquiva?
    if (def.guard && def.guard.type === 'dodge' && Math.random() < def.guard.chance) {
      def.guard = null;
      log.miss = true;
    } else {
      const atkPower = actor.strength + (item ? item.attack : 0);
      let base = atkPower * rnd(0.8, 1.05) * envMult;
      // Crítico: por suerte + bonus si es arma.
      const critCh = 0.08 + actor.luck / 200 + (item && item.category === 'weapon' ? 0.06 : 0);
      const crit = Math.random() < critCh;
      if (crit) base *= 1.6;
      // ¿El defensor se había defendido?
      let defPow = def.defense;
      if (def.guard && def.guard.type === 'defend') {
        base *= def.guard.mult;
        defPow += def.guard.defBonus || 0;
        def.guard = null;
      }
      const dmg = Math.max(1, Math.round(base - defPow * 0.5));
      def.hp = Math.max(0, def.hp - dmg);
      log.dmg = dmg;
      log.crit = crit;
    }
  } else if (move.action === 'defender') {
    // Más defensa del objeto ⇒ menor multiplicador de daño recibido.
    const mult = clamp(0.6 - (item ? item.defense : 0) * 0.02, 0.25, 0.6);
    actor.guard = { type: 'defend', mult, defBonus: item ? item.defense : 0 };
    if (item && item.heal > 0) {
      const healed = Math.min(actor.maxHp, actor.hp + item.heal) - actor.hp;
      actor.hp += healed;
      log.heal = healed;
    }
  } else if (move.action === 'esquivar') {
    const chance = clamp(0.35 + actor.speed / 100, 0.35, 0.85);
    actor.guard = { type: 'dodge', chance };
    log.chance = Math.round(chance * 100);
  }

  // ¿Fin del combate?
  const ended = checkEnd(state);
  if (ended) {
    state.over = true;
    state.winner = ended;
  } else {
    // Pasa el turno; si vuelve al primer movedor, avanza la ronda.
    const next = other(side);
    if (next === state.firstMover) state.round += 1;
    state.turn = next;
  }

  return { state, log };
}

// Devuelve 'creator'|'opponent' (ganador) o null si el combate sigue.
function checkEnd(state) {
  if (state.opponent.hp <= 0) return 'creator';
  if (state.creator.hp <= 0) return 'opponent';
  return null;
}

module.exports = { startBattle, resolveMove, checkEnd, ENV_MULT };
