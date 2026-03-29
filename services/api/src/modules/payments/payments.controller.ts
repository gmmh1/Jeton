import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsNumber, IsString, Min } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaymentsService } from './payments.service';

class CreateCheckoutSessionDto {
  @IsString()
  bookingId!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  currency!: string;

  @IsString()
  successUrl!: string;

  @IsString()
  cancelUrl!: string;
}

class StripeWebhookDto {
  @IsString()
  eventType!: string;

  @IsString()
  paymentId!: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout-session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator', 'shipper')
  createCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    return this.paymentsService.createCheckoutSession(dto);
  }

  @Post('webhook')
  stripeWebhook(@Body() dto: StripeWebhookDto) {
    if (dto.eventType === 'checkout.session.completed') {
      return this.paymentsService.markPaid(dto.paymentId);
    }

    return { ok: true, ignored: true };
  }

  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator', 'shipper')
  getByBooking(@Param('bookingId') bookingId: string) {
    return this.paymentsService.getByBooking(bookingId);
  }
}
