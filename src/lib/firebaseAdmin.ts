import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  if (process.env.FIREBASE_PROJECT_ID) {
    try {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error: any) {
      console.error('[Firebase Admin] Initialization FAILED. Server-side billing updates will not work.', error.stack);
    }
  } else {
    if (process.env.NODE_ENV === 'production') {
      // In production, missing credentials means billing is broken — log loudly.
      console.error(
        '[Firebase Admin] CRITICAL: FIREBASE_PROJECT_ID is not set. ' +
        'Server-side subscription updates will fail. ' +
        'Configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY on your hosting provider.'
      );
    }
    // Initialise a placeholder app so the module loads during build / dev.
    initializeApp({ projectId: 'demo-project' });
  }
}

export const adminDb = getFirestore();
