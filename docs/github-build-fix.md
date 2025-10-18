# GitHub Build Fix: Missing Cloud Functions Dependencies

**Issue:** GitHub Actions staging deployment failing  
**Fixed:** 2025-10-18  
**Commit:** 3f49869  

---

## Problem

GitHub Actions workflow failed during TypeScript compilation with errors:

```
Error: src/index.ts(12,20): error TS2307: Cannot find module '@fastify/helmet' 
       or its corresponding type declarations.

Error: src/index.ts(15,30): error TS7016: Could not find a declaration file for 
       module 'uuid'. Try `npm i --save-dev @types/uuid`

Error: Process completed with exit code 2.
```

---

## Root Cause

The `backend/functions/package.json` was missing dependencies that were used in the Cloud Function code:

1. **`@fastify/helmet`** - Security headers middleware (runtime dependency)
2. **`uuid`** - UUID generation utility (runtime dependency)
3. **`@types/uuid`** - TypeScript type definitions (dev dependency)

These packages were imported in `backend/functions/src/index.ts` but not declared in the package.json, causing TypeScript compilation to fail in CI.

---

## Solution

Updated `backend/functions/package.json` to include missing dependencies:

```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.5.0",
    "fastify": "^4.25.2",
    "@fastify/cors": "^8.5.0",
    "@fastify/helmet": "^11.1.1",        // ✅ Added
    "@fastify/swagger": "^8.13.0",
    "@fastify/swagger-ui": "^2.1.0",
    "uuid": "^9.0.1"                     // ✅ Added
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.10.6",
    "@types/uuid": "^9.0.7",             // ✅ Added
    "firebase-functions-test": "^3.1.1"
  }
}
```

---

## Verification

### Local Testing
```bash
cd backend/functions
npm install
npm run build
```

**Result:** ✅ Build successful, no TypeScript errors

### GitHub Actions
```bash
git add backend/functions/package.json
git commit -m "fix: Add missing Cloud Functions dependencies"
git push origin main
```

**Expected:** ✅ GitHub Actions build should now pass

---

## Why This Happened

The dependencies were installed locally in the previous session via `npm install`, which added them to `node_modules/` and `package-lock.json`. However, they were not explicitly added to `package.json` at that time.

When GitHub Actions runs `npm ci` (clean install), it only installs packages listed in `package.json`. Since these dependencies were missing, the build failed.

---

## Lesson Learned

**Always verify `package.json` includes all dependencies** before committing, especially when:
1. Adding new imports to source files
2. Testing with emulators (which may use local packages)
3. Creating new workspace packages

**Best Practice:**
```bash
# After installing any package, verify it's in package.json
npm install <package>
git diff package.json  # ✅ Should show the new dependency
```

---

## Related Issues

### Mobile App Error (Separate Issue)

The error logs also show a mobile app issue:
```
ERROR  ReferenceError: Property 'googleRequest' doesn't exist
```

**Status:** Not related to GitHub build failure  
**Cause:** Metro bundler cache referencing old code  
**Solution:** Clear Metro cache with `npx expo start --clear`  

This is a separate issue from the Google Sign-In implementation that was paused earlier.

---

## Files Changed

```
backend/functions/package.json       # Added 3 dependencies
backend/functions/package-lock.json  # Updated lockfile
```

---

## Next Steps

1. ✅ Wait for GitHub Actions to complete
2. ✅ Verify staging deployment succeeds
3. ✅ Test health endpoint in production
4. ✅ Ready to start Sprint 2

---

**Status:** ✅ Fixed and deployed  
**GitHub Actions:** Should pass on next run  
**Ready for Sprint 2:** Yes
