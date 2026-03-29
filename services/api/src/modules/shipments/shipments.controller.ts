import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsNumber, IsString, Min } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ShipmentsService } from './shipments.service';

class CreateShipmentDto {
  @IsString()
  origin!: string;

  @IsString()
  destination!: string;

  @IsNumber()
  @Min(0.01)
  weight!: number;

  @IsNumber()
  @Min(0.001)
  volume!: number;
}

@Controller('shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post()
  @Roles('admin', 'operator', 'shipper')
  create(@Body() dto: CreateShipmentDto) {
    return this.shipmentsService.create(dto);
  }

  @Get(':trackingNumber')
  @Roles('admin', 'operator', 'shipper')
  getByTracking(@Param('trackingNumber') trackingNumber: string) {
    return this.shipmentsService.getByTracking(trackingNumber);
  }
}
