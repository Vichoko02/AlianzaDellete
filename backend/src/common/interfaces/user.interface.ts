export enum UserRole {
  USER = 'user',
  ALIANZA = 'alianza',
  JEFE_PROYECTO = 'jefe_proyecto',
  STAFF = 'staff',
}

export interface UserClaims {
  uid: string;
  email: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface FirebaseDecodedToken {
  uid: string;
  email: string | null;
  email_verified: boolean;
  name: string | null;
  picture: string | null;
  role?: UserRole;
}
