'use strict';

module.exports = {
  async upsertShipment(ctx) {
    const payload = ctx.request.body?.data || ctx.request.body || {};
    if (!payload.trackingNumber) {
      ctx.throw(400, 'trackingNumber is required');
    }

    const existing = await strapi.entityService.findMany('api::shipment.shipment', {
      filters: { trackingNumber: payload.trackingNumber },
      limit: 1
    });

    let entry;
    if (existing?.length) {
      entry = await strapi.entityService.update('api::shipment.shipment', existing[0].id, {
        data: payload
      });
    } else {
      entry = await strapi.entityService.create('api::shipment.shipment', {
        data: payload
      });
    }

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