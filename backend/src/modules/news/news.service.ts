import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class NewsService {
  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {}

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async create(data: { title: string; content: string; excerpt?: string; coverImage?: string; projectIds?: string[] }, authorId: string) {
    const db = this.firebaseAdmin.firestore();
    const newsId = db.collection('news').doc().id;
    const slug = this.generateSlug(data.title);

    const news = {
      id: newsId,
      title: data.title,
      slug,
      content: data.content,
      excerpt: data.excerpt || data.content.substring(0, 150) + '...',
      coverImage: data.coverImage || '',
      projectIds: data.projectIds || [],
      authorId,
      status: 'draft',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      publishedAt: null,
    };

    await db.collection('news').doc(newsId).set(news);

    return news;
  }

  async findAll(projectId?: string) {
    const db = this.firebaseAdmin.firestore();
    let query: FirebaseFirestore.Query = db.collection('news');

    if (projectId) {
      query = query.where('projectIds', 'array-contains', projectId);
    }

    query = query.where('status', '==', 'published')
      .orderBy('publishedAt', 'desc');

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findOne(id: string) {
    const db = this.firebaseAdmin.firestore();
    const doc = await db.collection('news').doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException('Noticia no encontrada');
    }

    return { id: doc.id, ...doc.data() };
  }

  async findBySlug(slug: string) {
    const db = this.firebaseAdmin.firestore();
    const snapshot = await db.collection('news')
      .where('slug', '==', slug)
      .where('status', '==', 'published')
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException('Noticia no encontrada');
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async update(id: string, data: Partial<{ title: string; content: string; excerpt: string; coverImage: string; status: string; projectIds: string[] }>, userId: string) {
    const db = this.firebaseAdmin.firestore();
    const doc = await db.collection('news').doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException('Noticia no encontrada');
    }

    const updates: Record<string, any> = {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (data.status === 'published' && !doc.data()?.publishedAt) {
      updates.publishedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    if (data.title) {
      updates.slug = this.generateSlug(data.title);
    }

    await db.collection('news').doc(id).update(updates);

    return this.findOne(id);
  }

  async delete(id: string) {
    const db = this.firebaseAdmin.firestore();
    await db.collection('news').doc(id).delete();
    return { success: true };
  }
}
