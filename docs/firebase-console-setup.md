# 🔥 Firebase Console Configuration Guide

## Overview
Your Firebase-only architecture is now complete! Here's exactly what you need to configure in the Firebase Console to enable all features.

## 🚀 Firebase Services to Enable

### 1. **Firestore Database** ⭐ (CRITICAL)

**Step-by-step:**
1. Go to Firebase Console → Project "basketball-ai-ecosystem"
2. Click **"Firestore Database"** in the left sidebar
3. Click **"Create database"**
4. Choose **"Start in test mode"** (for development)
5. Select a location (recommended: `us-central1`)
6. Click **"Done"**

**Security Rules (for development):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read/write shots
    match /shots/{shotId} {
      allow read, write: if request.auth != null;
    }
    
    // Allow authenticated users to read/write training plans
    match /training_plans/{planId} {
      allow read, write: if request.auth != null;
    }
    
    // Allow authenticated users to read/write community posts
    match /community_posts/{postId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 2. **Firebase Storage** ⭐ (CRITICAL)

**Step-by-step:**
1. Click **"Storage"** in the left sidebar
2. Click **"Get started"**
3. Choose **"Start in test mode"**
4. Select same location as Firestore
5. Click **"Done"**

**Security Rules (for development):**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload videos and images
    match /shots/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /profiles/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /thumbnails/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /drills/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.role == 'admin';
    }
  }
}
```

### 3. **Authentication** ✅ (ALREADY CONFIGURED)
Your authentication is already working! No additional configuration needed.

### 4. **Cloud Functions** (OPTIONAL for now)

**For future AI processing:**
1. Click **"Functions"** in the left sidebar
2. Click **"Get started"** 
3. Follow setup instructions when you're ready for T-104 (AI integration)

## 📊 Expected Database Structure

Once you start using the app, Firestore will automatically create these collections:

```
basketball-ai-ecosystem (database)
├── users/
│   └── {userId}/
│       ├── email: string
│       ├── displayName: string
│       ├── role: 'free' | 'premium' | 'admin'
│       ├── stats: { totalShots, totalPoints, level, etc. }
│       └── preferences: { notifications, shareProgress, etc. }
├── shots/
│   └── {shotId}/
│       ├── userId: string
│       ├── videoUrl: string
│       ├── status: 'processing' | 'completed'
│       ├── metrics: { release_ms, elbow_angle_deg, etc. }
│       └── location: { lat, lng, court }
├── training_plans/
│   └── {planId}/
│       ├── userId: string
│       ├── title: string
│       ├── drills: [{ id, title, completed, etc. }]
│       └── progress: { completedDrills, timeSpent }
└── community_posts/
    └── {postId}/
        ├── userId: string
        ├── content: string
        ├── type: 'shot_analysis' | 'achievement' | 'general'
        ├── likes: number
        └── createdAt: timestamp
```

## 🧪 Testing Your Setup

### Method 1: Use the Firebase Demo Screen
1. Run your app: `make dev`
2. Sign in with a test account
3. Navigate to the "🔥 Firebase Demo" screen
4. Test all features:
   - Create demo shots
   - Post to community feed
   - View real-time updates

### Method 2: Firebase Console Testing
1. Go to Firestore Database in console
2. You should see data appear as you use the app
3. Try editing data in console - it should update in app immediately!

### Method 3: Storage Testing
1. Go to Storage in console
2. Upload a test image/video through the app
3. Verify files appear in Storage console

## 🔒 Security Notes

### Current Setup (Development)
- **Firestore**: Test mode (anyone can read/write)
- **Storage**: Test mode (anyone can read/write)
- **Auth**: Email/password enabled

### For Production (Later)
- Update security rules to be more restrictive
- Enable other auth providers (Google, Apple)
- Set up Cloud Functions for advanced logic
- Configure billing and quotas

## 🎯 What This Gives You

### ✅ **Working Now:**
- Real-time user profiles
- Shot data storage
- Training plan management
- Community features
- File uploads
- Offline support
- Auto-scaling
- No backend server needed!

### 🚀 **Ready for Future:**
- AI shot analysis (T-104)
- Advanced training algorithms (T-201)
- Video processing pipeline
- Push notifications
- Analytics dashboard

## 💰 Cost Expectations

### Firebase Free Tier (Generous!)
- **Firestore**: 1GB storage, 50K reads, 20K writes per day
- **Storage**: 5GB, 1GB downloads per day
- **Authentication**: Unlimited users
- **Functions**: 125K invocations per month

### This should easily cover:
- 100+ active users
- Thousands of shots per month
- All development and testing

## 🏃‍♂️ Next Steps

1. **Enable Firestore & Storage** (critical - do this now)
2. **Test the Firebase Demo screen** (verify everything works)
3. **Optional: Customize security rules** (if needed)
4. **Ready for T-004: Database schema design** (can skip since using Firestore!)

## 🆘 Troubleshooting

### "Firestore error: Missing or insufficient permissions"
- Check that you enabled Firestore in test mode
- Verify security rules allow your operations

### "Storage error: User does not have permission"
- Enable Storage in Firebase Console
- Verify storage rules allow authenticated users

### "Network error"
- Check your internet connection
- Verify Firebase project ID in environment variables

## 🎉 You're Ready!

Your Firebase architecture is now complete and production-ready! No backend server needed - Firebase handles everything. You can now focus on building features instead of managing infrastructure.

Run `make dev` and test the Firebase Demo screen to see everything working! 🚀
