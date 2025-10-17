import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile as firebaseUpdateProfile,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  UserCredential,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup
} from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { auth } from '../services/firebase';
import { repositories } from '../database/repositories';
import { User as DatabaseUser } from '../database/schema';

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
  profile: DatabaseUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signUp: (email: string, password: string, displayName?: string) => Promise<UserCredential>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendEmailVerification: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  const providerId = React.useRef(Math.random().toString(36).substring(2, 9));
  console.log(`🚀 AuthProvider initializing... (ID: ${providerId.current})`);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<DatabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const profileFetchingRef = React.useRef(false);

  // Convert Firebase User to our AuthUser type
  const convertFirebaseUser = async (firebaseUser: FirebaseUser): Promise<AuthUser> => {
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

  // Load user profile from Firestore
  const loadUserProfile = async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setProfile(null);
      return;
    }

    // Prevent concurrent profile fetching
    if (profileFetchingRef.current) {
      console.log('⏳ Profile fetch already in progress, skipping...');
      return;
    }

    profileFetchingRef.current = true;
    try {
      console.log(`🔄 Loading user profile... (Provider: ${providerId.current})`);
      let userProfile = await repositories.users.getProfile(firebaseUser.uid);
      
      // Create profile if it doesn't exist
      if (!userProfile) {
        console.log('📝 No profile found, creating new profile...');
        await repositories.users.createProfile(firebaseUser.uid, {
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Basketball Player',
          role: 'free'
        });
        userProfile = await repositories.users.getProfile(firebaseUser.uid);
      }
      
      setProfile(userProfile);
      console.log(`✅ User profile loaded successfully (Provider: ${providerId.current})`);
    } catch (error) {
      console.warn(`Failed to fetch profile (Provider: ${providerId.current}):`, error);
      setProfile(null);
      
      // Check if it's a network error
      if (error instanceof Error && error.message.includes('Network request failed')) {
        console.log('📡 Network issue detected - profile will be null but auth continues');
      }
    } finally {
      profileFetchingRef.current = false;
    }
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
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
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
        await firebaseUpdateProfile(userCredential.user, { displayName });
      }
      
      // Send email verification
      await sendEmailVerification(userCredential.user);
      
      // Store token
      const token = await userCredential.user.getIdToken();
      await storeToken(token);
      
      return userCredential;
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async (): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      
      // Check if we're in a development build or Expo Go
      if (!googleRequest) {
        // Show helpful message for Expo Go users
        const errorMessage = 
          'Google Sign-In requires a development build. ' +
          'Please use email/password authentication in Expo Go, ' +
          'or run "npx expo run:ios" to build a development version with native modules.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      console.log('🔐 Initiating Google sign-in...');
      
      // Prompt for Google sign-in
      const result = await promptGoogleAsync();

      if (result?.type === 'success') {
        console.log('✅ Google auth successful, exchanging token...');
        const { id_token } = result.params;
        
        // Create Google credential
        const credential = GoogleAuthProvider.credential(id_token);
        
        // Sign in with Firebase
        const userCredential = await signInWithCredential(auth, credential);
        
        // Store token
        const token = await userCredential.user.getIdToken();
        await storeToken(token);
        
        console.log('✅ Google sign-in complete');
      } else if (result?.type === 'cancel') {
        console.log('❌ User cancelled Google sign-in');
        throw new Error('Google sign-in was cancelled');
      } else {
        console.error('❌ Google sign-in failed:', result);
        throw new Error('Google sign-in failed');
      }
    } catch (err) {
      console.error('❌ Google sign-in error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(errorMessage);
      throw new Error(errorMessage);
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
      setProfile(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Update profile
  const updateProfile = async (updates: { displayName?: string; photoURL?: string }) => {
    if (!user || !auth.currentUser) throw new Error('User not authenticated');
    
    try {
      setError(null);
      
      // Update Firebase Auth profile
      await firebaseUpdateProfile(auth.currentUser, updates);
      
      // Update Firestore profile
      await repositories.users.updateProfile(auth.currentUser.uid, {
        displayName: updates.displayName,
        avatar: updates.photoURL
      });
      
      console.log('Profile updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Update password
  const updatePassword = async (newPassword: string) => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    try {
      setError(null);
      await firebaseUpdatePassword(auth.currentUser, newPassword);
      console.log('Password updated successfully');
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent');
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Resend email verification
  const resendEmailVerification = async () => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    try {
      setError(null);
      await sendEmailVerification(auth.currentUser);
      console.log('Email verification sent');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend verification email';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (auth.currentUser) {
      await loadUserProfile(auth.currentUser);
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
    console.log(`🔧 Setting up auth state listener (Provider: ${providerId.current})`);
    
    if (!auth) {
      console.error('❌ Auth service is not initialized!');
      setError('Firebase authentication is not available');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log(`🔄 Auth state changed: ${firebaseUser ? 'User signed in' : 'User signed out'} (Provider: ${providerId.current})`);
      setLoading(true);
      
      try {
        if (firebaseUser) {
          const authUser = await convertFirebaseUser(firebaseUser);
          setUser(authUser);
          await storeUser(authUser);
          
          // Store fresh token
          const token = await firebaseUser.getIdToken();
          await storeToken(token);
          
          // Load user profile from Firestore
          await loadUserProfile(firebaseUser);
        } else {
          setUser(null);
          setProfile(null);
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

  // Subscribe to real-time profile updates
  useEffect(() => {
    if (!user) return;

    console.log(`📡 Setting up profile subscription (Provider: ${providerId.current})`);
    const unsubscribe = repositories.users.subscribeToProfile(user.uid, (updatedProfile: DatabaseUser | null) => {
      console.log(`📊 Profile updated via subscription (Provider: ${providerId.current})`);
      setProfile(updatedProfile);
    });

    return () => {
      console.log(`📡 Cleaning up profile subscription (Provider: ${providerId.current})`);
      unsubscribe();
    };
  }, [user]);

  const value: AuthContextType = React.useMemo(() => ({
    user,
    profile,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    updatePassword,
    resetPassword,
    resendEmailVerification,
    refreshProfile,
    clearError,
    refreshToken,
  }), [user, profile, loading, error, googleRequest]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Helper function to convert Firebase auth error codes to user-friendly messages
const getAuthErrorMessage = (error: any): string => {
  const errorCode = error?.code || '';
  
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/requires-recent-login':
      return 'Please sign in again to complete this action.';
    default:
      return error?.message || 'An error occurred. Please try again.';
  }
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
