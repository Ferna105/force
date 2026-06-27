'use strict';

/**
 * house-design service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::house-design.house-design');
