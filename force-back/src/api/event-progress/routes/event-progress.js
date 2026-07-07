'use strict';

/**
 * event-progress router (CRUD genérico, sin permisos otorgados: no es alcanzable
 * públicamente; el progreso se gestiona vía el motor de eventos).
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::event-progress.event-progress');
