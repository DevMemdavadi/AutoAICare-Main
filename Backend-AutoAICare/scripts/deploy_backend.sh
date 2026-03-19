#!/bin/bash
# Deploy backend to VPS
# Usage: ./deploy_backend.sh [vps_user@vps_host]

set -e

VPS_HOST=${1:-"root@77.37.44.137"}
BACKEND_DIR="/var/www/autoaicare/backend"

echo "🚀 Deploying Backend to VPS..."

# Sync code to VPS
echo "📤 Uploading code..."
cd "$(dirname "$0")/.."
rsync -avz --delete \
  --exclude='*.pyc' \
  --exclude='__pycache__' \
  --exclude='.git' \
  --exclude='venv' \
  --exclude='staticfiles' \
  --exclude='media' \
  --exclude='.env' \
  . "${VPS_HOST}:${BACKEND_DIR}/"

# Run deployment commands on VPS
echo "🔧 Running deployment commands on VPS..."
ssh "${VPS_HOST}" << 'EOF'
cd /var/www/autoaicare/backend
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Restart services
sudo systemctl restart gunicorn
sudo systemctl restart celery
sudo systemctl restart celery-beat

echo "✅ Backend deployed and services restarted!"
EOF

echo "✅ Backend deployment complete!"
