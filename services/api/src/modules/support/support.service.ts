import { Injectable } from '@nestjs/common';
import { IntegrationService } from '../../common/services/integration.service';
import { BookingsService } from '../bookings/bookings.service';
import { ShipmentsService } from '../shipments/shipments.service';
import { TrackingService } from '../tracking/tracking.service';

interface KnowledgeEntry {
  key: string;
  answer: string;
}

@Injectable()
export class SupportService {
  private readonly knowledgeBase: KnowledgeEntry[] = [
    {
      key: 'pricing',
      answer:
        'Pricing is calculated from weight, CBM and lane rules. Use /api/pricing/calculate to get a live quote.'
    },
    {
      key: 'payment',
      answer:
        'Use /api/payments/checkout-session to generate a Stripe payment link tied to a booking.'
    },
    {
      key: 'booking',
      answer:
        'Create a shipment first, then create a booking with shipmentId and customer email. Booking status starts as pending.'
    },
    {
      key: 'tracking',
      answer:
        'Tracking status flow is pending -> booked -> in_transit -> delivered or failed. Use /api/tracking/events for updates.'
    }
  ];

  constructor(
    private readonly shipmentsService: ShipmentsService,
    private readonly bookingsService: BookingsService,
    private readonly trackingService: TrackingService,
    private readonly integrationService: IntegrationService
  ) {}

  private resolveKnowledgeAnswer(query: string) {
    const normalized = query.toLowerCase();
    const hit = this.knowledgeBase.find((entry) => normalized.includes(entry.key));
    return hit?.answer;
  }

  async answerQuery(payload: { customerEmail: string; query: string }) {
    const answer = this.resolveKnowledgeAnswer(payload.query);
    const trackingMatch = payload.query.match(/JET-[A-Za-z0-9-]+/i);

    let context: Record<string, unknown> = {};

    if (trackingMatch) {
      const trackingNumber = trackingMatch[0].toUpperCase();
      try {
        const shipment = this.shipmentsService.getByTracking(trackingNumber);
        const timeline = this.trackingService.getTimeline(trackingNumber);
        const bookings = this.bookingsService.getByShipmentId(shipment.id);

        context = {
          trackingNumber,
          shipment,
          timeline,
          bookings
        };
      } catch {
        context = {
          trackingNumber,
          message: 'No shipment record was found for the provided tracking number.'
        };
      }
    }

    const responseText =
      answer ||
      'I can help with pricing, bookings, tracking, payments, and shipment status. Include a tracking number like JET-123 to fetch live status.';

    const response = {
      channel: 'support-bot',
      customerEmail: payload.customerEmail,
      query: payload.query,
      answer: responseText,
      context,
      answeredAt: new Date().toISOString()
    };

    await this.integrationService.emitEvent('support.query.received', response);
    return response;
  }

  async handleWhatsAppMessage(payload: {
    from: string;
    body: string;
    customerEmail?: string;
  }) {
    const result = await this.answerQuery({
      customerEmail: payload.customerEmail || `${payload.from}@whatsapp.local`,
      query: payload.body
    });

    return {
      twiml: `<Response><Message>${result.answer}</Message></Response>`,
      result
    };
  }

  handleWhatsAppVoice() {
    return {
      twiml:
        '<Response><Say voice="alice">Hello from Jeton Cargo support. Please send your tracking number on WhatsApp message and our bot will respond instantly.</Say></Response>'
    };
  }
}
