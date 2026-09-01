import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../interfaces/user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.uid) {
      throw new ForbiddenException('Acceso denegado. Usuario no autenticado.');
    }

    try {
      const userRecord = await this.firebaseAdmin.auth().getUser(user.uid);
      const customClaims = userRecord.customClaims || {};
      const userRole: UserRole = customClaims.role || UserRole.USER;

      const hasRole = requiredRoles.includes(userRole);

      if (!hasRole) {
        throw new ForbiddenException(
          `Acceso denegado. Roles requeridos: ${requiredRoles.join(' o ')}. Tu rol actual: ${userRole}`,
        );
      }

      request.user = {
        ...user,
        role: userRole,
      };

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Error al verificar permisos');
    }
  }
}
