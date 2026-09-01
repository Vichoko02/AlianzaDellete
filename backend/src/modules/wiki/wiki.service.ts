import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class WikiService {
  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {}

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async create(data: { projectId: string; title: string; content: string; coverImage?: string }, createdBy: string) {
    const db = this.firebaseAdmin.firestore();
    const wikiId = db.collection('wikis').doc().id;
    const slug = this.generateSlug(data.title);

    const wiki = {
      id: wikiId,
      projectId: data.projectId,
      title: data.title,
      slug,
      content: data.content,
      coverImage: data.coverImage || '',
      status: 'draft',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      publishedAt: null,
      createdBy,
      lastEditedBy: createdBy,
      assignedStaff: [],
    };

    await db.collection('wikis').doc(wikiId).set(wiki);

    return wiki;
  }

  async findAll(projectId?: string) {
    const db = this.firebaseAdmin.firestore();
    let query: FirebaseFirestore.Query = db.collection('wikis');

    if (projectId) {
      query = query.where('projectId', '==', projectId);
    }

    query = query.orderBy('createdAt', 'desc');
    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findBySlug(slug: string) {
    const db = this.firebaseAdmin.firestore();
    const snapshot = await db.collection('wikis')
      .where('slug', '==', slug)
      .where('status', '==', 'published')
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException('Wiki no encontrada');
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async findOne(id: string) {
    const db = this.firebaseAdmin.firestore();
    const doc = await db.collection('wikis').doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException('Wiki no encontrada');
    }

    return { id: doc.id, ...doc.data() };
  }

  async update(id: string, data: Partial<{ title: string; content: string; coverImage: string; status: string }>, userId: string) {
    const db = this.firebaseAdmin.firestore();
    const doc = await db.collection('wikis').doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException('Wiki no encontrada');
    }

    const updates: Record<string, any> = {
      ...data,
      lastEditedBy: userId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (data.status === 'published' && !doc.data()?.publishedAt) {
      updates.publishedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    if (data.title) {
      updates.slug = this.generateSlug(data.title);
    }

    await db.collection('wikis').doc(id).update(updates);

    return this.findOne(id);
  }

  async assignStaff(wikiId: string, staffIds: string[]) {
    const db = this.firebaseAdmin.firestore();
    
    await db.collection('wikis').doc(wikiId).update({
      assignedStaff: staffIds,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    for (const staffId of staffIds) {
      const userDoc = await db.collection('users').doc(staffId).get();
      const currentWikis = userDoc.data()?.assignedWikis || [];
      
      if (!currentWikis.includes(wikiId)) {
        await db.collection('users').doc(staffId).update({
          assignedWikis: admin.firestore.FieldValue.arrayUnion(wikiId),
        });
      }
    }

    return { success: true };
  }

  async delete(id: string) {
    const db = this.firebaseAdmin.firestore();
    await db.collection('wikis').doc(id).delete();
    return { success: true };
  }
}
