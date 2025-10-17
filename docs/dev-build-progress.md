# Development Build Guide - Google Sign-In Testing

**Date:** October 17, 2025  
**Status:** ⏳ Building iOS Development Build

---

## What's Happening Now

The command `npx expo run:ios` is creating a **development build** that includes native modules like `ExpoLinking` and `ExpoWebBrowser` required for Google Sign-In.

### Build Process Steps:

1. ✅ **Prebuild** - Generate native iOS project
2. ⏳ **Installing CocoaPods** - Install iOS dependencies (currently running)
3. ⏳ **Compiling** - Build the iOS app with Xcode
4. ⏳ **Installing** - Install on simulator
5. ⏳ **Starting** - Launch the app

**Estimated Time:** 5-10 minutes (first time)

---

## Why We Need a Development Build

### The Problem:
- **Expo Go** is a generic app that doesn't include all native modules
- `expo-auth-session` requires native modules: `ExpoLinking`, `ExpoWebBrowser`
- Error: `"Cannot find native module 'ExpoLinking'"`

### The Solution:
- **Development Build** = Custom app with YOUR native modules
- Includes all dependencies from `package.json`
- Works exactly like production app
- Can be rebuilt quickly for changes

---

## What Will Change

### Before (Expo Go):
```
┌─────────────────┐
│   Expo Go App   │  ← Generic, limited modules
│   (3rd party)   │
└─────────────────┘
```

### After (Development Build):
```
┌─────────────────────────┐
│  Basketball AI Dev App  │  ← Custom, all modules
│  (Your app + native)    │
└─────────────────────────┘
```

---

## After Build Completes

### 1. App Will Auto-Launch
The iOS simulator will open with your custom development build.

### 2. Test Google Sign-In
1. Navigate to Sign In screen
2. Click "Sign in with Google"
3. **Google OAuth page should open** ✅
4. Sign in with your Google account
5. Get redirected back to app
6. User profile created in Firestore

### 3. What Success Looks Like

**Console Logs:**
```
🔐 Initiating Google sign-in...
✅ Google auth successful, exchanging token...
✅ Google sign-in complete
```

**In App:**
- Google sign-in popup opens
- You complete authentication
- Redirected back to app
- Signed in successfully

**In Firebase Console:**
- New user in Authentication
- User profile in Firestore `users` collection

---

## If Build Fails

### Common Issues & Fixes

#### Issue: CocoaPods installation hangs
**Fix:** Cancel (Ctrl+C) and run:
```bash
cd /Users/joshuamaddox/Codebase/BasketballAIEcosystem/src/ios
pod install
cd ..
npx expo run:ios
```

#### Issue: Xcode not found
**Fix:** Install Xcode from App Store, then run:
```bash
sudo xcode-select --switch /Applications/Xcode.app
```

#### Issue: Build errors in Xcode
**Fix:** Clean and rebuild:
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npx expo run:ios
```

#### Issue: Simulator not opening
**Fix:** Open manually:
```bash
open -a Simulator
```

---

## Development Build vs Production

| Feature | Expo Go | Dev Build | Production |
|---------|---------|-----------|------------|
| Native Modules | Limited | ✅ All | ✅ All |
| Google Sign-In | ❌ No | ✅ Yes | ✅ Yes |
| Build Time | Instant | 5-10 min | 15-30 min |
| Hot Reload | ✅ Yes | ✅ Yes | ❌ No |
| Distribution | App Store | Simulator | App Store |

---

## Next Steps After Build

### Immediate Testing (5 min)
- [ ] App launches successfully
- [ ] Navigate to Sign In screen
- [ ] Click "Sign in with Google"
- [ ] Complete Google authentication
- [ ] Verify successful sign-in

### Verify in Firebase (2 min)
- [ ] Open Firebase Console → Authentication
- [ ] See new Google user
- [ ] Open Firestore → users collection
- [ ] See user profile document

### Additional Testing (10 min)
- [ ] Test sign out
- [ ] Test sign in again (should be faster)
- [ ] Close and reopen app (should stay signed in)
- [ ] Test email/password sign-in still works

---

## Rebuilding Later

### When to Rebuild:
- Added new native dependencies
- Changed native configuration
- Updated Expo SDK version
- After `pod install` in iOS

### Quick Rebuild:
```bash
cd /Users/joshuamaddox/Codebase/BasketballAIEcosystem/src
npx expo run:ios
```

### Clean Rebuild (if issues):
```bash
cd /Users/joshuamaddox/Codebase/BasketballAIEcosystem/src
rm -rf ios/Pods ios/Podfile.lock
npx expo run:ios --clean
```

---

## Monitoring Build Progress

### Watch Terminal Output
The terminal will show:
1. Installing CocoaPods dependencies
2. Linking native modules
3. Compiling with Xcode
4. Installing on simulator
5. Launching app

### If It Gets Stuck
- Wait 10-15 minutes (first build is slow)
- Check for error messages
- Look for prompts (may need to accept Xcode license)

---

## Success Criteria

### ✅ Build Complete When:
- iOS simulator opens
- Basketball AI app launches
- Home screen appears
- No crash on startup

### ✅ Google Sign-In Works When:
- Button is clickable
- Google OAuth page opens
- Can sign in with Google account
- Redirected back to app successfully
- User profile created in Firestore

---

## Troubleshooting Resources

### Build Issues
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/create-a-build/)
- [iOS Setup](https://docs.expo.dev/workflow/ios-simulator/)
- [CocoaPods Troubleshooting](https://guides.cocoapods.org/using/troubleshooting)

### Google Sign-In Issues
- See: `docs/google-oauth-setup.md`
- See: `docs/google-oauth-quick-setup.md`

---

## What's Running Now

```
Terminal: npx expo run:ios
Status: Installing CocoaPods...
Time: ~10 minutes remaining
```

**Please wait for the build to complete. You'll see "Build succeeded" when ready.**

---

## After This Works

Once Google Sign-In works in the development build:

### Optional: Create EAS Build
For easier distribution to team:
```bash
npm install -g eas-cli
eas login
eas build --profile development --platform ios
```

### Continue Development
You can keep using the development build:
- Hot reload still works
- Fast refresh enabled
- Native modules available
- Same as Expo Go experience, but with more features

---

**Current Status:** ⏳ Building... Check terminal for progress.

**Next Update:** When build completes or if errors occur.
