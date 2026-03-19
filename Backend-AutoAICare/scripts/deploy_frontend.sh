#!/bin/bash
# Deploy frontend to VPS
# Usage: ./deploy_frontend.sh [vps_user@vps_host]

set -e

VPS_HOST=${1:-"root@77.37.44.137"}
FRONTEND_DIR="/var/www/autoaicare/frontend/dist"

echo "🚀 Deploying Frontend to VPS..."

# Build frontend
echo "📦 Building frontend..."
cd "$(dirname "$0")/../../Frontend-AutoAICare"
npm run build

# Deploy to VPS
echo "📤 Uploading to VPS..."
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  dist/ "${VPS_HOST}:${FRONTEND_DIR}/"

echo "✅ Frontend deployed successfully!"
echo "🌐 Access at: https://autoaicare.com"
