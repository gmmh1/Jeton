import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { ShipmentsModule } from '../shipments/shipments.module';
import { TrackingModule } from '../tracking/tracking.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [ShipmentsModule, BookingsModule, TrackingModule],
  controllers: [SupportController],
  providers: [SupportService]
})
export class SupportModule {}
