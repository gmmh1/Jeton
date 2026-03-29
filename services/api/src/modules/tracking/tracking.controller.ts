import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TrackingService } from './tracking.service';

class CreateTrackingEventDto {
  @IsString()
  trackingNumber!: string;

  @IsString()
  status!: 'pending' | 'booked' | 'in_transit' | 'delivered' | 'failed';

  @IsString()
  location!: string;
}

@Controller('tracking')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('events')
  @Roles('admin', 'operator')
  createEvent(@Body() dto: CreateTrackingEventDto) {
    return this.trackingService.createEvent(dto);
  }

  @Get(':trackingNumber')
  @Roles('admin', 'operator', 'shipper')
  getTimeline(@Param('trackingNumber') trackingNumber: string) {
    return this.trackingService.getTimeline(trackingNumber);
  }
}
