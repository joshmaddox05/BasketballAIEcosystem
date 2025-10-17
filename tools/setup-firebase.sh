#!/bin/bash

# Firebase Configuration Setup Script
# This script helps move Firebase config files and set up environment variables

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "🏀 Basketball AI - Firebase Setup"
echo "Project root: $PROJECT_ROOT"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check for Firebase config files in Downloads
DOWNLOADS_DIR="$HOME/Downloads"

print_status "Checking for Firebase config files in Downloads directory..."

# Look for service account JSON
SERVICE_ACCOUNT_JSON=$(find "$DOWNLOADS_DIR" -name "*basketball-ai-ecosystem*firebase-adminsdk*.json" -type f 2>/dev/null | head -1)
GOOGLE_SERVICES_JSON=$(find "$DOWNLOADS_DIR" -name "google-services.json" -type f 2>/dev/null | head -1)
GOOGLE_SERVICE_PLIST=$(find "$DOWNLOADS_DIR" -name "GoogleService-Info.plist" -type f 2>/dev/null | head -1)

echo ""
print_status "Found files:"

if [ -n "$SERVICE_ACCOUNT_JSON" ]; then
    print_success "✓ Service Account JSON: $(basename "$SERVICE_ACCOUNT_JSON")"
else
    print_warning "✗ Service Account JSON not found"
fi

if [ -n "$GOOGLE_SERVICES_JSON" ]; then
    print_success "✓ Android config: google-services.json"
else
    print_warning "✗ Android config not found"
fi

if [ -n "$GOOGLE_SERVICE_PLIST" ]; then
    print_success "✓ iOS config: GoogleService-Info.plist"
else
    print_warning "✗ iOS config not found"
fi

echo ""

# Create config directories if they don't exist
print_status "Creating config directories..."
mkdir -p "$PROJECT_ROOT/backend/config"
mkdir -p "$PROJECT_ROOT/src/config"

# Move service account JSON
if [ -n "$SERVICE_ACCOUNT_JSON" ]; then
    cp "$SERVICE_ACCOUNT_JSON" "$PROJECT_ROOT/backend/config/firebase-service-account.json"
    print_success "Copied service account JSON to backend/config/"
else
    print_error "Service account JSON not found. Please download it from Firebase Console."
    echo "  Go to: Firebase Console → Project Settings → Service accounts → Generate new private key"
fi

# Move mobile config files
if [ -n "$GOOGLE_SERVICES_JSON" ]; then
    cp "$GOOGLE_SERVICES_JSON" "$PROJECT_ROOT/src/config/"
    print_success "Copied google-services.json to src/config/"
fi

if [ -n "$GOOGLE_SERVICE_PLIST" ]; then
    cp "$GOOGLE_SERVICE_PLIST" "$PROJECT_ROOT/src/config/"
    print_success "Copied GoogleService-Info.plist to src/config/"
fi

echo ""

# Check if environment files exist
print_status "Checking environment configuration..."

if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
    print_warning "Backend .env file not found. Creating from template..."
    cp "$PROJECT_ROOT/backend/.env.example" "$PROJECT_ROOT/backend/.env"
    print_success "Created backend/.env from template"
else
    print_success "Backend .env file exists"
fi

if [ ! -f "$PROJECT_ROOT/src/.env" ]; then
    print_warning "Mobile .env file not found. Creating from template..."
    cp "$PROJECT_ROOT/src/.env.example" "$PROJECT_ROOT/src/.env"
    print_success "Created src/.env from template"
else
    print_success "Mobile .env file exists"
fi

echo ""

# Extract values from service account JSON if available
if [ -f "$PROJECT_ROOT/backend/config/firebase-service-account.json" ]; then
    print_status "Extracting values from service account JSON..."
    
    # Use jq if available, otherwise use basic text processing
    if command -v jq &> /dev/null; then
        PROJECT_ID=$(jq -r '.project_id' "$PROJECT_ROOT/backend/config/firebase-service-account.json")
        CLIENT_EMAIL=$(jq -r '.client_email' "$PROJECT_ROOT/backend/config/firebase-service-account.json")
        PRIVATE_KEY=$(jq -r '.private_key' "$PROJECT_ROOT/backend/config/firebase-service-account.json")
        
        print_success "Extracted service account details:"
        echo "  Project ID: $PROJECT_ID"
        echo "  Client Email: $CLIENT_EMAIL"
        echo "  Private Key: [REDACTED]"
        
        # Update backend .env file
        print_status "Updating backend/.env with extracted values..."
        
        # Use sed to update the .env file (macOS compatible)
        sed -i '' "s/FIREBASE_PROJECT_ID=.*/FIREBASE_PROJECT_ID=$PROJECT_ID/" "$PROJECT_ROOT/backend/.env"
        sed -i '' "s/FIREBASE_CLIENT_EMAIL=.*/FIREBASE_CLIENT_EMAIL=$CLIENT_EMAIL/" "$PROJECT_ROOT/backend/.env"
        
        # Handle private key (escape for sed)
        ESCAPED_PRIVATE_KEY=$(echo "$PRIVATE_KEY" | sed 's/"/\\"/g' | sed 's/\//\\\//g')
        sed -i '' "s|FIREBASE_PRIVATE_KEY=.*|FIREBASE_PRIVATE_KEY=\"$ESCAPED_PRIVATE_KEY\"|" "$PROJECT_ROOT/backend/.env"
        
        print_success "Updated backend/.env with service account values"
    else
        print_warning "jq not found. Please manually update backend/.env with values from the service account JSON"
    fi
fi

echo ""
print_status "Next steps:"
echo "1. Update src/.env with values from Firebase Console → Project Settings → General"
echo "2. Run 'make test' to verify the configuration"
echo "3. See tools/setup-firebase.md for detailed instructions"

echo ""
print_success "Firebase setup complete! 🚀"
