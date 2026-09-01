import { Module, Global } from '@nestjs/common';
import Stripe from 'stripe';

@Global()
@Module({
  providers: [
    {
      provide: 'STRIPE_CLIENT',
      useFactory: (): Stripe => {
        return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
          apiVersion: '2023-10-16',
        });
      },
    },
  ],
  exports: ['STRIPE_CLIENT'],
})
export class StripeConfigModule {}

export { StripeConfigModule };
