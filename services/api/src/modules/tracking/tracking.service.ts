import { Injectable } from '@nestjs/common';
import { IntegrationService } from '../../common/services/integration.service';
import { ShipmentsService } from '../shipments/shipments.service';

export interface TrackingEvent {
  trackingNumber: string;
  status: 'pending' | 'booked' | 'in_transit' | 'delivered' | 'failed';
  location: string;
  timestamp: string;
}

@Injectable()
export class TrackingService {
  private readonly events: TrackingEvent[] = [];

  constructor(
    private readonly shipmentsService: ShipmentsService,
    private readonly integrationService: IntegrationService
  ) {}

  async createEvent(event: Omit<TrackingEvent, 'timestamp'>) {
    const record: TrackingEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };
    this.events.push(record);

    const shipment = await this.shipmentsService.updateStatus(event.trackingNumber, event.status);
    await this.integrationService.emitEvent('tracking.updated', {
      tracking: record,
      shipment
    });
    await this.integrationService.syncToStrapi('tracking-events', {
      shipmentId: shipment.id,
      trackingNumber: record.trackingNumber,
      status: record.status,
      location: record.location,
      eventTimestamp: record.timestamp
    });

    return record;
  }

  getTimeline(trackingNumber: string) {
    return this.events.filter((event) => event.trackingNumber === trackingNumber);
  }
}
