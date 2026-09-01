import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { JwtPayload, UserRole } from '../../common/interfaces/user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    try {
      const userRecord = await this.firebaseAdmin.auth().getUser(payload.sub);
      const customClaims = userRecord.customClaims || {};

      return {
        uid: payload.sub,
        email: payload.email,
        role: customClaims.role || UserRole.USER,
      };
    } catch {
      throw new UnauthorizedException('Usuario no encontrado');
    }
  }
}
