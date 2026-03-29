import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { IntegrationModule } from './common/modules/integration.module';
import { AuthModule } from './modules/auth/auth.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { ScanModule } from './modules/scan/scan.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SupportModule } from './modules/support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    IntegrationModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: Number(process.env.THROTTLE_TTL || 60),
          limit: Number(process.env.THROTTLE_LIMIT || 120)
        }
      ]
    }),
    AuthModule,
    PricingModule,
    BookingsModule,
    ShipmentsModule,
    TrackingModule,
    ScanModule,
    PaymentsModule,
    SupportModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
