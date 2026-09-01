import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { SKIP_AUTH_KEY } from '../decorators/roles.decorator';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipAuth = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticación no proporcionado');
    }

    const token = authHeader.substring(7);

    try {
      const decodedToken = await this.firebaseAdmin.auth().verifyIdToken(token);
      
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        role: decodedToken.role || 'user',
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Token de Firebase inválido o expirado');
    }
  }
}
