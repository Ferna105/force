'use strict';

/**
 * shop-stock controller (boilerplate; el stock se maneja desde el API shop).
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::shop-stock.shop-stock');
