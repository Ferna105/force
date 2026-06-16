'use strict';

/**
 * Rutas de la escuela de entrenamiento (code-only, patrón `shop`/`battle`).
 */

module.exports = {
  routes: [
    { method: 'GET', path: '/training/:placeId/info', handler: 'training.info', config: { policies: [] } },
    { method: 'POST', path: '/training/:placeId/start', handler: 'training.start', config: { policies: [] } },
  ],
};
