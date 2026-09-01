import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface ShippingRate {
  method: string;
  minDays: number;
  maxDays: number;
  price: number;
  freeOver?: number;
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  regions: string[];
  rates: ShippingRate[];
  isActive: boolean;
}

export const LATIN_AMERICA_COUNTRIES = [
  { code: 'MX', name: 'México', currency: 'MXN' },
  { code: 'CO', name: 'Colombia', currency: 'COP' },
  { code: 'AR', name: 'Argentina', currency: 'ARS' },
  { code: 'CL', name: 'Chile', currency: 'CLP' },
  { code: 'PE', name: 'Perú', currency: 'PEN' },
  { code: 'EC', name: 'Ecuador', currency: 'USD' },
  { code: 'VE', name: 'Venezuela', currency: 'USD' },
  { code: 'GT', name: 'Guatemala', currency: 'USD' },
  { code: 'CR', name: 'Costa Rica', currency: 'USD' },
  { code: 'PA', name: 'Panamá', currency: 'USD' },
  { code: 'DO', name: 'República Dominicana', currency: 'USD' },
  { code: 'BO', name: 'Bolivia', currency: 'USD' },
  { code: 'UY', name: 'Uruguay', currency: 'USD' },
  { code: 'PY', name: 'Paraguay', currency: 'USD' },
  { code: 'HN', name: 'Honduras', currency: 'USD' },
  { code: 'SV', name: 'El Salvador', currency: 'USD' },
  { code: 'NI', name: 'Nicaragua', currency: 'USD' },
  { code: 'CU', name: 'Cuba', currency: 'USD' },
  { code: 'PR', name: 'Puerto Rico', currency: 'USD' },
];

export const USA_COUNTRIES = [
  { code: 'US', name: 'Estados Unidos', currency: 'USD' },
];

export const SPAIN_COUNTRIES = [
  { code: 'ES', name: 'España', currency: 'EUR' },
];

@Injectable()
export class LogisticsService {
  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {}

  async getShippingZones() {
    const db = this.firebaseAdmin.firestore();
    const snapshot = await db.collection('shipping_zones')
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getShippingRatesForCountry(country: string) {
    const db = this.firebaseAdmin.firestore();
    const snapshot = await db.collection('shipping_zones')
      .where('countries', 'array-contains', country)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return {
        available: false,
        message: 'Envío no disponible para este país',
      };
    }

    const zone = snapshot.docs[0].data() as ShippingZone;
    return {
      available: true,
      zone: { id: snapshot.docs[0].id, ...zone },
    };
  }

  async calculateShippingCost(country: string, subtotal: number) {
    const rates = await this.getShippingRatesForCountry(country);

    if (!rates.available) {
      return rates;
    }

    const zone = rates.zone as ShippingZone;
    
    let applicableRate = zone.rates[0];
    
    for (const rate of zone.rates) {
      if (rate.freeOver && subtotal >= rate.freeOver) {
        applicableRate = rate;
        break;
      }
      if (!rate.freeOver) {
        applicableRate = rate;
      }
    }

    const isFreeShipping = applicableRate.freeOver && subtotal >= applicableRate.freeOver;

    return {
      available: true,
      method: applicableRate.method,
      estimatedDays: `${applicableRate.minDays}-${applicableRate.maxDays}`,
      cost: isFreeShipping ? 0 : applicableRate.price,
      isFreeShipping,
      currency: 'USD',
    };
  }

  async createShippingZone(data: Omit<ShippingZone, 'id'>) {
    const db = this.firebaseAdmin.firestore();
    const zoneId = db.collection('shipping_zones').doc().id;

    const zone = {
      ...data,
      id: zoneId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('shipping_zones').doc(zoneId).set(zone);

    return zone;
  }

  async updateShippingZone(zoneId: string, data: Partial<ShippingZone>) {
    const db = this.firebaseAdmin.firestore();
    
    const updates: Record<string, any> = {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('shipping_zones').doc(zoneId).update(updates);

    return { success: true };
  }

  async updateTrackingInfo(orderId: string, trackingInfo: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    status?: string;
    history?: Array<{
      status: string;
      location: string;
      timestamp: Date;
      description: string;
    }>;
  }) {
    const db = this.firebaseAdmin.firestore();
    
    await db.collection('orders').doc(orderId).update({
      trackingInfo: {
        ...trackingInfo,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  }

  async getAvailableCountries() {
    return {
      latinAmerica: LATIN_AMERICA_COUNTRIES,
      usa: USA_COUNTRIES,
      spain: SPAIN_COUNTRIES,
    };
  }

  async initializeDefaultZones() {
    const db = this.firebaseAdmin.firestore();
    
    const existingZones = await db.collection('shipping_zones').count().get();
    if (existingZones.data().count > 0) {
      return { message: 'Zones already initialized' };
    }

    const zones = [
      {
        name: 'México',
        countries: ['MX'],
        regions: [],
        rates: [
          { method: 'standard', minDays: 3, maxDays: 7, price: 5.99, freeOver: 50 },
          { method: 'express', minDays: 1, maxDays: 2, price: 12.99 },
        ],
        isActive: true,
      },
      {
        name: 'Latinoamérica',
        countries: ['CO', 'AR', 'CL', 'PE', 'EC', 'VE', 'GT', 'CR', 'PA', 'DO', 'BO', 'UY', 'PY', 'HN', 'SV', 'NI'],
        regions: [],
        rates: [
          { method: 'standard', minDays: 7, maxDays: 14, price: 9.99, freeOver: 75 },
          { method: 'express', minDays: 3, maxDays: 5, price: 24.99 },
        ],
        isActive: true,
      },
      {
        name: 'Estados Unidos',
        countries: ['US', 'PR'],
        regions: [],
        rates: [
          { method: 'standard', minDays: 5, maxDays: 10, price: 7.99, freeOver: 60 },
          { method: 'express', minDays: 2, maxDays: 3, price: 18.99 },
        ],
        isActive: true,
      },
      {
        name: 'España',
        countries: ['ES'],
        regions: [],
        rates: [
          { method: 'standard', minDays: 7, maxDays: 12, price: 8.99, freeOver: 65 },
          { method: 'express', minDays: 3, maxDays: 5, price: 19.99 },
        ],
        isActive: true,
      },
    ];

    for (const zone of zones) {
      await this.createShippingZone(zone);
    }

    return { message: 'Zones initialized', count: zones.length };
  }
}
