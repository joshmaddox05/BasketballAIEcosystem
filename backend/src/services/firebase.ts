import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App;

export const initializeFirebase = () => {
  if (!firebaseApp) {
    // Check if we're in test environment
    if (process.env.NODE_ENV === 'test') {
      // Use minimal config for tests
      firebaseApp = admin.initializeApp({
        projectId: 'test-project',
      }, 'test-app');
      return firebaseApp;
    }

    // Production configuration
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase configuration missing. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
      );
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  }

  return firebaseApp;
};

export const getFirebaseAuth = () => {
  const app = initializeFirebase();
  return getAuth(app);
};

export { admin };
