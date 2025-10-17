# Firebase Configuration Setup Guide

This guide will help you set up Firebase authentication with your basketball-ai-ecosystem project.

## Step 1: Move Firebase Config Files

### Backend Service Account Key
1. Move your downloaded service account JSON file to:
   ```
   backend/config/firebase-service-account.json
   ```
   
2. The file should be named similar to:
   ```
   basketball-ai-ecosystem-firebase-adminsdk-xxxxx-xxxxxxxxxx.json
   ```

### Mobile Configuration Files
1. Move `GoogleService-Info.plist` (iOS) to:
   ```
   src/config/GoogleService-Info.plist
   ```

2. Move `google-services.json` (Android) to:
   ```
   src/config/google-services.json
   ```

## Step 2: Create Environment Files

### Backend Environment (.env)
Create `backend/.env` with these values from your service account JSON:

```bash
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Firebase Configuration
FIREBASE_PROJECT_ID=basketball-ai-ecosystem
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@basketball-ai-ecosystem.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[YOUR_PRIVATE_KEY_FROM_JSON]\n-----END PRIVATE KEY-----"

# Database Configuration (for future use)
DATABASE_URL="postgresql://username:password@localhost:5432/basketball_ai"
```

### Mobile Environment (.env)
Create `src/.env` with values from Firebase Console -> Project Settings -> General:

```bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your-web-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=basketball-ai-ecosystem.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=basketball-ai-ecosystem
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=basketball-ai-ecosystem.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-web-app-id

# API Configuration
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Step 3: Extract Values from Service Account JSON

Your service account JSON should look like this:
```json
{
  "type": "service_account",
  "project_id": "basketball-ai-ecosystem",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@basketball-ai-ecosystem.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

Use these values:
- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`  
- `private_key` → `FIREBASE_PRIVATE_KEY` (keep the \n characters)

## Step 4: Get Mobile Config Values

Go to Firebase Console → basketball-ai-ecosystem → Project Settings → General → Your apps section:

1. For **Web App**: Copy these values:
   - API Key → `EXPO_PUBLIC_FIREBASE_API_KEY`
   - App ID → `EXPO_PUBLIC_FIREBASE_APP_ID`

2. For **Project Settings**:
   - Project ID: `basketball-ai-ecosystem` (already set)
   - Messaging Sender ID → `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`

## Step 5: Verify Setup

Run the tests to ensure everything is working:

```bash
# From project root
make test
```

## Security Notes

- Never commit `.env` files to git
- The config files are already added to `.gitignore`
- Environment variables are validated at startup
- Tests use mock configurations to avoid requiring real credentials

## Troubleshooting

### "Firebase configuration missing" error
- Check that all environment variables are set in your `.env` files
- Ensure the private key includes the `-----BEGIN/END PRIVATE KEY-----` headers
- Make sure there are no extra spaces or characters

### "Invalid service account" error  
- Verify the service account JSON file is in the correct location
- Check that the service account has the necessary permissions in Firebase Console

### Mobile app can't connect
- Ensure the mobile `.env` file has all required `EXPO_PUBLIC_` prefixed variables
- Check that the API key is for a web application (not restricted to specific domains)
- Verify the project ID matches exactly: `basketball-ai-ecosystem`
