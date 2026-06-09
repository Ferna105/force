'use strict';

/**
 * Rutas del motor de descubrimiento.
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/discovery/event',
      handler: 'discovery.event',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/discovery/sync',
      handler: 'discovery.sync',
      config: { policies: [] },
    },
  ],
};
