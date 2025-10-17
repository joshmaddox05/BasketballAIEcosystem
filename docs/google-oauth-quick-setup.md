# Quick Guide: Obtaining Google OAuth Client IDs

This is a streamlined guide to quickly get your Google OAuth Client IDs for the Basketball AI app.

## Fast Track Setup (5 minutes)

### Step 1: Enable Google Sign-In in Firebase

```bash
# Open Firebase Console
open https://console.firebase.google.com/project/basketball-ai-ecosystem/authentication/providers
```

1. Click on **Google** provider
2. Toggle **Enable** to ON
3. Enter support email
4. Click **Save**

### Step 2: Get Client IDs from Google Cloud Console

```bash
# Open Google Cloud Console Credentials page
open https://console.cloud.google.com/apis/credentials
```

You'll see three OAuth 2.0 Client IDs (auto-created by Firebase):

#### 1. Web Client ID
- Look for: **"Web client (auto created by Google Service)"**
- Format: `123456789-abcdefg.apps.googleusercontent.com`
- Copy the entire Client ID

#### 2. iOS Client ID  
- Look for: **"iOS client (auto created by Google Service)"**
- Format: `123456789-hijklmn.apps.googleusercontent.com`
- Copy the entire Client ID

#### 3. Android Client ID
- Look for: **"Android client (auto created by Google Service)"**
- Format: `123456789-opqrstu.apps.googleusercontent.com`
- Copy the entire Client ID

### Step 3: Add SHA-1 for Android (Development)

```bash
# Generate debug SHA-1 fingerprint
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Copy the **SHA1** value, then:

1. Go to Firebase Console → Project Settings → General
2. Scroll to **Your apps** → Android app
3. Click **Add fingerprint**
4. Paste the SHA1 value
5. Click **Save**

### Step 4: Update .env File

```bash
cd /Users/joshuamaddox/Codebase/BasketballAIEcosystem/src
```

Edit `.env` and replace the placeholder values:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-hijklmn.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-opqrstu.apps.googleusercontent.com
```

### Step 5: Test

```bash
# Restart with cache cleared
pnpm start --reset-cache

# Then press 'i' for iOS or 'a' for Android
```

Click the "Sign in with Google" button and test!

## Visual Reference

### Where to Find Client IDs

```
Google Cloud Console
└── APIs & Services
    └── Credentials
        ├── Web client (auto created by Google Service)
        │   └── Client ID: YOUR_WEB_CLIENT_ID
        ├── iOS client (auto created by Google Service)  
        │   └── Client ID: YOUR_IOS_CLIENT_ID
        └── Android client (auto created by Google Service)
            └── Client ID: YOUR_ANDROID_CLIENT_ID
```

## Common Values Format

```
Web Client ID:
xxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

iOS Client ID:
xxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

Android Client ID:
xxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

SHA-1 Fingerprint (Android):
XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
```

## Verification Checklist

- [ ] All three Client IDs copied from Google Cloud Console
- [ ] Client IDs pasted into `.env` file
- [ ] SHA-1 fingerprint added to Firebase (Android only)
- [ ] `.env` file saved
- [ ] Metro bundler restarted with `--reset-cache`
- [ ] App running on simulator/device
- [ ] "Sign in with Google" button appears
- [ ] Clicking button opens Google sign-in flow

## Troubleshooting

### Can't Find OAuth Client IDs?

They might not be created yet. Create them manually:

1. Google Cloud Console → APIs & Services → Credentials
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Select application type (Web/iOS/Android)
4. Fill in required details
5. Click **Create**

### Wrong Project in Google Cloud Console?

Make sure you're in the Firebase project:

```bash
# Verify project
firebase projects:list

# Switch if needed
firebase use basketball-ai-ecosystem
```

### Still Having Issues?

See the full guide: `docs/google-oauth-setup.md`

## Time Estimate

- First time: **5-10 minutes**
- Subsequent setups: **2-3 minutes**

## Next Steps

After obtaining the Client IDs:

1. ✅ Test Google Sign-In on iOS simulator
2. ✅ Test Google Sign-In on Android emulator
3. ✅ Verify user creation in Firebase Console → Authentication
4. ✅ Check Firestore for user profile documents
5. ⬜ Configure for production builds
6. ⬜ Add additional OAuth providers (optional)
