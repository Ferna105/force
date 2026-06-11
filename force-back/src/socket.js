'use strict';

/* ===================================================================
   FORCE — Battledome · servidor de sockets (combate en vivo).

   Server-authoritative: el estado del combate vive acá (en memoria),
   los clientes sólo emiten jugadas y reciben el estado. Se adjunta al
   httpServer de Strapi en el bootstrap (src/index.js).

   Eventos (cliente → server):
     duel:join { duelId }
     duel:move { duelId, action, itemId }
   Eventos (server → cliente):
     duel:waiting { duelId }                 esperando al rival
     duel:state   { state }                  estado completo del combate
     duel:log     { entry }                  entrada del historial de jugadas
     duel:over    { winner, result }         fin del combate
     duel:opponentLeft {}                    el rival se desconectó
     duel:error   { message }
   =================================================================== */

const engine = require('./api/battle/engine');

const DUEL_UID = 'api::duel.duel';
const COMPANION_UID = 'api::companion.companion';
const USER_UID = 'plugin::users-permissions.user';

const FORFEIT_GRACE_MS = 30000;

// Populate necesario para armar el estado de combate desde un duelo.
const FULL_POPULATE = {
  place: { fields: ['Name', 'Type', 'Biome'] },
  creator: { fields: ['id', 'username'] },
  opponent: { fields: ['id', 'username'] },
  creatorCompanion: { populate: { monster: { populate: ['Image'] }, equippedItems: { populate: ['icon'] } } },
  opponentCompanion: { populate: { monster: { populate: ['Image'] }, equippedItems: { populate: ['icon'] } } },
};

