import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BookingsService } from './bookings.service';

class CreateBookingDto {
  @IsString()
  shipmentId!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  airline?: string;
}

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles('admin', 'operator', 'shipper')
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }
}
