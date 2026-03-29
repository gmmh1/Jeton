import { Injectable } from '@nestjs/common';
import { ShipmentsService } from '../shipments/shipments.service';

@Injectable()
export class ScanService {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  lookup(code: string) {
    const shipment = this.shipmentsService.getByTracking(code);
    return {
      shipment,
      scannedAt: new Date().toISOString()
    };
  }
}
