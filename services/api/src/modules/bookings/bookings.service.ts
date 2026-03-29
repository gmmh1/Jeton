import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IntegrationService } from '../../common/services/integration.service';
import { ShipmentsService } from '../shipments/shipments.service';

export interface BookingRecord {
  id: string;
  shipmentId: string;
  email: string;
  airline?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

@Injectable()
export class BookingsService {
  private readonly bookings: BookingRecord[] = [];

  constructor(
    private readonly shipmentsService: ShipmentsService,
    private readonly integrationService: IntegrationService
  ) {}

  async create(payload: { shipmentId: string; email: string; airline?: string }) {
    const shipment = this.shipmentsService.getById(payload.shipmentId);
    const booking: BookingRecord = {
      id: randomUUID(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...payload
    };

    this.bookings.push(booking);
    await this.shipmentsService.updateStatus(shipment.trackingNumber, 'booked');

    await this.integrationService.emitEvent('booking.created', {
      booking,
      shipment
    });
    await this.integrationService.syncToStrapi('bookings', {
      bookingId: booking.id,
      shipmentId: booking.shipmentId,
      email: booking.email,
      airline: booking.airline,
      status: booking.status,
      trackingNumber: shipment.trackingNumber,
      shipmentStatus: 'booked',
      createdAtSource: booking.createdAt
    });

    return booking;
  }

  getById(bookingId: string) {
    const booking = this.bookings.find((entry) => entry.id === bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  getByShipmentId(shipmentId: string) {
    return this.bookings.filter((entry) => entry.shipmentId === shipmentId);
  }
}
