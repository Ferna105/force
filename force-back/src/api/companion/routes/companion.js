'use strict';

/**
 * companion router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::companion.companion');
