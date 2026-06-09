'use strict';

/**
 * inventory-entry service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::inventory-entry.inventory-entry');
