import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Validate configuration
const requiredEnvVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
  throw new Error(
    `Missing required Firebase environment variables: ${missingVars.join(', ')}`
  );
}

// Initialize Firebase
let firebaseApp;
let auth;
let db;
let storage;
let functions;

if (process.env.NODE_ENV === 'test') {
  // In test environment, use mocks
  firebaseApp = {} as any;
  auth = {} as any;
  db = {} as any;
  storage = {} as any;
  functions = {} as any;
} else {
  firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  
  // Initialize services
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);
  functions = getFunctions(firebaseApp);

  // Connect to emulators in development (optional)
  if (__DEV__ && process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
    const EMULATOR_HOST = 'localhost';
    
    try {
      connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`);
      connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
      connectStorageEmulator(storage, EMULATOR_HOST, 9199);
      connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);
      console.log('🔧 Connected to Firebase emulators');
    } catch (error) {
      console.warn('Could not connect to Firebase emulators:', error);
    }
  }
}

export { firebaseApp, auth, db, storage, functions };
export default firebaseApp;
