'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/integrations/shipments',
      handler: 'integration.upsertShipment',
      config: {
        auth: false
      }
    },
    {
      method: 'POST',
      path: '/integrations/bookings',
      handler: 'integration.createBooking',
      config: {
        auth: false
      }
    },
    {
      method: 'POST',
      path: '/integrations/tracking-events',
      handler: 'integration.createTrackingEvent',
      config: {
        auth: false
      }
    }
  ]
};