#!/bin/bash

# Linode Deployment Script for Latesh Analysis Bot
# This script automates the deployment process on a Linode server

set -e

echo "🚀 Starting Latesh Analysis Bot Deployment on Linode..."

# Color codes for output
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

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root. Consider using a non-root user for security."
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm
print_status "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
print_status "Installing PM2..."
sudo npm install -g pm2

# Install Docker (optional, for containerized deployment)
print_status "Installing Docker..."
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt-get update
sudo apt-get install -y docker-ce
sudo usermod -aG docker $USER

# Install Docker Compose
print_status "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone the repository (if not already cloned)
if [ ! -d "Latesh-Analysis" ]; then
    print_status "Cloning repository..."
    git clone https://github.com/roselain3/Latesh-Analysis.git
fi

cd Latesh-Analysis

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "⚙️ Creating environment file..."
    cat > .env << 'EOF'
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here

# Server Configuration
PORT=3000

# Webhook Configuration
DEFAULT_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# FRC API Configuration
TBA_API_KEY=your_the_blue_alliance_api_key_here

# Bot Configuration
PREFIX=!
BOT_ACTIVITY=AI-powered FRC Analysis
BOT_STATUS=online
EOF
    print_warning "Created .env file with placeholder values. Please edit it with your actual API keys!"
    print_warning "Edit the .env file: nano .env"
    read -p "Press Enter after you've updated the .env file with your actual API keys..."
fi

# Install dependencies
print_status "Installing dependencies..."
npm install

# Build application (if there's a build step)
if [ -f "package.json" ] && grep -q "build" package.json; then
    print_status "Building application..."
    npm run build
fi

# Start with PM2
print_status "Starting application with PM2..."
pm2 delete latesh-bot 2>/dev/null || true
pm2 start ecosystem.config.js

# Set up PM2 to start on boot
pm2 startup
pm2 save

# Set up log rotation
pm2 install pm2-logrotate

print_success "✅ Deployment completed successfully!"
print_status "📊 Check status with: pm2 status"
print_status "📋 View logs with: pm2 logs latesh-bot"
print_status "🔄 Restart with: pm2 restart latesh-bot"
print_status "🌐 Health check: http://$(curl -s ifconfig.me):3000/health"

echo ""
print_success "🎉 Latesh Analysis Bot is now running on your Linode server!"
print_warning "Remember to:"
print_warning "  1. Configure your firewall to allow port 3000"
print_warning "  2. Set up SSL/TLS if serving over HTTPS"
print_warning "  3. Monitor the application logs regularly"
print_warning "  4. Keep your API keys secure and rotate them regularly"
