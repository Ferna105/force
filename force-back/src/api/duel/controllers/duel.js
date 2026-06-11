'use strict';

/**
 * duel controller (scaffold core).
 *
 * Los duelos se operan por el API custom `battle` (crear / inscribirse /
 * cancelar / cargar) y el servidor de sockets; las rutas core quedan sin
 * permisos de rol (uso interno).
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::duel.duel');
