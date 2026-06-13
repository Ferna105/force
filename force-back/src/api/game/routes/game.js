'use strict';

/**
 * Rutas del motor de juegos (places de tipo `game`).
 * `status`/`claim` requieren sesión (el cooldown es por usuario); `leaderboard`
 * es público (visible sin sesión; con token resalta al usuario actual).
 */

module.exports = {
  routes: [
    { method: 'GET', path: '/games/:placeId/status', handler: 'game.status', config: { policies: [] } },
    { method: 'POST', path: '/games/:placeId/claim', handler: 'game.claim', config: { policies: [] } },
    { method: 'GET', path: '/games/:placeId/leaderboard', handler: 'game.leaderboard', config: { policies: [] } },
  ],
};
