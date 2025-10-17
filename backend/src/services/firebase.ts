import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';

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

    // Try to load from service account JSON file first
    const serviceAccountPath = path.join(__dirname, '../../config/firebase-service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      // Use service account JSON file
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
        projectId: 'basketball-ai-ecosystem',
      });
    } else {
      // Fall back to environment variables
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
          'Firebase configuration missing. Please either:\n' +
          '1. Place your service account JSON at backend/config/firebase-service-account.json, OR\n' +
          '2. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
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
  }

  return firebaseApp;
};

export const getFirebaseAuth = () => {
  const app = initializeFirebase();
  return getAuth(app);
};

export { admin };
