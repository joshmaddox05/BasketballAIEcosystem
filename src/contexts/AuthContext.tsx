import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile,
  UserCredential
} from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { auth } from '../services/firebase';

export type UserRole = 'free' | 'premium' | 'admin';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  role: UserRole;
  photoURL: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signUp: (email: string, password: string, displayName?: string) => Promise<UserCredential>;
  signOut: () => Promise<void>;
  clearError: () => void;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const TOKEN_KEY = 'firebase_token';
const USER_KEY = 'user_data';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert Firebase User to our AuthUser type
  const convertFirebaseUser = async (firebaseUser: User): Promise<AuthUser> => {
    // Get ID token to extract custom claims (role)
    const token = await firebaseUser.getIdToken();
    const tokenResult = await firebaseUser.getIdTokenResult();
    
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      emailVerified: firebaseUser.emailVerified,
      role: (tokenResult.claims.role as UserRole) || 'free', // Default to 'free'
      photoURL: firebaseUser.photoURL,
    };
  };

  // Store token securely
  const storeToken = async (token: string) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.warn('Failed to store token securely:', error);
    }
  };

  // Store user data
  const storeUser = async (userData: AuthUser) => {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.warn('Failed to store user data:', error);
    }
  };

  // Clear stored auth data
  const clearStoredAuth = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.warn('Failed to clear stored auth data:', error);
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<UserCredential> => {
    try {
      setError(null);
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Store token
      const token = await userCredential.user.getIdToken();
      await storeToken(token);
      
      return userCredential;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, displayName?: string): Promise<UserCredential> => {
    try {
      setError(null);
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name if provided
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      // Send email verification
      await sendEmailVerification(userCredential.user);
      
      // Store token
      const token = await userCredential.user.getIdToken();
      await storeToken(token);
      
      return userCredential;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      setError(null);
      await firebaseSignOut(auth);
      await clearStoredAuth();
      setUser(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      throw err;
    }
  };

  // Refresh token
  const refreshToken = async (): Promise<string | null> => {
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken(true); // Force refresh
        await storeToken(token);
        return token;
      }
      return null;
    } catch (err) {
      console.warn('Failed to refresh token:', err);
      return null;
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      try {
        if (firebaseUser) {
          const authUser = await convertFirebaseUser(firebaseUser);
          setUser(authUser);
          await storeUser(authUser);
          
          // Store fresh token
          const token = await firebaseUser.getIdToken();
          await storeToken(token);
        } else {
          setUser(null);
          await clearStoredAuth();
        }
      } catch (err) {
        console.warn('Error handling auth state change:', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    clearError,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
