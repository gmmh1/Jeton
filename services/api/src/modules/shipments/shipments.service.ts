import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IntegrationService } from '../../common/services/integration.service';

export interface ShipmentRecord {
  id: string;
  trackingNumber: string;
  origin: string;
  destination: string;
  status: 'pending' | 'booked' | 'in_transit' | 'delivered' | 'failed';
  weight: number;
  volume: number;
}

@Injectable()
export class ShipmentsService {
  private readonly shipments: ShipmentRecord[] = [];

  constructor(private readonly integrationService: IntegrationService) {}

  async create(payload: Omit<ShipmentRecord, 'id' | 'trackingNumber' | 'status'>) {
    const shipment: ShipmentRecord = {
      id: randomUUID(),
      trackingNumber: `JET-${Date.now()}`,
      status: 'pending',
      ...payload
    };
    this.shipments.push(shipment);

    await this.integrationService.emitEvent('shipment.created', shipment);
    await this.integrationService.syncToStrapi('shipments', {
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      origin: shipment.origin,
      destination: shipment.destination,
      status: shipment.status,
      weight: shipment.weight,
      volume: shipment.volume
    });

    return shipment;
  }

  getById(id: string) {
    const shipment = this.shipments.find((s) => s.id === id);
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    return shipment;
  }

  getByTracking(trackingNumber: string) {
    const shipment = this.shipments.find((s) => s.trackingNumber === trackingNumber);
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    return shipment;
  }

  async updateStatus(trackingNumber: string, status: ShipmentRecord['status']) {
    const shipment = this.getByTracking(trackingNumber);
    shipment.status = status;

    await this.integrationService.syncToStrapi('shipments', {
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      origin: shipment.origin,
      destination: shipment.destination,
      status: shipment.status,
      weight: shipment.weight,
      volume: shipment.volume
    });

    return shipment;
  }

  async updateStatusByShipmentId(id: string, status: ShipmentRecord['status']) {
    const shipment = this.getById(id);
    shipment.status = status;

    await this.integrationService.syncToStrapi('shipments', {
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      origin: shipment.origin,
      destination: shipment.destination,
      status: shipment.status,
      weight: shipment.weight,
      volume: shipment.volume
    });

    return shipment;
  }
}
