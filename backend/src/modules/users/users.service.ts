import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { UpdateProfileDto, UpdatePreferencesDto } from './dto/user.dto';
import { UserRole } from '../../common/interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {}

  async getProfile(uid: string) {
    const db = this.firebaseAdmin.firestore();
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const userData = userDoc.data();
    return {
      uid,
      email: userData?.email,
      displayName: userData?.displayName,
      photoURL: userData?.photoURL,
      role: userData?.role,
      createdAt: userData?.createdAt,
      profile: userData?.profile,
      preferences: userData?.preferences,
      purchaseHistory: userData?.purchaseHistory || [],
      wishlist: userData?.wishlist || [],
    };
  }

  async updateProfile(uid: string, dto: UpdateProfileDto) {
    const db = this.firebaseAdmin.firestore();
    
    const updates: Record<string, any> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (dto.firstName !== undefined) updates['profile.firstName'] = dto.firstName;
    if (dto.lastName !== undefined) updates['profile.lastName'] = dto.lastName;
    if (dto.country !== undefined) updates['profile.country'] = dto.country;
    if (dto.bio !== undefined) updates['profile.bio'] = dto.bio;
    if (dto.avatar !== undefined) updates['photoURL'] = dto.avatar;

    await db.collection('users').doc(uid).update(updates);

    if (dto.displayName !== undefined) {
      await this.firebaseAdmin.auth().updateUser(uid, { displayName: dto.displayName });
    }

    return this.getProfile(uid);
  }

  async updatePreferences(uid: string, dto: UpdatePreferencesDto) {
    const db = this.firebaseAdmin.firestore();
    
    const updates: Record<string, any> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (dto.notifications !== undefined) updates['preferences.notifications'] = dto.notifications;
    if (dto.newsletter !== undefined) updates['preferences.newsletter'] = dto.newsletter;

    await db.collection('users').doc(uid).update(updates);

    return this.getProfile(uid);
  }

  async enrollUser(email: string, role: UserRole, adminUid: string) {
    const db = this.firebaseAdmin.firestore();
    
    const userRecord = await this.firebaseAdmin.auth().getUserByEmail(email);

    await this.firebaseAdmin.auth().setCustomUserClaims(userRecord.uid, { role });

    await db.collection('users').doc(userRecord.uid).update({
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      enrolledBy: adminUid,
      enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      role,
      message: `Usuario enrolado exitosamente como ${role}`,
    };
  }

  async getAllUsers(page = 1, limit = 20) {
    const db = this.firebaseAdmin.firestore();
    
    const snapshot = await db.collection('users')
      .orderBy('createdAt', 'desc')
      .offset((page - 1) * limit)
      .limit(limit)
      .get();

    const users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    }));

    const totalSnapshot = await db.collection('users').count().get();

    return {
      users,
      total: totalSnapshot.data().count,
      page,
      limit,
      totalPages: Math.ceil(totalSnapshot.data().count / limit),
    };
  }

  async getUserById(uid: string) {
    const db = this.firebaseAdmin.firestore();
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      uid,
      ...userDoc.data(),
    };
  }

  async addToWishlist(uid: string, productId: string) {
    const db = this.firebaseAdmin.firestore();
    
    await db.collection('users').doc(uid).update({
      wishlist: admin.firestore.FieldValue.arrayUnion(productId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Producto añadido a favoritos' };
  }

  async removeFromWishlist(uid: string, productId: string) {
    const db = this.firebaseAdmin.firestore();
    
    await db.collection('users').doc(uid).update({
      wishlist: admin.firestore.FieldValue.arrayRemove(productId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Producto eliminado de favoritos' };
  }
}
