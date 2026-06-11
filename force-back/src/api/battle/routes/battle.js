'use strict';

/**
 * Rutas del battledome (lobby de duelos). El combate en vivo va por sockets.
 */

module.exports = {
  routes: [
    { method: 'GET', path: '/battle/duels', handler: 'battle.duels', config: { policies: [] } },
    { method: 'POST', path: '/battle/duels', handler: 'battle.create', config: { policies: [] } },
    { method: 'GET', path: '/battle/duels/:id', handler: 'battle.get', config: { policies: [] } },
    { method: 'POST', path: '/battle/duels/:id/join', handler: 'battle.join', config: { policies: [] } },
    { method: 'POST', path: '/battle/duels/:id/cancel', handler: 'battle.cancel', config: { policies: [] } },
  ],
};
