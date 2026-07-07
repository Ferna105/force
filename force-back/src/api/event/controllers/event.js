'use strict';

/**
 * event controller (code-only sobre el content type event; sin createCoreRouter
 * para no exponer el CRUD genérico). Ver src/api/event/engine.js y el README.
 *
 * - `active`  GET  /events/active        → eventos activos + progreso del usuario.
 * - `detail`  GET  /events/:id           → un evento + progreso del usuario.
 * - `step`    POST /events/:id/step/:key → resuelve un paso interactivo (flag) y
 *                                          reevalúa el progreso.
 */

const {
  resolveEvent, getOrCreateProgress, evaluateSteps, toView, STEP_RESOLVERS,
} = require('../engine');
const { loadContext } = require('../../discovery/engine');

const EVENT_UID = 'api::event.event';
const PROGRESS_UID = 'api::event-progress.event-progress';

// ¿El evento está abierto? (activo y ya empezó, si tiene fecha de inicio).
function isEventOpen(event) {
  if (!event?.active) return false;
  if (event.startsAt && new Date(event.startsAt) > new Date()) return false;
  return true;
}

module.exports = {
  async active(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');

    const events = await strapi.entityService.findMany(EVENT_UID, {
      filters: { active: true },
      populate: { Image: true },
    });
    const open = events.filter(isEventOpen);
    const context = await loadContext(strapi, user.id);

    const views = [];
    for (const ev of open) {
      const { view } = await resolveEvent(strapi, user.id, ev, context);
      views.push(view);
    }
    return ctx.send({ events: views });
  },

  async detail(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');

    const event = await strapi.entityService.findOne(EVENT_UID, Number(ctx.params.id), {
      populate: { Image: true },
    });
    if (!event) return ctx.notFound('Evento no encontrado.');

    const { view } = await resolveEvent(strapi, user.id, event, null);
    return ctx.send({ event: view });
  },

  async step(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Debés iniciar sesión.');

    const eventId = Number(ctx.params.id);
    const key = ctx.params.key;
    const event = await strapi.entityService.findOne(EVENT_UID, eventId, { populate: { Image: true } });
    if (!event) return ctx.notFound('Evento no encontrado.');
    if (!isEventOpen(event)) return ctx.badRequest('El evento no está activo.');

    const steps = Array.isArray(event.steps) ? event.steps : [];
    const idx = steps.findIndex((s) => s.key === key);
    if (idx < 0) return ctx.notFound('Paso no encontrado.');
    const step = steps[idx];

    const resolver = STEP_RESOLVERS[step.type];
    if (!resolver) return ctx.badRequest('Este paso se resuelve solo (no manualmente).');

    const context = await loadContext(strapi, user.id);
    const progress = await getOrCreateProgress(strapi, user.id, eventId);
    const state = progress.state || {};
    const { completedKeys, currentStep } = evaluateSteps(steps, context, state);

    // Idempotente: si el paso ya está cumplido, devolvemos la vista tal cual.
    if (completedKeys.includes(key)) {
      return ctx.send({ view: toView(event, progress, completedKeys, currentStep), rewardsGranted: null });
    }
    // Orden: solo se puede resolver el paso actual.
    if (idx !== currentStep) return ctx.badRequest('Todavía no llegaste a este paso.');

    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    const res = resolver(step, body, context);
    if (!res.ok) return ctx.badRequest(res.error || 'No se pudo resolver el paso.');

    await strapi.entityService.update(PROGRESS_UID, progress.id, {
      data: { state: { ...state, ...(res.patch || {}) } },
    });

    const out = await resolveEvent(strapi, user.id, event, context);
    return ctx.send(out);
  },
};
