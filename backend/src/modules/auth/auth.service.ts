import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { RegisterDto, LoginDto, GoogleAuthDto } from './dto/auth.dto';
import { JwtPayload, UserRole } from '../../common/interfaces/user.interface';

@Injectable()
export class AuthService {
  constructor(
    @Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const userRecord = await this.firebaseAdmin.auth().createUser({
        email: dto.email,
        password: dto.password,
        displayName: dto.displayName || dto.email.split('@')[0],
      });

      await this.createUserDocument(userRecord.uid, {
        email: dto.email,
        displayName: dto.displayName || dto.email.split('@')[0],
      });

      const token = await this.generateJwtToken(userRecord.uid, dto.email, UserRole.USER);

      return {
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
        },
        token,
      };
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        throw new ConflictException('Este correo ya está registrado');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    try {
      const userRecord = await this.firebaseAdmin.auth().getUserByEmail(dto.email);
      const customClaims = userRecord.customClaims || {};
      const role: UserRole = customClaims.role || UserRole.USER;

      const token = await this.generateJwtToken(userRecord.uid, userRecord.email || '', role);

      return {
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          photoURL: userRecord.photoURL,
          role,
        },
        token,
      };
    } catch (error) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
  }

  async googleAuth(dto: GoogleAuthDto) {
    try {
      const decodedToken = await this.firebaseAdmin.auth().verifyIdToken(dto.idToken);
      
      let userRecord: admin.auth.UserRecord;
      
      try {
        userRecord = await this.firebaseAdmin.auth().getUserByEmail(decodedToken.email || '');
      } catch {
        userRecord = await this.firebaseAdmin.auth().createUser({
          uid: decodedToken.uid,
          email: decodedToken.email,
          displayName: decodedToken.name,
          photoURL: decodedToken.picture,
          emailVerified: decodedToken.email_verified,
        });

        await this.createUserDocument(userRecord.uid, {
          email: decodedToken.email || '',
          displayName: decodedToken.name || 'Usuario',
          photoURL: decodedToken.picture,
        });
      }

      const customClaims = userRecord.customClaims || {};
      const role: UserRole = customClaims.role || UserRole.USER;

      const token = await this.generateJwtToken(userRecord.uid, userRecord.email || '', role);

      return {
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          photoURL: userRecord.photoURL,
          role,
        },
        token,
      };
    } catch (error) {
      throw new UnauthorizedException('Token de Google inválido');
    }
  }

  async verifyToken(token: string) {
    try {
      const decoded = this.jwtService.verify<JwtPayload>(token);
      const userRecord = await this.firebaseAdmin.auth().getUser(decoded.sub);
      const customClaims = userRecord.customClaims || {};

      return {
        uid: decoded.sub,
        email: decoded.email,
        role: customClaims.role || UserRole.USER,
      };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private async generateJwtToken(uid: string, email: string, role: UserRole): Promise<string> {
    const payload: JwtPayload = {
      sub: uid,
      email,
      role,
    };

    return this.jwtService.sign(payload);
  }

  private async createUserDocument(uid: string, data: { email: string; displayName: string; photoURL?: string }) {
    const db = this.firebaseAdmin.firestore();
    
    await db.collection('users').doc(uid).set({
      uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL || null,
      role: UserRole.USER,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      profile: {
        firstName: '',
        lastName: '',
        country: '',
        bio: '',
      },
      preferences: {
        notifications: true,
        newsletter: true,
      },
      purchaseHistory: [],
      assignedWikis: [],
      wishlist: [],
    });
  }
}
