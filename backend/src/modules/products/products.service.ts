import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateProductDto, UpdateProductDto, ProductFiltersDto, Currency } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private generateSku(): string {
    return 'ALI-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  async create(dto: CreateProductDto, createdBy: string) {
    const db = this.firebaseAdmin.firestore();
    const productId = db.collection('products').doc().id;
    const slug = this.generateSlug(dto.name);

    const product = {
      id: productId,
      name: dto.name,
      slug,
      description: dto.description || '',
      price: dto.price,
      currency: dto.currency || Currency.USD,
      images: dto.images || [],
      projectIds: dto.projectIds || [],
      category: dto.category,
      tags: dto.tags || {
        projects: dto.projectIds || [],
        types: [dto.category],
        countries: ['MX', 'CO', 'AR', 'CL', 'PE', 'EC', 'VE', 'GT', 'CR', 'US', 'ES'],
        isOffer: false,
      },
      variants: (dto.variants || []).map((v, i) => ({
        ...v,
        sku: v.sku || this.generateSku(),
        stock: {
          MX: { quantity: 100, reserved: 0 },
          CO: { quantity: 100, reserved: 0 },
          AR: { quantity: 100, reserved: 0 },
          CL: { quantity: 100, reserved: 0 },
          PE: { quantity: 100, reserved: 0 },
          US: { quantity: 100, reserved: 0 },
          ES: { quantity: 100, reserved: 0 },
        },
      })),
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy,
    };

    await db.collection('products').doc(productId).set(product);

    return product;
  }

  async findAll(filters?: ProductFiltersDto) {
    const db = this.firebaseAdmin.firestore();
    let query: FirebaseFirestore.Query = db.collection('products');

    if (filters?.category) {
      query = query.where('category', '==', filters.category);
    }

    if (filters?.isOffer !== undefined) {
      query = query.where('tags.isOffer', '==', filters.isOffer);
    }

    if (filters?.projectId) {
      query = query.where('projectIds', 'array-contains', filters.projectId);
    }

    query = query.where('isActive', '==', true);
    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.country) {
      products = products.filter(p => {
        if (!p.variants || p.variants.length === 0) return true;
        return p.variants.some((v: any) => v.stock?.[filters.country]?.quantity > 0);
      });
    }

    return products;
  }

  async findOne(id: string) {
    const db = this.firebaseAdmin.firestore();
    const doc = await db.collection('products').doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException('Producto no encontrado');
    }

    return { id: doc.id, ...doc.data() };
  }

  async update(id: string, dto: UpdateProductDto) {
    const db = this.firebaseAdmin.firestore();
    const doc = await db.collection('products').doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException('Producto no encontrado');
    }

    const updates: Record<string, any> = {
      ...dto,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (dto.name) {
      updates.slug = this.generateSlug(dto.name);
    }

    await db.collection('products').doc(id).update(updates);

    return this.findOne(id);
  }

  async updateStock(productId: string, variantId: string, country: string, quantity: number, operation: 'set' | 'increment' | 'decrement' = 'set') {
    const db = this.firebaseAdmin.firestore();
    
    const fieldPath = `variants.${variantId}.stock.${country}.quantity`;
    
    let update;
    switch (operation) {
      case 'increment':
        update = admin.firestore.FieldValue.increment(quantity);
        break;
      case 'decrement':
        update = admin.firestore.FieldValue.increment(-quantity);
        break;
      default:
        update = quantity;
    }

    await db.collection('products').doc(productId).update({
      [fieldPath]: update,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Stock actualizado' };
  }

  async reserveStock(productId: string, variantId: string, country: string, quantity: number) {
    const db = this.firebaseAdmin.firestore();
    
    const productDoc = await db.collection('products').doc(productId).get();
    const product = productDoc.data();
    
    const variant = product?.variants?.find((v: any) => v.id === variantId);
    if (!variant) {
      throw new NotFoundException('Variante no encontrada');
    }

    const currentStock = variant.stock?.[country]?.quantity || 0;
    if (currentStock < quantity) {
      throw new Error('Stock insuficiente');
    }

    await db.collection('products').doc(productId).update({
      [`variants.${variantId}.stock.${country}.quantity`]: admin.firestore.FieldValue.increment(-quantity),
      [`variants.${variantId}.stock.${country}.reserved`]: admin.firestore.FieldValue.increment(quantity),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  }

  async releaseStock(productId: string, variantId: string, country: string, quantity: number) {
    const db = this.firebaseAdmin.firestore();

    await db.collection('products').doc(productId).update({
      [`variants.${variantId}.stock.${country}.quantity`]: admin.firestore.FieldValue.increment(quantity),
      [`variants.${variantId}.stock.${country}.reserved`]: admin.firestore.FieldValue.increment(-quantity),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  }

  async delete(id: string) {
    const db = this.firebaseAdmin.firestore();
    await db.collection('products').doc(id).update({
      isActive: false,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Producto eliminado' };
  }
}
