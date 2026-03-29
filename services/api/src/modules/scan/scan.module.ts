import { Module } from '@nestjs/common';
import { ShipmentsModule } from '../shipments/shipments.module';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';

@Module({
  imports: [ShipmentsModule],
  controllers: [ScanController],
  providers: [ScanService]
})
export class ScanModule {}
