'use strict';

const { Server } = require('socket.io');
const seed = require('./seed');
const initSockets = require('./socket');

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // Seed idempotente del universo Force (permisos + datos demo).
    // Se puede desactivar con SEED=false en el entorno.
    if (process.env.SEED !== 'false') {
      await seed({ strapi });
    }

    // Servidor de sockets del Battledome (combate en vivo). Se adjunta al
    // httpServer de Strapi. CORS hacia el frontend (FRONTEND_URL).
    const io = new Server(strapi.server.httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
      },
    });
    initSockets(strapi, io);
  },
};
