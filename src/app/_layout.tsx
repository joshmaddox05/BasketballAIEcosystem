import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContextFirebase';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Basketball AI' }} />
      </Stack>
    </AuthProvider>
  );
}
