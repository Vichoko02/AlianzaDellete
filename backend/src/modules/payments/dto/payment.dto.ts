import { IsArray, IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateCheckoutDto {
  @IsArray()
  items: {
    productId: string;
    variantId: string;
    quantity: number;
  }[];

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;

  @IsOptional()
  @IsString()
  shippingCountry?: string;
}

export class CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export class WebhookPayload {
  @IsString()
  @IsNotEmpty()
  type: string;

  data: {
    object: any;
  };
}
