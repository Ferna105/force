'use strict';

/**
 * user-event service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::user-event.user-event');
