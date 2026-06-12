'use strict';

/**
 * Rutas del motor de juegos (places de tipo `game`).
 * Ambas requieren usuario autenticado (el cooldown es por usuario).
 */

module.exports = {
  routes: [
    { method: 'GET', path: '/games/:placeId/status', handler: 'game.status', config: { policies: [] } },
    { method: 'POST', path: '/games/:placeId/claim', handler: 'game.claim', config: { policies: [] } },
  ],
};
