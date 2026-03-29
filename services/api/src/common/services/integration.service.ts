import { Injectable, Logger } from '@nestjs/common';

type IntegrationEvent =
  | 'shipment.created'
  | 'booking.created'
  | 'tracking.updated'
  | 'payment.link.created'
  | 'support.query.received';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  private resolveN8nPath(event: IntegrationEvent, payload: unknown) {
    if (event === 'booking.created') {
      return 'new-booking';
    }

    if (event === 'tracking.updated') {
      const status = (payload as { tracking?: { status?: string } })?.tracking?.status;
      if (status === 'failed') {
        return 'shipment-failed';
      }
      return 'shipment-status';
    }

    if (event === 'payment.link.created') {
      return 'invoice-created';
    }

    if (event === 'support.query.received') {
      return 'customer-support';
    }

    return null;
  }

  async emitEvent(event: IntegrationEvent, payload: unknown) {
    const base = (process.env.N8N_WEBHOOK_BASE_URL || '').replace(/\/$/, '');
    if (!base) {
      return;
    }

    const path = this.resolveN8nPath(event, payload);
    if (!path) {
      return;
    }

    try {
      const response = await fetch(`${base}/${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          event,
          payload,
          emittedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        this.logger.warn(`n8n webhook failed: ${response.status} ${response.statusText} for ${event}`);
      }
    } catch (error) {
      this.logger.warn(`n8n webhook error for ${event}: ${(error as Error).message}`);
    }
  }

  async syncToStrapi(collection: 'shipments' | 'bookings' | 'tracking-events', data: unknown) {
    const base = (process.env.STRAPI_INTERNAL_URL || '').replace(/\/$/, '');
    if (!base) {
      return;
    }

    const ingestPath = process.env.STRAPI_INGEST_BASE_PATH || '/api/integrations';
    const token = process.env.STRAPI_API_TOKEN || '';
    const headers: Record<string, string> = {
      'content-type': 'application/json'
    };
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${base}${ingestPath}/${collection}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data })
      });

      if (!response.ok) {
        this.logger.warn(`Strapi sync failed: ${response.status} ${response.statusText} for ${collection}`);
      }
    } catch (error) {
      this.logger.warn(`Strapi sync error for ${collection}: ${(error as Error).message}`);
    }
  }
}