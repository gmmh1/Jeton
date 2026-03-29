import { Body, Controller, Post } from '@nestjs/common';
import { IsNumber, IsString, Min } from 'class-validator';
import { PricingService } from './pricing.service';

class CalculatePricingDto {
  @IsString()
  origin!: string;

  @IsString()
  destination!: string;

  @IsNumber()
  @Min(0.01)
  weight!: number;

  @IsNumber()
  @Min(0.001)
  cbm!: number;
}

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('calculate')
  calculate(@Body() dto: CalculatePricingDto) {
    return this.pricingService.calculate(dto);
  }
}
