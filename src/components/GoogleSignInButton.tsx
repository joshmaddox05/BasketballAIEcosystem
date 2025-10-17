import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContextFirebase';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
}) => {
  const { signInWithGoogle, loading } = useAuth();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleGoogleSignIn = async () => {
    if (isProcessing || loading || disabled) return;

    try {
      setIsProcessing(true);
      console.log('🔐 Starting Google Sign-In flow...');
      await signInWithGoogle();
      console.log('✅ Google Sign-In successful');
      onSuccess?.();
    } catch (error) {
      console.error('❌ Google Sign-In error:', error);
      const err = error instanceof Error ? error : new Error('Google sign-in failed');
      onError?.(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const isDisabled = disabled || loading || isProcessing;

  return (
    <TouchableOpacity
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={handleGoogleSignIn}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {isProcessing ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.googleIcon}>G</Text>
          </View>
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 24,
    height: 24,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
