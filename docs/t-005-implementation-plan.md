# T-005: CI/CD Staging Deploy - Implementation Plan

**Date:** October 17, 2025  
**Status:** In Progress  
**Owner:** Development Team

## Overview

Implement automated deployment pipeline for staging environment using Firebase services (Hosting, Cloud Functions) with GitHub Actions integration.

## Architecture Decisions

### Deployment Targets
- **Backend API**: Firebase Cloud Functions (Node.js/TypeScript)
- **Web Dashboard**: Firebase Hosting (static assets)
- **Mobile App**: Expo builds (separate from this task, handled in T-005 Mobile)

### Environments
1. **Development**: Local emulators (already configured)
2. **Staging**: Firebase project staging environment (this task)
3. **Production**: Firebase project production environment (future)

## Implementation Steps

### 1. Firebase Cloud Functions Setup

**Files to create:**
- `backend/functions/package.json` - Functions-specific dependencies
- `backend/functions/src/index.ts` - Function entry point
- `backend/functions/tsconfig.json` - Functions TypeScript config

**Migration strategy:**
- Wrap existing Fastify backend as HTTP Cloud Function
- Keep existing API structure intact
- Add Firebase-specific middleware (authentication, CORS)

### 2. Firebase Hosting Configuration

**Files to update:**
- `firebase.json` - Add hosting configuration
- Create `public/` directory for static web dashboard

### 3. Environment Configuration

**Staging environment variables:**
```bash
# Firebase project settings
FIREBASE_PROJECT_ID=basketball-ai-ecosystem-staging
FIREBASE_REGION=us-central1

# API configuration
API_URL=https://us-central1-basketball-ai-ecosystem-staging.cloudfunctions.net/api
NODE_ENV=staging

# Feature flags
ENABLE_AI_ANALYSIS=false  # Disabled for staging MVP
ENABLE_COMMUNITY=false    # Disabled for staging MVP
```

### 4. GitHub Actions Workflows

**Workflows to create:**

#### A. `staging-deploy.yml` (Main deployment)
```yaml
name: Deploy to Staging

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Install dependencies
      - Run tests
      - Build backend functions
      - Deploy to Firebase
      - Verify health endpoint
```

#### B. `pr-preview.yml` (Optional - Preview deployments)
```yaml
name: PR Preview

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - Create preview channel
      - Deploy backend
      - Comment PR with preview URL
```

### 5. Firebase Configuration

**Update `firebase.json`:**
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "backend/functions",
    "runtime": "nodejs18",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ]
  },
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "emulators": {
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "hosting": {
      "port": 5000
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

## Acceptance Criteria

### ✅ Definition of Done

1. **CI Pipeline**
   - [ ] All tests pass on PR
   - [ ] Build succeeds for backend functions
   - [ ] Linting and type checking pass

2. **Staging Deployment**
   - [ ] Backend API deployed to Cloud Functions
   - [ ] `/healthz` endpoint returns 200 OK
   - [ ] `/docs` OpenAPI documentation accessible
   - [ ] Firestore rules deployed
   - [ ] Environment variables configured

3. **Automation**
   - [ ] Auto-deploy on merge to `main`
   - [ ] Manual deployment via GitHub Actions UI
   - [ ] Deployment logs visible in GitHub Actions
   - [ ] Rollback procedure documented

4. **Documentation**
   - [ ] Deployment guide in `docs/deployment.md`
   - [ ] Environment setup instructions
   - [ ] Troubleshooting guide
   - [ ] ADR for deployment decisions

## Security Considerations

### Secrets Management
Store in GitHub repository secrets:
- `FIREBASE_SERVICE_ACCOUNT_KEY` - Service account JSON
- `FIREBASE_TOKEN` - Firebase CLI token (alternative)

### Access Control
- Staging environment read-only for all team members
- Deploy permissions limited to CI/CD pipeline
- Service account with minimal required permissions

## Monitoring & Verification

### Health Checks
```bash
# Verify staging deployment
curl https://us-central1-basketball-ai-ecosystem-staging.cloudfunctions.net/api/healthz

# Expected response:
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-10-17T12:00:00Z",
  "environment": "staging"
}
```

### Metrics to Track
- Deployment duration
- Success/failure rate
- Function cold start times
- API response times

## Rollback Strategy

### Automatic Rollback
- Failed health check → Rollback to previous version
- Error rate > 5% → Alert and manual review

### Manual Rollback
```bash
# List recent deployments
firebase functions:log

# Rollback to specific version
firebase deploy --only functions:api --version <VERSION>
```

## Cost Estimation

### Firebase Cloud Functions (Staging)
- Free tier: 2M invocations/month
- Expected usage: ~10k invocations/month
- **Cost: $0/month** (within free tier)

### Firebase Hosting (Staging)
- Free tier: 10GB storage, 360MB/day transfer
- Expected usage: <1GB storage, <100MB/day
- **Cost: $0/month** (within free tier)

### Total Staging Cost
- **$0/month** (MVP phase within free tiers)

## Timeline

### Phase 1: Basic Deployment (2-3 hours)
- [ ] Configure Firebase Functions
- [ ] Migrate backend to Cloud Functions wrapper
- [ ] Deploy to staging
- [ ] Verify health endpoint

### Phase 2: CI/CD Integration (1-2 hours)
- [ ] Create GitHub Actions workflow
- [ ] Configure secrets
- [ ] Test automated deployment
- [ ] Document process

### Phase 3: Monitoring & Docs (1 hour)
- [ ] Add deployment monitoring
- [ ] Write deployment guide
- [ ] Create ADR-005

**Total estimated time: 4-6 hours**

## Testing Strategy

### Pre-deployment Tests
1. Unit tests pass locally
2. Integration tests pass
3. Type checking succeeds
4. Linting succeeds

### Post-deployment Verification
1. Health endpoint returns 200
2. OpenAPI docs accessible
3. Firebase console shows successful deployment
4. Function logs show no errors
5. Manual API test with Postman/curl

## Dependencies

### Required Tools
- [x] Firebase CLI installed
- [x] GitHub repository access
- [x] Firebase project created
- [ ] Service account credentials
- [ ] GitHub secrets configured

### Required Accounts
- [x] Firebase project owner access
- [x] GitHub repository admin
- [ ] Google Cloud Console access (for service accounts)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cold start latency | High | Use Cloud Run instead (future) |
| Deployment failures | Medium | Implement health checks & rollback |
| Secrets exposure | High | Use GitHub encrypted secrets |
| Cost overruns | Low | Set billing alerts, use quotas |

## Success Metrics

### Technical Metrics
- ✅ Deployment time < 5 minutes
- ✅ Health check latency < 200ms
- ✅ Zero failed deployments
- ✅ 100% test pass rate before deploy

### Business Metrics
- ✅ Staging environment available 99.9% uptime
- ✅ Team can deploy multiple times per day
- ✅ No manual deployment steps required

## Next Steps

After T-005 completion:
1. **T-006**: Add preview deployments for PRs
2. **T-101**: Implement video upload API
3. **T-102**: Mobile app deployment (Expo EAS)

## References

- [Firebase Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [GitHub Actions Firebase Deploy](https://github.com/marketplace/actions/deploy-to-firebase-hosting)

---

**Status**: Ready to implement  
**Priority**: High (blocks Sprint 2 features)  
**Estimated completion**: October 17, 2025
