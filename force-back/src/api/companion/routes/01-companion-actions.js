'use strict';

/**
 * Rutas personalizadas de cuidado del compañero (feed / play / pet).
 * Se cargan junto a las rutas core del companion router.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/companions/mine',
      handler: 'companion.mine',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/companions/:id/feed',
      handler: 'companion.feed',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/companions/:id/play',
      handler: 'companion.play',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/companions/:id/pet',
      handler: 'companion.pet',
      config: { policies: [] },
    },
  ],
};
