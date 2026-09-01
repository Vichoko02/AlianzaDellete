import { Injectable, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject('STRIPE_CLIENT') private stripe: Stripe,
    @Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin,
  ) {}

  private readonly supportedCurrencies = ['usd', 'mxn', 'cop', 'ars', 'clp', 'pen', 'eur'];

  async createCheckoutSession(userId: string, dto: CreateCheckoutDto) {
    const db = this.firebaseAdmin.firestore();

    const productsSnapshot = await db.collection('products')
      .where(admin.firestore.FieldPath.documentId(), 'in', dto.items.map(i => i.productId))
      .get();

    const productsMap = new Map();
    productsSnapshot.docs.forEach(doc => {
      productsMap.set(doc.id, doc.data());
    });

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let orderItems: any[] = [];
    let totalAmount = 0;

    for (const item of dto.items) {
      const product = productsMap.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Producto ${item.productId} no encontrado`);
      }

      const variant = product.variants?.find((v: any) => v.id === item.variantId);
      if (!variant) {
        throw new BadRequestException(`Variante ${item.variantId} no encontrada`);
      }

      const price = product.price + (variant.priceModifier || 0);
      const itemTotal = price * item.quantity;
      totalAmount += itemTotal;

      lineItems.push({
        price_data: {
          currency: dto.currency.toLowerCase(),
          product_data: {
            name: `${product.name} - ${variant.name}`,
            images: product.images?.slice(0, 1) || [],
            metadata: {
              productId: product.id,
              variantId: variant.id,
            },
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: item.quantity,
      });

      orderItems.push({
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantName: variant.name,
        quantity: item.quantity,
        unitPrice: price,
        subtotal: itemTotal,
        image: product.images?.[0] || '',
      });
    }

    const currency = dto.currency.toLowerCase();
    if (!this.supportedCurrencies.includes(currency)) {
      throw new BadRequestException(`Moneda ${currency} no soportada`);
    }

    const orderId = db.collection('orders').doc().id;
    const orderNumber = `ALI-${new Date().getFullYear()}-${orderId.substring(0, 8).toUpperCase()}`;

    const orderData = {
      orderId,
      orderNumber,
      userId,
      items: orderItems,
      subtotal: totalAmount,
      shippingCost: 0,
      total: totalAmount,
      currency: dto.currency.toUpperCase(),
      status: 'pending',
      shippingAddress: null,
      stripeSessionId: '',
      stripePaymentIntentId: '',
      trackingInfo: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('orders').doc(orderId).set(orderData);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: undefined,
      client_reference_id: orderId,
      metadata: {
        userId,
        orderId,
      },
      success_url: dto.successUrl || `${frontendUrl}/order/${orderId}/success`,
      cancel_url: dto.cancelUrl || `${frontendUrl}/store?canceled=true`,
      locale: 'es',
    });

    await db.collection('orders').doc(orderId).update({
      stripeSessionId: session.id,
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    const db = this.firebaseAdmin.firestore();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId || session.client_reference_id;

        if (orderId) {
          await db.collection('orders').doc(orderId).update({
            status: 'paid',
            stripePaymentIntentId: session.payment_intent,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const orderDoc = await db.collection('orders').doc(orderId).get();
          const orderData = orderDoc.data();

          if (orderData?.userId) {
            await db.collection('users').doc(orderData.userId).update({
              purchaseHistory: admin.firestore.FieldValue.arrayUnion(orderId),
            });
          }

          await this.processOrderFulfillment(orderId, orderData);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId || session.client_reference_id;

        if (orderId) {
          await db.collection('orders').doc(orderId).update({
            status: 'expired',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          await db.collection('orders').doc(orderId).update({
            status: 'payment_failed',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        break;
      }
    }

    return { received: true };
  }

  private async processOrderFulfillment(orderId: string, orderData: any) {
    const db = this.firebaseAdmin.firestore();

    for (const item of orderData.items) {
      const reserveStock = 0;
      
      console.log(`Procesando fulfillment para orden ${orderId}:`, {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      });
    }

    await db.collection('orders').doc(orderId).update({
      status: 'processing',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  async getSessionStatus(sessionId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    return {
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
    };
  }
}
