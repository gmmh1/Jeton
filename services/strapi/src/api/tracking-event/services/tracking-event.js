'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::tracking-event.tracking-event');
