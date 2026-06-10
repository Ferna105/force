'use strict';

/**
 * Tareas programadas de Strapi.
 *
 * `restockShops`: cada minuto regenera el stock de las tiendas que estén
 * agotadas y cuyo cooldown de 5 min (`RestockAt`) ya venció. Es el único punto
 * de generación de stock (junto al seed en bootstrap), de modo que nunca corre
 * en el camino de lectura → no hay race de doble generación entre usuarios.
 */

const { restockDueShops } = require('../src/api/shop/stock');

module.exports = {
  restockShops: {
    task: async ({ strapi }) => {
      try {
        await restockDueShops(strapi);
      } catch (err) {
        strapi.log.error(`[cron] restockShops falló: ${err.message}`);
      }
    },
    options: {
      rule: '* * * * *', // cada minuto
    },
  },
};