module.exports = function initSockets(strapi, io) {
  // duelId -> { state, started, sockets:{creator:Set, opponent:Set}, forfeitTimer, finalizing }
  const battles = new Map();

  function getBattle(duelId) {
    let b = battles.get(duelId);
    if (!b) {
      b = { state: null, started: false, sockets: { creator: new Set(), opponent: new Set() }, forfeitTimer: null, finalizing: false };
      battles.set(duelId, b);
    }
    return b;
  }

  const loadDuelFull = (duelId) => strapi.entityService.findOne(DUEL_UID, duelId, { populate: FULL_POPULATE });

  // Lado (creator/opponent) del usuario en el duelo, o null.
  function sideOf(duel, userId) {
    if (duel.creator?.id === userId) return 'creator';
    if (duel.opponent?.id === userId) return 'opponent';
    return null;
  }

  // --- Autenticación del handshake (JWT de users-permissions) ---
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No autenticado.'));
      const payload = await strapi.plugin('users-permissions').service('jwt').verify(token);
      socket.data.userId = payload.id;
      next();
    } catch (e) {
      next(new Error('Token inválido.'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;

    socket.on('duel:join', async ({ duelId } = {}) => {
      duelId = Number(duelId);
      if (!duelId) return socket.emit('duel:error', { message: 'Falta duelId.' });
      let duel;
      try {
        duel = await loadDuelFull(duelId);
      } catch (e) {
        return socket.emit('duel:error', { message: 'No se pudo cargar el duelo.' });
      }
      if (!duel) return socket.emit('duel:error', { message: 'Duelo no encontrado.' });
      const side = sideOf(duel, userId);
      if (!side) return socket.emit('duel:error', { message: 'No participás de este duelo.' });

      socket.join(`duel:${duelId}`);
      socket.data.duelId = duelId;
      socket.data.side = side;

      const b = getBattle(duelId);
      b.sockets[side].add(socket.id);
      // Si había una desconexión pendiente de este lado, se cancela el abandono.
      if (b.forfeitTimer && b.sockets.creator.size && b.sockets.opponent.size) {
        clearTimeout(b.forfeitTimer);
        b.forfeitTimer = null;
      }

      // Duelo ya terminado: reenviar el resultado.
      if (duel.status === 'finished') {
        return socket.emit('duel:over', { winner: duel.result?.winner ?? null, result: duel.result ?? null });
      }
      // Esperando rival.
      if (duel.status !== 'active') {
        return socket.emit('duel:waiting', { duelId });
      }

      // Activo: arrancar el combate la primera vez que ambos están presentes.
      const bothPresent = b.sockets.creator.size > 0 && b.sockets.opponent.size > 0;
      if (!b.started && bothPresent) {
        b.state = engine.startBattle(duel);
        b.started = true;
        io.to(`duel:${duelId}`).emit('duel:state', { state: b.state });
        return;
      }
      // Ya arrancado: mandarle el estado actual a quien (re)entra.
      if (b.started && b.state) {
        socket.emit('duel:state', { state: b.state });
        socket.to(`duel:${duelId}`).emit('duel:reconnected', { side });
      } else {
        socket.emit('duel:waiting', { duelId });
      }
    });

    socket.on('duel:move', async ({ duelId, action, itemId } = {}) => {
      duelId = Number(duelId);
      const b = battles.get(duelId);
      if (!b || !b.state || b.state.over) return;
      const side = socket.data.side;
      if (side !== b.state.turn) return socket.emit('duel:error', { message: 'No es tu turno.' });
      const actor = b.state[side];
      // El objeto es opcional (se puede pelear sin equipo). Si se manda uno, debe
      // estar realmente equipado.
      if (itemId != null && !actor.items.some((i) => i.id === Number(itemId))) {
        return socket.emit('duel:error', { message: 'Ese objeto no está equipado.' });
      }
      if (!['atacar', 'defender', 'esquivar'].includes(action)) {
        return socket.emit('duel:error', { message: 'Jugada inválida.' });
      }

      const { state, log } = engine.resolveMove(b.state, side, { action, itemId });
      b.state = state;
      io.to(`duel:${duelId}`).emit('duel:log', { entry: log });
      io.to(`duel:${duelId}`).emit('duel:state', { state });

      if (state.over) {
        await finalize(duelId, state.winner, 'ko');
      }
    });

    // Abandono explícito de un duelo en curso: el que se va pierde (forfeit).
    socket.on('duel:leave', async ({ duelId } = {}) => {
      duelId = Number(duelId) || socket.data.duelId;
      const side = socket.data.side;
      if (!duelId || !side) return;
      const b = battles.get(duelId);
      if (b && b.state && !b.state.over) { b.state.over = true; b.state.winner = side === 'creator' ? 'opponent' : 'creator'; }
      await finalize(duelId, side === 'creator' ? 'opponent' : 'creator', 'forfeit');
    });

    socket.on('disconnect', () => {
      const duelId = socket.data.duelId;
      const side = socket.data.side;
      if (!duelId || !side) return;
      const b = battles.get(duelId);
      if (!b) return;
      b.sockets[side].delete(socket.id);

      // Si el combate está en curso y este lado se quedó sin sockets, arranca
      // la cuenta de abandono: si no reconecta, gana el rival.
      if (b.started && b.state && !b.state.over && b.sockets[side].size === 0) {
        socket.to(`duel:${duelId}`).emit('duel:opponentLeft', {});
        if (b.forfeitTimer) clearTimeout(b.forfeitTimer);
        b.forfeitTimer = setTimeout(() => {
          if (b.sockets[side].size === 0 && b.state && !b.state.over) {
            const winner = side === 'creator' ? 'opponent' : 'creator';
            b.state.over = true;
            b.state.winner = winner;
            finalize(duelId, winner, 'forfeit');
          }
        }, FORFEIT_GRACE_MS);
      }
    });
  });

  // Persiste el resultado, transfiere el pozo y baja la salud de los compañeros.
  async function finalize(duelId, winnerSide, reason) {
    const b = battles.get(duelId);
    if (!b || b.finalizing) return;
    b.finalizing = true;
    if (b.forfeitTimer) { clearTimeout(b.forfeitTimer); b.forfeitTimer = null; }

    try {
      const duel = await strapi.db.query(DUEL_UID).findOne({
        where: { id: duelId },
        populate: { creator: true, opponent: true, creatorCompanion: true, opponentCompanion: true },
      });
      // Solo se finalizan duelos activos (evita cerrar/“regalar” uno abierto).
      if (!duel || duel.status !== 'active') return;

      const state = b.state;
      const winnerUserId = winnerSide === 'creator' ? duel.creator?.id : duel.opponent?.id;
      const wager = duel.wager || 0;

      // Salud restante de cada compañero (perdedor en 0).
      const creatorHp = Math.max(0, state ? Math.round(state.creator.hp) : duel.creatorCompanion?.currentHealth ?? 0);
      const opponentHp = Math.max(0, state ? Math.round(state.opponent.hp) : duel.opponentCompanion?.currentHealth ?? 0);
      if (duel.creatorCompanion) {
        await strapi.entityService.update(COMPANION_UID, duel.creatorCompanion.id, { data: { currentHealth: creatorHp } });
      }
      if (duel.opponentCompanion) {
        await strapi.entityService.update(COMPANION_UID, duel.opponentCompanion.id, { data: { currentHealth: opponentHp } });
      }

      // Transferir el pozo (2× wager) al ganador.
      if (winnerUserId && wager > 0) {
        const winnerUser = await strapi.entityService.findOne(USER_UID, winnerUserId, { fields: ['balance'] });
        const newBalance = (winnerUser?.balance ?? 0) + wager * 2;
        await strapi.entityService.update(USER_UID, winnerUserId, { data: { balance: newBalance } });
      }

      const result = {
        winner: winnerSide,
        winnerUserId: winnerUserId ?? null,
        reason,
        creatorHp,
        opponentHp,
        wager,
        rounds: state?.round ?? null,
      };
      await strapi.entityService.update(DUEL_UID, duelId, { data: { status: 'finished', winner: winnerUserId, result } });

      io.to(`duel:${duelId}`).emit('duel:over', { winner: winnerSide, result });
    } catch (e) {
      strapi.log.error(`[battledome] error finalizando duelo ${duelId}: ${e.message}`);
    } finally {
      // Libera la memoria un rato después (deja que lleguen los últimos eventos).
      setTimeout(() => battles.delete(duelId), 10000);
    }
  }

  strapi.log.info('[battledome] socket.io de duelos inicializado.');
};
