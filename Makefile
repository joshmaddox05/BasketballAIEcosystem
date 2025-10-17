.PHONY: dev test lint build clean setup install help
.PHONY: db-setup db-migrate firebase-emulator firebase-deploy
.PHONY: dev-full dev-mobile dev-backend
.PHONY: ci verify pipeline-check

# Default target
help:
	@echo "Basketball AI Ecosystem - Development Commands"
	@echo ""
	@echo "Development:"
	@echo "  dev          Start mobile app development server"
	@echo "  dev-full     Start full development environment (mobile + Firebase emulator)"
	@echo "  dev-mobile   Start mobile app only"
	@echo "  dev-backend  Legacy backend (deprecated - using Firebase)"
	@echo ""
	@echo "Database:"
	@echo "  db-setup     Setup database schema and seed data"
	@echo "  db-migrate   Run database migrations"
	@echo ""
	@echo "Firebase:"
	@echo "  firebase-emulator    Start Firebase emulators for local development"
	@echo "  firebase-deploy      Deploy to Firebase production"
	@echo "  firebase-deploy-dev  Deploy security rules and indexes"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  test         Run all tests"
	@echo "  test-watch   Run tests in watch mode"
	@echo "  lint         Check code style"
	@echo "  lint-fix     Fix code style issues"
	@echo "  type-check   Run TypeScript type checking"
	@echo ""
	@echo "Build & Deploy:"
	@echo "  build        Build all packages"
	@echo "  ci           Run CI pipeline locally"
	@echo "  verify       Verify setup and dependencies"
	@echo ""
	@echo "Setup & Maintenance:"
	@echo "  setup        Initial project setup"
	@echo "  install      Install dependencies"
	@echo "  clean        Clean build artifacts and dependencies"

# Development - T-001 Requirement: make dev runs app + backend locally
dev: install
	@echo "🚀 Starting Basketball AI Ecosystem development environment..."
	@echo "📱 Mobile app will start on expo://localhost:8081"
	@echo "🔥 Firebase emulators available at http://localhost:4000"
	@echo ""
	pnpm dev

dev-full: install db-setup
	@echo "🚀 Starting full development environment..."
	@echo "📱 Mobile: expo://localhost:8081"
	@echo "🔥 Firebase UI: http://localhost:4000"
	@echo "🗄️  Firestore: localhost:8080"
	@echo ""
	@echo "Starting Firebase emulators in background..."
	@pnpm firebase:emulator &
	@sleep 3
	@echo "Starting mobile development server..."
	@pnpm dev

dev-mobile: install
	pnpm dev:mobile

dev-backend:
	@echo "⚠️  Backend deprecated - using Firebase-only architecture"
	@echo "💡 Use 'make firebase-emulator' for local Firebase development"

# Database Management
db-setup: install
	@echo "📦 Setting up database schema and seed data..."
	pnpm db:setup

db-migrate: install
	@echo "🔄 Running database migrations..."
	pnpm db:migrate

# Firebase
firebase-emulator:
	@echo "🔥 Starting Firebase emulators..."
	@echo "UI available at: http://localhost:4000"
	@echo "Firestore: localhost:8080"
	pnpm firebase:emulator

firebase-deploy:
	@echo "🚀 Deploying to Firebase production..."
	pnpm firebase:deploy

firebase-deploy-dev:
	@echo "📋 Deploying security rules and indexes..."
	pnpm firebase:deploy:rules
	pnpm firebase:deploy:indexes

# Testing
test: install
	pnpm test

test-watch: install
	pnpm test --watch

# Linting and formatting
lint: install
	pnpm lint

lint-fix: install
	pnpm lint:fix

# Building
build: install
	pnpm build

type-check: install
	pnpm type-check

# CI Pipeline - T-001 Requirement
ci: install lint type-check test build
	@echo "✅ CI pipeline completed successfully"

# Setup verification - T-001 Requirement
verify: install
	@echo "🔍 Running comprehensive T-001 infrastructure verification..."
	pnpm verify

pipeline-check: verify ci
	@echo "🎯 Full pipeline verification completed"

# Setup and maintenance
setup: install db-setup
	@echo "🎯 Basketball AI Ecosystem setup completed!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Run 'make verify' to check your setup"
	@echo "  2. Run 'make dev' to start development"
	@echo "  3. Visit expo://localhost:8081 for mobile app"
	@echo "  4. Visit http://localhost:4000 for Firebase UI"
	pnpm prepare

install:
	@echo "📦 Installing dependencies..."
	pnpm install

clean:
	@echo "🧹 Cleaning build artifacts and dependencies..."
	pnpm clean