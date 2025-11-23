# Elpriser Sverige PWA - Deployment Configuration

This directory contains all necessary files and documentation for deploying the Elpriser Sverige PWA on Ubuntu Linux.

## 📋 Contents

### Documentation
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Comprehensive deployment guide with all options
- **[QUICK_START.md](QUICK_START.md)** - Quick reference guide for rapid deployment

### Configuration Files

#### Nginx
- **[nginx-elpriset.conf](nginx-elpriset.conf)** - Production Nginx configuration with SSL/TLS
- **[nginx-docker.conf](nginx-docker.conf)** - Simplified Nginx config for Docker containers

#### Apache2
- **apache-elpriset.conf** - Apache2 configuration (referenced in DEPLOYMENT.md)

#### Systemd
- **[systemd-elpriset.service](systemd-elpriset.service)** - Systemd service file for process management

#### Docker
- **[Dockerfile](Dockerfile)** - Docker image definition
- **[docker-compose.yml](docker-compose.yml)** - Docker Compose orchestration

### Scripts
- **[deploy.sh](deploy.sh)** - Automated deployment script (chmod +x before use)

---

## 🚀 Quick Start

### Fastest Way (Automated)
```bash
chmod +x deployment/deploy.sh
sudo DOMAIN=elpriset.example.com bash deployment/deploy.sh nginx
```

### Manual Nginx Setup
```bash
sudo apt install -y nginx
sudo cp deployment/nginx-elpriset.conf /etc/nginx/sites-available/elpriset
sudo ln -s /etc/nginx/sites-available/elpriset /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Docker Setup
```bash
sudo docker-compose -f deployment/docker-compose.yml up -d
```

---

## 📊 Deployment Options Comparison

| Feature | Nginx | Apache | Docker |
|---------|-------|--------|--------|
| **Setup Time** | 5 min | 5 min | 3 min |
| **Memory Usage** | ~10MB | ~20MB | ~50MB |
| **Performance** | Excellent | Good | Good |
| **Ease of Use** | Easy | Medium | Easy |
| **SSL/TLS** | Certbot | Certbot | Manual |
| **Scalability** | Good | Good | Excellent |
| **Recommended** | ✅ Yes | ⚠️ Alternative | ✅ For containers |

---

## 🔧 Configuration Details

### Nginx Configuration Features
- ✅ HTTP/2 support
- ✅ Gzip compression
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ CORS headers
- ✅ Proper cache headers for PWA
- ✅ SPA routing (try_files)
- ✅ SSL/TLS ready
- ✅ Performance optimized

### Service Worker Cache Strategy
- **Static assets** (JS, CSS, images): 30-day cache
- **Service Worker** (sw.js): No cache
- **HTML files**: No cache
- **JSON files**: No cache

### Security Features
- Content Security Policy (CSP)
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing protection)
- X-XSS-Protection (XSS protection)
- Referrer-Policy
- Permissions-Policy
- HSTS (HTTP Strict Transport Security)

---

## 📝 File Descriptions

### nginx-elpriset.conf
**Purpose**: Production-ready Nginx configuration for Ubuntu servers

**Key Features**:
- HTTP to HTTPS redirect
- SSL/TLS configuration
- Gzip compression
- Security headers
- CORS support
- SPA routing
- Proper cache headers

**Usage**:
```bash
sudo cp nginx-elpriset.conf /etc/nginx/sites-available/elpriset
sudo ln -s /etc/nginx/sites-available/elpriset /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Customization**:
- Replace `elpriset.example.com` with your domain
- Update SSL certificate paths if using different provider
- Adjust CSP headers if needed

---

### nginx-docker.conf
**Purpose**: Simplified Nginx configuration for Docker containers

**Key Features**:
- Optimized for containerized deployment
- Logging to stdout/stderr
- No SSL/TLS (use reverse proxy)
- Gzip compression
- Security headers
- SPA routing

**Usage**: Automatically used by Dockerfile

---

### Dockerfile
**Purpose**: Build Docker image for Elpriser PWA

**Key Features**:
- Alpine Linux base (lightweight)
- Nginx web server
- Health checks
- Proper permissions
- Minimal image size

**Build & Run**:
```bash
docker build -t elpriset:latest .
docker run -d -p 80:80 --name elpriset elpriset:latest
```

---

### docker-compose.yml
**Purpose**: Orchestrate Docker deployment

**Key Features**:
- Service definition
- Port mapping
- Resource limits
- Health checks
- Logging configuration
- Restart policy
- Network configuration

**Usage**:
```bash
docker-compose up -d      # Start
docker-compose down       # Stop
docker-compose logs -f    # View logs
docker-compose ps         # Status
```

---

### systemd-elpriset.service
**Purpose**: Systemd service file for process management

