'use strict';

/**
 * Ruta personalizada: inventario del usuario autenticado.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/inventory-entries/mine',
      handler: 'inventory-entry.mine',
      config: { policies: [] },
    },
  ],
};
