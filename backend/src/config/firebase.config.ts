import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseConfig } from './firebase.config';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            }),
          });
        }
        return admin;
      },
    },
    {
      provide: 'FIRESTORE',
      useFactory: () => {
        return admin.firestore();
      },
    },
  ],
  exports: ['FIREBASE_ADMIN', 'FIRESTORE'],
})
export class FirebaseConfigModule {}

export { FirebaseConfig };
