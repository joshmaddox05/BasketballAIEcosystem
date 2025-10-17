#!/bin/bash

# Firebase Configuration Verification Script
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

echo "🏀 Firebase Configuration Verification"
echo "======================================"
echo ""

# Check backend configuration
print_info "Checking backend configuration..."

if [ -f "$PROJECT_ROOT/backend/config/firebase-service-account.json" ]; then
    print_success "Service account JSON file exists"
    
    # Extract project ID from JSON
    PROJECT_ID=$(grep -o '"project_id": "[^"]*"' "$PROJECT_ROOT/backend/config/firebase-service-account.json" | cut -d'"' -f4)
    if [ "$PROJECT_ID" = "basketball-ai-ecosystem" ]; then
        print_success "Correct project ID: $PROJECT_ID"
    else
        print_error "Incorrect project ID: $PROJECT_ID (expected: basketball-ai-ecosystem)"
    fi
else
    print_error "Service account JSON file missing"
fi

if [ -f "$PROJECT_ROOT/backend/.env" ]; then
    print_success "Backend .env file exists"
else
    print_warning "Backend .env file missing (optional when using service account JSON)"
fi

echo ""

# Check mobile configuration
print_info "Checking mobile configuration..."

if [ -f "$PROJECT_ROOT/src/.env" ]; then
    print_success "Mobile .env file exists"
    
    # Check if it has the right project ID
    if grep -q "EXPO_PUBLIC_FIREBASE_PROJECT_ID=basketball-ai-ecosystem" "$PROJECT_ROOT/src/.env"; then
        print_success "Correct Firebase project ID in mobile config"
    else
        print_warning "Update EXPO_PUBLIC_FIREBASE_PROJECT_ID in src/.env to 'basketball-ai-ecosystem'"
    fi
    
    # Check for placeholder values
    if grep -q "your-api-key-from-firebase-console" "$PROJECT_ROOT/src/.env"; then
        print_warning "Mobile .env still contains placeholder values - update with real Firebase config"
        echo "   Go to: Firebase Console → Project Settings → General → Your apps"
    fi
else
    print_error "Mobile .env file missing"
fi

echo ""

# Check for mobile platform configs
print_info "Checking mobile platform configurations..."

if [ -f "$PROJECT_ROOT/src/config/google-services.json" ]; then
    print_success "Android configuration (google-services.json) exists"
else
    print_warning "Android configuration missing - needed for production Android builds"
fi

if [ -f "$PROJECT_ROOT/src/config/GoogleService-Info.plist" ]; then
    print_success "iOS configuration (GoogleService-Info.plist) exists"
else
    print_warning "iOS configuration missing - needed for production iOS builds"
fi

echo ""

# Test the configuration
print_info "Testing Firebase configuration..."

cd "$PROJECT_ROOT"
if make test > /dev/null 2>&1; then
    print_success "All tests passing - Firebase configuration working correctly"
else
    print_error "Tests failing - there may be configuration issues"
fi

echo ""
print_info "Configuration Summary:"
echo "• Backend: Using service account JSON (recommended for development)"
echo "• Mobile: Environment variables (needs real Firebase console values)"
echo "• Project ID: basketball-ai-ecosystem"
echo ""

if [ -f "$PROJECT_ROOT/src/config/google-services.json" ] && [ -f "$PROJECT_ROOT/src/config/GoogleService-Info.plist" ]; then
    print_success "Ready for production deployment!"
else
    print_warning "For production, add mobile platform config files from Firebase Console"
fi

echo ""
print_info "Next steps:"
echo "1. Update src/.env with real Firebase console values"
echo "2. Add mobile platform configs if missing"
echo "3. Run 'make dev' to start development servers"
