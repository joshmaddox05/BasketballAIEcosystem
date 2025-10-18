# MVP Plan – - **T-001** ✅ Monorepo & Tooling (Complete)  
- **T-002** ✅ Backend Health & OpenAPI (Complete)  
- **T-003** ✅ Auth Wiring (Firebase JWT) (Complete - Production Ready)
- **T-004** ✅ Firebase Schema v1 (Complete - See [comparison doc](./database-schema-comparison.md))
- **T-005** ⏳ CI/CD Staging Deploy (Next)NA + DBE + Community

**Issue Type:** Epic  
**Created:** 2025-10-17  
**Status:** In Progress  

## Overview

Track implementation of Basketball AI Ecosystem MVP with AI jump-shot critique, training blueprints (DBE), and community features. This epic covers all tickets from T-001 through T-602.

## Progress Summary

### ✅ Sprint 1 – Foundations (COMPLETE)
- **T-001** ✅ Monorepo & Tooling (Complete)
- **T-002** ✅ Backend Health & OpenAPI (Complete)  
- **T-003** ✅ Auth Wiring (Firebase JWT) (Complete - Production Ready)
- **T-004** ✅ Firebase Schema v1 (Complete - Full feature parity)
- **T-005** ✅ CI/CD Staging Deploy (Complete)

### 🔄 Sprint 2 – Video + Metrics Contract + Baseline AI (IN PROGRESS)
- **T-101** ✅ Signed Upload Flow (API) (Complete - See [ADR-101](./adr/101-signed-upload-flow.md))
- **T-102** ⏳ RN Camera + Resumable Upload  
- **T-103** ⏳ ShotDNA Metrics JSON Contract
- **T-104** ⏳ Baseline Model (MediaPipe → TFLite)
- **T-105** ⏳ Feedback Overlay (Static → Live)

### ⏳ Sprint 3 – Intelligence Layer
- **T-201** ⏳ DBE Rules Engine
- **T-202** ⏳ Drill Library + API
- **T-203** ⏳ Training Hub UI
- **T-204** ⏳ EvalRank Score

### ⏳ Sprint 4 – Simulation & Scouting
- **T-301** ⏳ SimCoach 2D MVP
- **T-302** ⏳ ScoutLab

### ⏳ Sprint 5 – Marketplace & Licensing
- **T-401** ⏳ CoachMarket + Stripe
- **T-402** ⏳ Licensing Portal

### ⏳ Sprint 6 – Community & Legacy
- **T-501** ⏳ HoopCommunity Feed
- **T-502** ⏳ LegacyVault

### ⏳ Sprint 7 – QA & Launch
- **T-601** ⏳ QA Matrix & Perf
- **T-602** ⏳ Store Releases

## Current Sprint: Sprint 1 - Foundations

### Completed This Sprint
1. **T-001: Monorepo & Tooling** ✅
   - ✅ pnpm workspace configuration
   - ✅ Development scripts (`make dev`, `make test`, etc.)
   - ✅ ESLint + Prettier + Husky setup
   - ✅ GitHub Actions CI pipeline
   - ✅ Backend (Fastify + TypeScript) structure
   - ✅ Mobile app (Expo + React Native) structure

2. **T-002: Backend Health & OpenAPI** ✅
   - ✅ Enhanced health endpoint with system metrics
   - ✅ Request ID middleware for tracing
   - ✅ Error handling middleware
   - ✅ Comprehensive OpenAPI documentation
   - ✅ Interactive Swagger UI at `/docs`

### Completed in Sprint 1
1. **T-001**: Monorepo & Tooling (See ADR-001)
2. **T-002**: Backend Health & OpenAPI (See ADR-002)
3. **T-003**: Firebase JWT Auth (See ADR-003)
4. **T-004**: Firebase/Firestore Schema v1 (See ADR-004)
5. **T-005**: CI/CD Staging Deploy (See ADR-005)

### Next Sprint: Sprint 2 - Video + Metrics + AI
- **T-101**: Signed Upload Flow (API)
- **T-102**: RN Camera + Resumable Upload
- **T-103**: ShotDNA Metrics JSON Contract
- **T-104**: Baseline Model (MediaPipe → TFLite)
- **T-105**: Feedback Overlay (Static → Live)

## Architecture Decisions Made

1. **[ADR-000]** Context sync and technology stack decisions
2. **[ADR-001]** Monorepo structure with pnpm workspaces  
3. **[ADR-002]** Health monitoring and OpenAPI documentation standards
4. **[ADR-003]** Firebase JWT authentication and role-based access control
5. **[ADR-004]** Firebase/Firestore schema v1 (pivoted from Postgres)
6. **[ADR-005]** CI/CD staging deployment with Firebase Cloud Functions + Hosting

## Technical Foundation Status

### ✅ Core Infrastructure
- [x] Monorepo with pnpm workspaces
- [x] TypeScript strict mode across packages
- [x] ESLint + Prettier code quality
- [x] Pre-commit hooks with Husky
- [x] GitHub Actions CI pipeline
- [x] Fastify backend with health endpoints
- [x] Expo React Native mobile app structure

### ✅ Development Experience  
- [x] `make dev` starts backend + mobile
- [x] Hot reload for development
- [x] Comprehensive OpenAPI docs
- [x] Request tracing with UUIDs
- [x] Structured error handling

### 🔄 Current Work
- [ ] CI/CD staging deployment pipeline (T-005)
- [ ] Video upload flow planning (T-101)

### ✅ Recently Completed
- [x] Firebase Auth integration (T-003)
- [x] JWT middleware and role guards (T-003)
- [x] Database schema and migrations (T-004 - Firebase/Firestore)
- [x] Repository pattern and type safety (T-004)

## Key Metrics & Acceptance Criteria

### Definition of Done (Every PR)
1. ✅ Code + tests updated  
2. ✅ Docs updated (ADR + OpenAPI)
3. ⏳ Feature flags for risky changes
4. ⏳ Telemetry events added  
5. ✅ "How I verified" section

### Technical Quality Gates
- ✅ CI runs lint/build/test on every PR
- ✅ Type checking passes
- ✅ Health endpoints return 200
- ✅ OpenAPI docs accessible
- ⏳ Test coverage targets (TBD)

## Risks & Blockers

### Current Risks
- **Jest configuration**: TypeScript ES modules need proper setup for unit tests
- **Database choice**: Postgres schema needs finalization before T-004
- **Firebase setup**: Need project configuration for auth integration

### Mitigation Strategies
- Fix Jest config in T-003 while implementing auth tests
- Design database schema in parallel with auth implementation
- Set up Firebase project for development environment

## Next Sprint Planning

**Sprint 1 Completion Target:** End of week  
**Sprint 2 Start:** Video upload and AI baseline model implementation

Focus for next sprint will be establishing the core video processing pipeline and initial AI model integration.
