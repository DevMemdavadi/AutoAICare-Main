#!/bin/bash
# Migration script: Individual configs → Wildcard config
# Run this on your VPS: ssh deploy@77.37.44.137

set -e

echo "🔄 Migrating to Wildcard Nginx Configuration"
echo "=============================================="
echo ""

# Backup existing configs
echo "📦 Step 1: Backing up existing configs..."
sudo mkdir -p /etc/nginx/backups/$(date +%Y%m%d)
sudo cp -r /etc/nginx/sites-available /etc/nginx/backups/$(date +%Y%m%d)/
sudo cp -r /etc/nginx/sites-enabled /etc/nginx/backups/$(date +%Y%m%d)/
echo "✅ Backup created at /etc/nginx/backups/$(date +%Y%m%d)/"
echo ""

# Create new wildcard config
echo "📝 Step 2: Creating wildcard configuration..."
sudo tee /etc/nginx/sites-available/autoaicare.conf > /dev/null << 'EOF'
# AutoAICare Multi-Tenant Wildcard Configuration
# Handles ALL subdomains automatically: *.autoaicare.com

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name *.autoaicare.com autoaicare.com;
    
    return 301 https://$host$request_uri;
}

# Main HTTPS server - handles ALL subdomains
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    # Wildcard server name - matches ALL subdomains
    server_name *.autoaicare.com autoaicare.com;

    # SSL Configuration (wildcard certificate)
    ssl_certificate /etc/letsencrypt/live/autoaicare.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/autoaicare.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Client max body size
    client_max_body_size 100M;

    # Logging
    access_log /var/log/nginx/autoaicare_access.log;
    error_log /var/log/nginx/autoaicare_error.log;

    # API endpoints - proxy to Django backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Origin $http_origin;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_buffering off;
    }

    # Django admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files (Django)
    location /static/ {
        alias /var/www/autoaicare/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        
        gzip on;
        gzip_types text/css application/javascript application/json image/svg+xml;
        gzip_vary on;
    }

    # Media files (Django)
    location /media/ {
        alias /var/www/autoaicare/backend/media/;
        expires 7d;
        add_header Cache-Control "public";
        
        location ~ \.(php|py|pl|sh)$ {
            deny all;
        }
    }

    # WebSocket endpoint
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Root location - serve React frontend
    location / {
        root /var/www/autoaicare/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # No cache for HTML
        location ~* \.html$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
        
        # Cache assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Block hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

echo "✅ Wildcard config created"
echo ""

# Test the new configuration
echo "🧪 Step 3: Testing new configuration..."
sudo nginx -t
echo ""

# Disable old individual configs
echo "🔧 Step 4: Disabling old individual configs..."
sudo rm -f /etc/nginx/sites-enabled/k3car.autoaicare.com
sudo rm -f /etc/nginx/sites-enabled/api.k3car.autoaicare.com
# Add more if you have other autoaicare.com configs
echo "✅ Old configs disabled"
echo ""

# Enable new wildcard config
echo "🔧 Step 5: Enabling wildcard config..."
sudo ln -sf /etc/nginx/sites-available/autoaicare.conf /etc/nginx/sites-enabled/
echo "✅ Wildcard config enabled"
echo ""

# Final test
echo "🧪 Step 6: Final configuration test..."
sudo nginx -t
echo ""

# Reload Nginx
echo "🔄 Step 7: Reloading Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx reloaded"
echo ""

echo "=============================================="
echo "✅ Migration Complete!"
echo "=============================================="
echo ""
echo "Your Nginx is now configured with wildcard support."
echo "All subdomains (*.autoaicare.com) will work automatically."
echo ""
echo "Current tenants still working:"
echo "  - https://k3car.autoaicare.com"
echo "  - https://testclient.autoaicare.com"
echo ""
echo "New tenants will work immediately without Nginx reload!"
echo ""
echo "Backups stored at: /etc/nginx/backups/$(date +%Y%m%d)/"
