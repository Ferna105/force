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
    {
      method: 'GET',
      path: '/shop/:placeId/stock',
      handler: 'shop.stock',
      config: { policies: [] },
    },
  ],
};
