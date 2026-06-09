'use strict';

/**
 * monster service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::monster.monster');
