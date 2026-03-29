import { Module } from '@nestjs/common';
import { ShipmentsModule } from '../shipments/shipments.module';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

@Module({
  imports: [ShipmentsModule],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService]
})
export class TrackingModule {}
