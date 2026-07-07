'use strict';

/**
 * Rutas del motor de eventos (code-only sobre el content type event; no se usa
 * createCoreRouter para no exponer el CRUD genérico). El orden importa:
 * /events/active antes de /events/:id.
 */

module.exports = {
  routes: [
    { method: 'GET', path: '/events/active', handler: 'event.active', config: { policies: [] } },
    { method: 'GET', path: '/events/:id', handler: 'event.detail', config: { policies: [] } },
    { method: 'POST', path: '/events/:id/step/:key', handler: 'event.step', config: { policies: [] } },
  ],
};
