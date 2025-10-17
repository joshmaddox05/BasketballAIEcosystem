# Firebase Emulator Setup Guide

## Overview
This guide explains how to use Firebase emulators for local development to avoid "Missing or insufficient permissions" errors when testing database operations.

## Problem
When running the React Native app with production Firebase, you may encounter:
```
ERROR [FirebaseError: Missing or insufficient permissions.]
```

This happens because:
1. Firestore security rules require authentication
2. During development, you may not be signed in
3. Database initialization/migration needs unrestricted access

## Solution: Use Firebase Emulators

### 1. Install Firebase CLI (One-time setup)
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Start Firebase Emulators
```bash
# From project root
firebase emulators:start --only firestore
```

Or use the Makefile target:
```bash
make firebase-emulator
```

### 4. Configure Your App to Use Emulator
In `src/.env`, set:
```properties
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true
```

### 5. Restart Your React Native App
```bash
cd src && npm run dev
```

## How It Works

When `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true`, the app automatically connects to:
- **Firestore Emulator**: `localhost:8080`
- **Auth Emulator**: `localhost:9099` (if enabled)
- **Emulator UI**: `http://localhost:4000`

The emulator provides:
- ✅ Full database access without authentication
- ✅ Local data that resets on restart
- ✅ Real-time UI to view/edit data
- ✅ No risk to production data
- ✅ Offline development capability

## Emulator UI Features

Visit `http://localhost:4000` to:
- View all Firestore collections and documents
- Manually add/edit/delete data
- Monitor real-time queries
- Debug security rules
- Test cloud functions (when configured)

## Production vs Development

### Development (Emulator)
```bash
# In src/.env
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true
```
- Uses local emulator on `localhost:8080`
- No authentication required
- Data is ephemeral (resets on restart)
- Safe for testing migrations and seed data

### Production (Live Firebase)
```bash
# In src/.env
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=false
```
- Uses actual Firebase project
- Requires authentication
- Data persists permanently
- Security rules enforced

## Database Initialization with Emulator

When using the emulator, the database initialization will succeed:

```typescript
// This runs automatically when firestore.ts is imported
initializeDatabase().catch(console.error);
```

The migration system will:
1. ✅ Create the `database_metadata` collection
2. ✅ Set up all 8 collections (users, videos, shots, drills, etc.)
3. ✅ Seed initial drill data
4. ✅ Apply indexes and security rules

## Troubleshooting

### Emulator Won't Start
```bash
# Kill any existing emulator processes
pkill -f firebase
lsof -ti:8080 | xargs kill -9
lsof -ti:4000 | xargs kill -9

# Then restart
firebase emulators:start --only firestore
```

### App Still Uses Production
1. Verify `.env` has `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true`
2. Restart Metro bundler: `r` in the Expo terminal
3. Check console logs for "Connected to Firebase emulators"

### Data Not Persisting
This is expected behavior! Emulator data resets on restart. To persist data:
- Export data: `firebase emulators:export ./emulator-data`
- Import data: `firebase emulators:start --import ./emulator-data`

## Next Steps

Once your app works with the emulator:

1. **Update Security Rules for Production**
   - Edit `firestore.rules`
   - Test rules in emulator
   - Deploy: `firebase deploy --only firestore:rules`

2. **Create an Admin User for Production**
   - Use Firebase Console to create a user
   - Manually set `role: 'admin'` in Firestore
   - Use this user to run migrations in production

3. **Run Production Migrations**
   - Sign in with admin user
   - The migration will run automatically
   - Verify in Firebase Console

## Quick Reference

```bash
# Start emulator
firebase emulators:start --only firestore

# View emulator UI
open http://localhost:4000

# Stop emulator
Ctrl+C (in emulator terminal)

# Or kill all Firebase processes
pkill -f firebase
```

## Benefits

✅ **Fast Development**: No network latency
✅ **Safe Testing**: Can't break production data
✅ **Offline Work**: No internet required
✅ **Free**: No Firebase usage costs
✅ **Easy Reset**: Restart emulator for clean state
✅ **Full Control**: Edit data directly in UI

---

**Related Documents:**
- [T-001 Infrastructure Setup](./t-001-completion-summary.md)
- [T-004 Database Schema](./t-004-completion-summary.md)
- [Firebase Console Setup](./firebase-console-setup.md)
