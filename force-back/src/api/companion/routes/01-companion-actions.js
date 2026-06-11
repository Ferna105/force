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
      // Adoptar un monstruo como compañero del usuario autenticado.
      method: 'POST',
      path: '/companions/adopt',
      handler: 'companion.adopt',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/companions/:id/equip',
      handler: 'companion.equip',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/companions/:id/unequip',
      handler: 'companion.unequip',
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
