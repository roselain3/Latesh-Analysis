#!/bin/bash

# Generic Deployment Script for Latesh Analysis Bot
# This script can be used on various Linux distributions

set -e

echo "🚀 Deploying Latesh Analysis Bot..."

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if .env file exists
if [ ! -f "../.env" ]; then
    print_warning ".env file not found. Please create it from .env.example"
    print_warning "cp ../.env.example ../.env"
    print_warning "Then edit ../.env with your actual API keys"
    exit 1
fi

# Install dependencies
print_status "Installing dependencies..."
cd ..
npm install

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    npm install -g pm2
fi

# Start the application
print_status "Starting application with PM2..."
cd deploy
pm2 delete latesh-bot 2>/dev/null || true
pm2 start ecosystem.config.js

print_success "✅ Deployment completed!"
print_status "Check status: pm2 status"
print_status "View logs: pm2 logs latesh-bot"
