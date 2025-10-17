import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SignInScreen } from './SignInScreen';
import { SignUpScreen } from './SignUpScreen';

export const AuthScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
  };

  return (
    <View style={styles.container}>
      {isSignUp ? (
        <SignUpScreen onToggleMode={toggleMode} />
      ) : (
        <SignInScreen onToggleMode={toggleMode} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
