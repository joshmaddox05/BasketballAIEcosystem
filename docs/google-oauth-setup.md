# Google OAuth Setup Guide

This guide walks you through setting up Google Sign-In for the Basketball AI application.

## Overview

The Basketball AI app now supports Google Sign-In using Firebase Authentication, enabling users to sign in with their Google account for a seamless authentication experience.

## Architecture

- **Firebase Authentication**: Handles the authentication flow with Google OAuth
- **expo-auth-session**: Manages the OAuth flow in React Native
- **expo-web-browser**: Opens the Google sign-in web flow
- **GoogleSignInButton**: Custom component for initiating Google sign-in

## Prerequisites

1. Firebase project created and configured
2. Firebase Authentication enabled
3. Google Cloud Console project (automatically created with Firebase)
4. Bundle identifiers configured for iOS and Android

## Setup Steps

### 1. Enable Google Sign-In in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `basketball-ai-ecosystem`
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google** in the sign-in providers list
5. Toggle **Enable** to ON
6. Set the **Project support email** (required)
7. Click **Save**

### 2. Get OAuth Client IDs

Firebase automatically creates OAuth client IDs, but you need to retrieve them:

#### Web Client ID

1. In Firebase Console → **Project Settings** → **General**
2. Scroll down to **Your apps** section
3. Look for the **Web app** or create one if it doesn't exist
4. The Web Client ID will be visible in the format: `xxxxx.apps.googleusercontent.com`

**Alternative method:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services** → **Credentials**
4. Find the **Web client (auto created by Google Service)** OAuth 2.0 Client ID
5. Copy the Client ID

#### iOS Client ID

1. In Firebase Console → **Project Settings** → **General**
2. Under **Your apps**, find or add your iOS app
3. Bundle ID should match: `com.basketballai.app`
4. Download the `GoogleService-Info.plist` file
5. The iOS Client ID is in this file as `CLIENT_ID`

**Alternative method:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find the iOS Client ID (will contain "iOS" in the name)
4. Copy the Client ID

#### Android Client ID

1. In Firebase Console → **Project Settings** → **General**
2. Under **Your apps**, find or add your Android app
3. Package name should match: `com.basketballai.app`
4. You'll need to add the **SHA-1** certificate fingerprint

**Get SHA-1 for development:**

```bash
# For development/debug builds
cd android
./gradlew signingReport

# Look for the SHA1 fingerprint under "Variant: debug"
```

**Alternative method:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find the Android Client ID
4. Copy the Client ID

### 3. Configure Environment Variables

Update the `.env` file in the `src/` directory:

```env
# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
```

**Important:** Replace `YOUR_WEB_CLIENT_ID`, `YOUR_IOS_CLIENT_ID`, and `YOUR_ANDROID_CLIENT_ID` with the actual values from Firebase/Google Cloud Console.

### 4. Configure OAuth Redirect URIs

#### For Development (Expo Go)

The redirect URI is automatically handled by `expo-auth-session`. No additional configuration needed for development.

#### For Production Builds

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Add these **Authorized redirect URIs**:

```
# For iOS
com.basketballai.app:/oauthredirect

# For Android  
com.basketballai.app:/oauthredirect

# For Web
https://auth.expo.io/@YOUR_EXPO_USERNAME/basketball-ai
```

### 5. Test the Integration

1. Start the Firebase emulator:
   ```bash
   firebase emulators:start
   ```

2. Start the React Native app:
   ```bash
   cd src
   pnpm start
   # Then press 'i' for iOS or 'a' for Android
   ```

3. Navigate to the Sign In or Sign Up screen
4. Click the **Sign in with Google** button
5. Complete the Google sign-in flow
6. Verify successful authentication

## Code Implementation

### AuthContext Integration

The `AuthContextFirebase.tsx` now includes:

```typescript
// Configure Google Auth at component level
const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  scopes: ['profile', 'email'],
});

// Sign in with Google method
const signInWithGoogle = async (): Promise<void> => {
  // ... implementation
};
```

### GoogleSignInButton Component

Usage in screens:

```tsx
import { GoogleSignInButton } from '../components/GoogleSignInButton';

<GoogleSignInButton
  onSuccess={() => {
    console.log('✅ Google Sign-In completed');
  }}
  onError={(error) => {
    Alert.alert('Google Sign In Failed', error.message);
  }}
  disabled={isLoading}
/>
```

## Troubleshooting

### "Google authentication is not configured" Error

**Cause:** Environment variables are not set or not loaded properly.

**Solution:**
1. Verify `.env` file exists in `src/` directory
2. Check that all three Google Client IDs are set
3. Restart the Metro bundler: `pnpm start --reset-cache`
4. Rebuild the app if using a standalone build

### "Error 400: redirect_uri_mismatch"

**Cause:** The redirect URI is not authorized in Google Cloud Console.

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add the redirect URI shown in the error message
4. Wait a few minutes for changes to propagate

### Google Sign-In Opens But Immediately Closes

**Cause:** Client ID mismatch or incorrect configuration.

**Solution:**
1. Verify you're using the correct Client ID for the platform (iOS/Android/Web)
2. For iOS: Ensure bundle identifier matches in Firebase and `app.json`
3. For Android: Verify SHA-1 fingerprint is added to Firebase

### "Sign-in was cancelled" Error

**Cause:** User closed the Google sign-in popup or cancelled the flow.

**Solution:** This is expected behavior. The error is caught and displayed to the user.

### Firebase Auth Domain Issues

**Cause:** Firebase auth domain might be blocked or unreachable.

**Solution:**
1. Verify `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` is correct in `.env`
2. Check that Firebase Authentication is enabled in Firebase Console
3. For iOS: Add `basketball-ai-ecosystem.firebaseapp.com` to allowed domains

## Security Best Practices

1. **Never commit `.env` file** with real credentials to version control
2. **Use different OAuth clients** for development and production
3. **Restrict API keys** in Google Cloud Console by:
   - Application restrictions (iOS/Android/Web)
   - API restrictions (only required APIs)
4. **Validate tokens** on the backend before granting access
5. **Use Firebase Security Rules** to protect Firestore data
6. **Enable Firebase App Check** for production builds

## Production Checklist

- [ ] Obtained all three OAuth Client IDs (Web, iOS, Android)
- [ ] Updated `.env` with production credentials
- [ ] Configured authorized redirect URIs in Google Cloud Console
- [ ] Added SHA-1 fingerprint for Android release build
- [ ] Tested Google Sign-In on physical iOS device
- [ ] Tested Google Sign-In on physical Android device
- [ ] Verified user profile creation in Firestore
- [ ] Configured Firebase Security Rules for production
- [ ] Enabled Firebase App Check
- [ ] Restricted Google Cloud API keys
- [ ] Removed development credentials from production builds

## Additional Resources

- [Firebase Authentication - Google Sign-In](https://firebase.google.com/docs/auth/web/google-signin)
- [Expo Auth Session Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Firebase Console](https://console.firebase.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)

## Support

If you encounter issues not covered in this guide:

1. Check Firebase Console for error logs
2. Review Metro bundler logs for detailed error messages
3. Verify environment variables are correctly loaded
4. Test with a fresh Firebase emulator start
5. Ensure all dependencies are installed: `pnpm install`

## Next Steps

After Google Sign-In is configured:

1. Test the complete authentication flow
2. Verify user profiles are created in Firestore
3. Implement profile completion for new Google users
4. Add user role management
5. Configure additional OAuth providers (Apple, Facebook, etc.)
