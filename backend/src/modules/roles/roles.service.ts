import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

export const PERMISSIONS = {
  NEWS_CREATE: 'news:create',
  NEWS_READ: 'news:read',
  NEWS_UPDATE: 'news:update',
  NEWS_DELETE: 'news:delete',
  WIKI_CREATE: 'wiki:create',
  WIKI_READ: 'wiki:read',
  WIKI_UPDATE: 'wiki:update',
  WIKI_DELETE: 'wiki:delete',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  METRICS_READ: 'metrics:read',
};

export const ROLE_PERMISSIONS = {
  user: [PERMISSIONS.NEWS_READ, PERMISSIONS.WIKI_READ],
  staff: [
    PERMISSIONS.NEWS_READ,
    PERMISSIONS.WIKI_READ,
    PERMISSIONS.WIKI_UPDATE,
  ],
  jefe_proyecto: [
    PERMISSIONS.NEWS_READ,
    PERMISSIONS.NEWS_CREATE,
    PERMISSIONS.NEWS_UPDATE,
    PERMISSIONS.WIKI_READ,
    PERMISSIONS.WIKI_CREATE,
    PERMISSIONS.WIKI_UPDATE,
    PERMISSIONS.METRICS_READ,
  ],
  alianza: Object.values(PERMISSIONS),
};

@Injectable()
export class RolesService {
  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {}

  async getRolePermissions(role: string): Promise<string[]> {
    return ROLE_PERMISSIONS[role] || [];
  }

  async hasPermission(role: string, permission: string): Promise<boolean> {
    const permissions = await this.getRolePermissions(role);
    return permissions.includes(permission);
  }
}