**Key Features**:
- Auto-start on boot
- Restart on failure
- Security settings
- Logging to journalctl
- User/group configuration

**Installation**:
```bash
sudo cp systemd-elpriset.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable elpriset.service
sudo systemctl start elpriset.service
```

---

### deploy.sh
**Purpose**: Automated deployment script

**Supported Methods**:
- `nginx` - Nginx with Let's Encrypt SSL
- `apache` - Apache2 with Let's Encrypt SSL
- `docker` - Docker with Docker Compose

**Features**:
- System update
- Package installation
- Application setup
- Web server configuration
- SSL/TLS setup
- Firewall configuration
- Deployment verification

**Usage**:
```bash
chmod +x deploy.sh
sudo DOMAIN=elpriset.example.com bash deploy.sh nginx
```

**Environment Variables**:
- `DOMAIN` - Your domain name (default: elpriset.example.com)
- `REPO_URL` - Git repository URL (default: official repo)

---

## 🔐 Security Considerations

### SSL/TLS
- Use Let's Encrypt for free certificates
- Auto-renewal enabled by default
- HSTS headers configured
- TLS 1.2+ only

### Firewall
- UFW configured to allow only necessary ports
- SSH (22), HTTP (80), HTTPS (443)
- All other ports blocked by default

### File Permissions
- Application files: 755 (readable by all)
- Web server user: www-data
- Proper ownership set

### Headers
- CSP (Content Security Policy)
- X-Frame-Options (SAMEORIGIN)
- X-Content-Type-Options (nosniff)
- X-XSS-Protection (1; mode=block)

---

## 📊 Performance Optimization

### Caching
- Static assets cached for 30 days
- Service Worker never cached
- HTML files never cached
- Proper ETag handling

### Compression
- Gzip enabled for text/JSON
- Compression level: 6 (balanced)
- Supported types: CSS, JS, JSON, fonts, SVG

### HTTP/2
- Enabled in Nginx
- Multiplexing support
- Server push capable

### CDN (Optional)
- Consider Cloudflare for global distribution
- Automatic image optimization
- DDoS protection

---

## 🛠️ Maintenance

### Regular Tasks
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Check certificate expiration
sudo certbot certificates

# View logs
sudo journalctl -u nginx -f

# Monitor resources
htop
```

### Backup
```bash
# Backup application
sudo tar -czf elpriset-backup-$(date +%Y%m%d).tar.gz /var/www/elpriset

# Backup configuration
sudo tar -czf nginx-config-$(date +%Y%m%d).tar.gz /etc/nginx/
```

### Updates
```bash
# Update application
cd /var/www/elpriset
sudo git pull origin main
sudo systemctl reload nginx
```

---

## 🐛 Troubleshooting

### Service Won't Start
```bash
# Check logs
sudo journalctl -xe

# Test configuration
sudo nginx -t

# Check port availability
sudo netstat -tlnp | grep :80
```

### High Memory Usage
```bash
# Check processes
ps aux | grep nginx

# Restart service
sudo systemctl restart nginx
```

### SSL Certificate Issues
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --force-renewal
```

### Cache Issues
```bash
# Clear browser cache (client-side)
# Or use incognito mode

# Verify cache headers
curl -I https://elpriset.example.com/sw.js
```

---

## 📚 Additional Resources

- **Nginx Documentation**: https://nginx.org/en/docs/
- **Apache Documentation**: https://httpd.apache.org/docs/
- **Docker Documentation**: https://docs.docker.com/
- **Let's Encrypt**: https://letsencrypt.org/
- **Ubuntu Server Guide**: https://ubuntu.com/server/docs
- **PWA Documentation**: https://web.dev/progressive-web-apps/

---

## 📞 Support

For issues or questions:
1. Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed information
2. Review [QUICK_START.md](QUICK_START.md) for common tasks
3. Check logs: `sudo journalctl -u nginx -f`
4. Visit GitHub: https://github.com/elpriset/elpriset.github.io

---

## 📄 License

All deployment files are licensed under Apache License 2.0. See [LICENSE](../LICENSE) for details.

---

## ✅ Deployment Checklist

- [ ] Ubuntu 20.04 LTS or later installed
- [ ] Domain name configured (or use IP address)
- [ ] SSH access to server
- [ ] Choose deployment method (Nginx/Apache/Docker)
- [ ] Run deployment script or follow manual steps
- [ ] Update DNS records
- [ ] Setup SSL/TLS certificate
- [ ] Test application at domain
- [ ] Configure firewall
- [ ] Setup monitoring/backups
- [ ] Document configuration
- [ ] Train team on maintenance

---

**Last Updated**: October 31, 2025
**Version**: 1.0.0