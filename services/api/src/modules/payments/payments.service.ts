import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { IntegrationService } from '../../common/services/integration.service';
import { BookingsService } from '../bookings/bookings.service';

type PaymentStatus = 'created' | 'paid' | 'failed';

export interface PaymentRecord {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  checkoutUrl: string;
  provider: 'stripe' | 'mock';
  createdAt: string;
}

@Injectable()
export class PaymentsService {
  private readonly payments: PaymentRecord[] = [];
  private stripeClient: Stripe | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly bookingsService: BookingsService,
    private readonly integrationService: IntegrationService
  ) {}

  private getStripeClient() {
    if (this.stripeClient) {
      return this.stripeClient;
    }

    const stripeSecretKey = (this.configService.get<string>('STRIPE_SECRET_KEY') || '').trim();
    if (!stripeSecretKey) {
      return null;
    }

    this.stripeClient = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia'
    });
    return this.stripeClient;
  }

  async createCheckoutSession(payload: {
    bookingId: string;
    amount: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const booking = this.bookingsService.getById(payload.bookingId);
    const stripe = this.getStripeClient();
    let checkoutUrl = '';
    let provider: 'stripe' | 'mock' = 'mock';

    if (stripe) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: booking.email,
        success_url: payload.successUrl,
        cancel_url: payload.cancelUrl,
        metadata: {
          bookingId: booking.id,
          shipmentId: booking.shipmentId,
          email: booking.email
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: payload.currency.toLowerCase(),
              unit_amount: Math.round(payload.amount * 100),
              product_data: {
                name: `Jeton booking ${booking.id}`,
                description: `Shipment ${booking.shipmentId}`
              }
            }
          }
        ]
      });

      checkoutUrl = session.url || '';
      provider = 'stripe';
    } else {
      checkoutUrl = `${payload.successUrl}?mock_payment=1&bookingId=${booking.id}`;
    }

    const payment: PaymentRecord = {
      id: randomUUID(),
      bookingId: booking.id,
      amount: payload.amount,
      currency: payload.currency.toUpperCase(),
      status: 'created',
      checkoutUrl,
      provider,
      createdAt: new Date().toISOString()
    };

    this.payments.push(payment);

    await this.integrationService.emitEvent('payment.link.created', {
      invoiceId: payment.id,
      bookingId: payment.bookingId,
      customerEmail: booking.email,
      paymentLink: payment.checkoutUrl,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider
    });

    return payment;
  }

  markPaid(paymentId: string) {
    const payment = this.payments.find((entry) => entry.id === paymentId);
    if (!payment) {
      return { ok: false };
    }

    payment.status = 'paid';
    return { ok: true, payment };
  }

  getByBooking(bookingId: string) {
    return this.payments.filter((entry) => entry.bookingId === bookingId);
  }
}
