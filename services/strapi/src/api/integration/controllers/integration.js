'use strict';

module.exports = {
  async upsertShipment(ctx) {
    const payload = ctx.request.body?.data || ctx.request.body || {};
    const entry = await strapi.entityService.create('api::shipment.shipment', {
      data: payload
    });
    ctx.body = { id: entry.id };
  },

  async createBooking(ctx) {
    const payload = ctx.request.body?.data || ctx.request.body || {};
    const entry = await strapi.entityService.create('api::booking.booking', {
      data: payload
    });
    ctx.body = { id: entry.id };
  },

  async createTrackingEvent(ctx) {
    const payload = ctx.request.body?.data || ctx.request.body || {};
    const entry = await strapi.entityService.create('api::tracking-event.tracking-event', {
      data: payload
    });
    ctx.body = { id: entry.id };
  }
};