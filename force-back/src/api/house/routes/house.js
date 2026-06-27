'use strict';

/**
 * Rutas del motor de vecindarios/casas (code-only sobre el content type house;
 * no se usa createCoreRouter para no exponer el CRUD genérico ni colisionar con
 * GET /houses/:id). El orden importa: /houses/mine antes de /houses/:id.
 */

module.exports = {
  routes: [
    { method: 'GET', path: '/neighborhoods/:placeId/parcels', handler: 'house.parcels', config: { policies: [] } },
    { method: 'POST', path: '/neighborhoods/:placeId/buy', handler: 'house.buy', config: { policies: [] } },
    { method: 'GET', path: '/houses/mine', handler: 'house.mine', config: { policies: [] } },
    { method: 'POST', path: '/houses/:id/place', handler: 'house.place', config: { policies: [] } },
    { method: 'POST', path: '/houses/:id/remove', handler: 'house.remove', config: { policies: [] } },
    { method: 'POST', path: '/houses/:id/visibility', handler: 'house.visibility', config: { policies: [] } },
    { method: 'GET', path: '/houses/:id', handler: 'house.detail', config: { policies: [] } },
  ],
};
