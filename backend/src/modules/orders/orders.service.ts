import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { UpdateOrderStatusDto, OrderStatus } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {}

  async getUserOrders(userId: string) {
    const db = this.firebaseAdmin.firestore();
    const snapshot = await db.collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getOrderById(orderId: string, userId?: string) {
    const db = this.firebaseAdmin.firestore();
    const doc = await db.collection('orders').doc(orderId).get();

    if (!doc.exists) {
      throw new NotFoundException('Orden no encontrada');
    }

    const orderData = doc.data();
    
    if (userId && orderData?.userId !== userId) {
      throw new NotFoundException('Orden no encontrada');
    }

    return { id: doc.id, ...orderData };
  }

  async getAllOrders(filters?: { status?: OrderStatus; page?: number; limit?: number }) {
    const db = this.firebaseAdmin.firestore();
    let query: FirebaseFirestore.Query = db.collection('orders');

    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }

    query = query.orderBy('createdAt', 'desc');

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    query = query.offset((page - 1) * limit).limit(limit);

    const snapshot = await query.get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const totalSnapshot = await db.collection('orders').count().get();

    return {
      orders,
      total: totalSnapshot.data().count,
      page,
      limit,
      totalPages: Math.ceil(totalSnapshot.data().count / limit),
    };
  }

  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const db = this.firebaseAdmin.firestore();
    const doc = await db.collection('orders').doc(orderId).get();

    if (!doc.exists) {
      throw new NotFoundException('Orden no encontrada');
    }

    const updates: Record<string, any> = {
      status: dto.status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (dto.trackingNumber) {
      updates['trackingInfo.trackingNumber'] = dto.trackingNumber;
      updates['trackingInfo.trackingUrl'] = dto.trackingUrl;
    }

    if (dto.notes) {
      updates['notes'] = dto.notes;
    }

    await db.collection('orders').doc(orderId).update(updates);

    return this.getOrderById(orderId);
  }

  async getOrderStats() {
    const db = this.firebaseAdmin.firestore();
    
    const statuses = Object.values(OrderStatus);
    const stats: Record<string, number> = {};

    for (const status of statuses) {
      const snapshot = await db.collection('orders')
        .where('status', '==', status)
        .count()
        .get();
      stats[status] = snapshot.data().count;
    }

    const totalSnapshot = await db.collection('orders').count().get();
    const total = totalSnapshot.data().count;

    return {
      byStatus: stats,
      total,
    };
  }

  async getRevenueStats(period: 'day' | 'week' | 'month' | 'year') {
    const db = this.firebaseAdmin.firestore();
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
    }

    const snapshot = await db.collection('orders')
      .where('status', '==', 'paid')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .get();

    let totalRevenue = 0;
    let orderCount = snapshot.size;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      totalRevenue += data.total || 0;
    });

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      totalRevenue,
      orderCount,
      averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
    };
  }
}
