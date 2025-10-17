import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// Firebase configuration - these would come from environment variables in production
const firebaseConfig = {
  // These are placeholder values - in production, these would be set via environment variables
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth - Firebase will automatically handle persistence
const auth: Auth = getAuth(app);

export { auth };
export default app;
