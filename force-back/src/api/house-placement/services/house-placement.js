'use strict';

/**
 * house-placement service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::house-placement.house-placement');
