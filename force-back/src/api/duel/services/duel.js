'use strict';

/**
 * duel service (core).
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::duel.duel');
