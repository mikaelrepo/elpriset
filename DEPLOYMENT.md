# Deployment Guide for Elpriser Sverige PWA on Ubuntu Linux

This guide covers the best practices for deploying the Elpriser Sverige PWA as a web service on Ubuntu Linux.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Option 1: Nginx + Systemd (Recommended)](#option-1-nginx--systemd-recommended)
3. [Option 2: Apache2](#option-2-apache2)
4. [Option 3: Docker](#option-3-docker)
5. [SSL/TLS Setup](#ssltls-setup)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### System Requirements
- Ubuntu 20.04 LTS or later
- Root or sudo access
- 512MB RAM minimum
- 1GB disk space

### Install Essential Tools
```bash
sudo apt update
sudo apt install -y curl wget git build-essential
```

---

## Option 1: Nginx + Systemd (Recommended)

This is the most lightweight and performant setup for serving a static PWA.

### Step 1: Install Nginx
```bash
sudo apt install -y nginx
```

### Step 2: Clone/Setup the Application
```bash
# Create application directory
sudo mkdir -p /var/www/elpriset
cd /var/www/elpriset

# Clone the repository (or copy files)
sudo git clone https://github.com/elpriset/elpriset.github.io.git .

# Set proper permissions
sudo chown -R www-data:www-data /var/www/elpriset
sudo chmod -R 755 /var/www/elpriset
```

### Step 3: Configure Nginx

Create `/etc/nginx/sites-available/elpriset`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name elpriset.example.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    root /var/www/elpriset;
    index index.html;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Service Worker - no cache
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # HTML files - no cache
    location ~* \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Manifest and other JSON files
    location ~* \.json$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Content-Type "application/json";
    }

    # SPA routing - serve index.html for all non-file requests
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # CORS headers for API calls
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, OPTIONS" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
    gzip_min_length 1000;

    # Logging
    access_log /var/log/nginx/elpriset_access.log;
    error_log /var/log/nginx/elpriset_error.log;
}
```

### Step 4: Enable the Site
```bash
sudo ln -s /etc/nginx/sites-available/elpriset /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

### Step 5: Create Systemd Service (Optional - for auto-restart)

Create `/etc/systemd/system/elpriset.service`:

```ini
[Unit]
Description=Elpriser Sverige PWA
Documentation=https://github.com/elpriset/elpriset.github.io
After=network.target nginx.service
Wants=nginx.service

[Service]
Type=oneshot
ExecStart=/bin/true
RemainAfterExit=yes
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable elpriset.service
sudo systemctl start elpriset.service
```

---

## Option 2: Apache2

Alternative setup using Apache2 with mod_rewrite.

### Step 1: Install Apache2
```bash
sudo apt install -y apache2
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod deflate
```

### Step 2: Setup Application
```bash
sudo mkdir -p /var/www/elpriset
cd /var/www/elpriset
sudo git clone https://github.com/elpriset/elpriset.github.io.git .
sudo chown -R www-data:www-data /var/www/elpriset
```

### Step 3: Configure Apache

Create `/etc/apache2/sites-available/elpriset.conf`:

```apache
<VirtualHost *:80>
    ServerName elpriset.example.com
    ServerAdmin admin@example.com
    DocumentRoot /var/www/elpriset

    <Directory /var/www/elpriset>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # SPA routing
        <IfModule mod_rewrite.c>
            RewriteEngine On
            RewriteBase /
            RewriteRule ^index\.html$ - [L]
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteRule . /index.html [L]
        </IfModule>
    </Directory>

    # Cache headers
    <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$">
        Header set Cache-Control "max-age=2592000, public"
    </FilesMatch>

    <FilesMatch "\.html$">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
    </FilesMatch>

    <FilesMatch "^sw\.js$">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
    </FilesMatch>

    # Compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
    </IfModule>

    # Security headers
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-Content-Type-Options "nosniff"
    Header set X-XSS-Protection "1; mode=block"

    ErrorLog ${APACHE_LOG_DIR}/elpriset_error.log
    CustomLog ${APACHE_LOG_DIR}/elpriset_access.log combined
</VirtualHost>
```

Enable and restart:
```bash
sudo a2ensite elpriset.conf
sudo apache2ctl configtest
sudo systemctl restart apache2
```

---

## Option 3: Docker

For containerized deployment.

### Step 1: Create Dockerfile

Create `Dockerfile` in the project root:

```dockerfile
FROM nginx:alpine

# Copy application files
COPY . /usr/share/nginx/html/

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1
```

### Step 2: Create nginx.conf for Docker

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # No cache for service worker and HTML
    location ~* (sw\.js|\.html)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
}
```

### Step 3: Build and Run

```bash
# Build image
docker build -t elpriset:latest .

# Run container
docker run -d \
    --name elpriset \
    -p 80:80 \
    --restart unless-stopped \
    elpriset:latest

# View logs
docker logs -f elpriset
```

### Step 4: Docker Compose (Optional)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  elpriset:
    build: .
    container_name: elpriset
    ports:
      - "80:80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
```

Run with:
```bash
docker-compose up -d
```

---

## SSL/TLS Setup

### Using Let's Encrypt with Certbot

#### For Nginx:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d elpriset.example.com
sudo systemctl restart nginx
```

#### For Apache:
```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d elpriset.example.com
sudo systemctl restart apache2
```

#### For Docker:
```bash
docker run -it --rm \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v /var/lib/letsencrypt:/var/lib/letsencrypt \
    -p 80:80 \
    certbot/certbot certonly --standalone -d elpriset.example.com
```

### Auto-Renewal
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Monitoring & Maintenance

### Check Service Status
```bash
# Nginx
sudo systemctl status nginx
sudo nginx -t

# Apache
sudo systemctl status apache2
sudo apache2ctl configtest

# Docker
docker ps
docker logs elpriset
```

### View Logs
```bash
# Nginx
sudo tail -f /var/log/nginx/elpriset_access.log
sudo tail -f /var/log/nginx/elpriset_error.log

# Apache
sudo tail -f /var/log/apache2/elpriset_access.log
sudo tail -f /var/log/apache2/elpriset_error.log
```

### Update Application
```bash
cd /var/www/elpriset
sudo git pull origin main
sudo systemctl restart nginx  # or apache2
```

### Monitor Disk Usage
```bash
du -sh /var/www/elpriset
df -h
```

### Setup Monitoring with Systemd
```bash
sudo journalctl -u nginx -f  # Follow nginx logs
sudo journalctl -u elpriset.service -f  # Follow service logs
```

---

## Performance Optimization

### Enable HTTP/2
```nginx
# In Nginx server block
listen 443 ssl http2;
```

### Add CDN (Optional)
Consider using Cloudflare or similar CDN for:
- Global content distribution
- DDoS protection
- Automatic HTTPS
- Image optimization

### Monitor Performance
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://elpriset.example.com

# Load testing
ab -n 1000 -c 10 https://elpriset.example.com/
```

---

## Troubleshooting

### Service Won't Start
```bash
# Check logs
sudo journalctl -xe

# Verify configuration
sudo nginx -t  # or apache2ctl configtest

# Check port availability
sudo netstat -tlnp | grep :80
```

### High Memory Usage
```bash
# Check process memory
ps aux | grep nginx
ps aux | grep apache2

# Restart service
sudo systemctl restart nginx
```

### Cache Issues
```bash
# Clear browser cache or use incognito mode
# Clear Nginx cache (if configured)
sudo rm -rf /var/cache/nginx/*

# Clear Service Worker cache (client-side)
# Users can clear in browser DevTools > Application > Cache Storage
```

---

## Security Best Practices

1. **Keep system updated**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Configure firewall**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **Use HTTPS only** (redirect HTTP to HTTPS)

4. **Set proper file permissions**
   ```bash
   sudo chmod 755 /var/www/elpriset
   sudo chmod 644 /var/www/elpriset/*
   ```

5. **Regular backups**
   ```bash
   sudo tar -czf elpriset-backup-$(date +%Y%m%d).tar.gz /var/www/elpriset
   ```

---

## Recommended Setup Summary

For most use cases on Ubuntu Linux:

1. **Use Nginx** (lightweight, fast, easy to configure)
2. **Use Let's Encrypt** for SSL/TLS
3. **Enable gzip compression**
4. **Set appropriate cache headers**
5. **Monitor with systemd journalctl**
6. **Use UFW firewall**
7. **Keep system updated**

This setup will provide excellent performance, security, and maintainability for the Elpriser Sverige PWA.