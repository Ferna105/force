'use strict';

/**
 * Rutas de la tienda.
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/shop/buy',
      handler: 'shop.buy',
      config: { policies: [] },
    },
  ],
};
