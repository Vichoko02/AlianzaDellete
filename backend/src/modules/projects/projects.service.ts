import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class ProjectsService {
  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async create(data: { name: string; description?: string; imageUrl?: string }, createdBy: string) {
    const db = this.firebaseAdmin.firestore();
    const projectId = db.collection('projects').doc().id;
    const slug = this.generateSlug(data.name);

    const project = {
      id: projectId,
      name: data.name,
      slug,
      description: data.description || '',
      imageUrl: data.imageUrl || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy,
      jefeProyectoId: null,
      staffMembers: [],
      isActive: true,
    };

    await db.collection('projects').doc(projectId).set(project);

    return project;
  }

  async findAll() {
    const db = this.firebaseAdmin.firestore();
    const snapshot = await db.collection('projects')
      .where('isActive', '==', true)
      .orderBy('name')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findOne(id: string) {
    const db = this.firebaseAdmin.firestore();
    const doc = await db.collection('projects').doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    return { id: doc.id, ...doc.data() };
  }

  async findBySlug(slug: string) {
    const db = this.firebaseAdmin.firestore();
    const snapshot = await db.collection('projects')
      .where('slug', '==', slug)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async update(id: string, data: Partial<{ name: string; description: string; imageUrl: string; isActive: boolean }>) {
    const db = this.firebaseAdmin.firestore();
    const doc = await db.collection('projects').doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const updates: Record<string, any> = {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (data.name) {
      updates.slug = this.generateSlug(data.name);
    }

    await db.collection('projects').doc(id).update(updates);

    return this.findOne(id);
  }

  async assignJefeProyecto(projectId: string, userId: string) {
    const db = this.firebaseAdmin.firestore();
    
    await db.collection('projects').doc(projectId).update({
      jefeProyectoId: userId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Jefe de proyecto asignado' };
  }

  async assignStaff(projectId: string, staffIds: string[]) {
    const db = this.firebaseAdmin.firestore();
    
    await db.collection('projects').doc(projectId).update({
      staffMembers: staffIds,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  }

  async delete(id: string) {
    const db = this.firebaseAdmin.firestore();
    await db.collection('projects').doc(id).update({
      isActive: false,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  }
}
