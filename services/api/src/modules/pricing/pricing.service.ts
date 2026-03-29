import { Injectable } from '@nestjs/common';

interface PricingRequest {
  origin: string;
  destination: string;
  weight: number;
  cbm: number;
}

@Injectable()
export class PricingService {
  calculate(input: PricingRequest) {
    const perKg = 2.75;
    const perCbm = 120;
    const base = Math.max(input.weight * perKg, input.cbm * perCbm);
    const margin = 1.12;
    return {
      origin: input.origin,
      destination: input.destination,
      amount: Number((base * margin).toFixed(2)),
      currency: 'USD'
    };
  }
}
