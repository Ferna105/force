'use strict';

/**
 * shop-stock service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::shop-stock.shop-stock');
