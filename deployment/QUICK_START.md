# Quick Start Guide - Elpriser Sverige PWA Deployment

## Prerequisites
- Ubuntu 20.04 LTS or later
- Root or sudo access
- Domain name (optional, can use IP address)

## Option 1: Automated Deployment (Recommended)

### Using the deployment script:

```bash
# Clone the repository
git clone https://github.com/elpriset/elpriset.github.io.git
cd elpriset.github.io

# Make script executable
chmod +x deployment/deploy.sh

# Run deployment (choose one)
sudo DOMAIN=elpriset.example.com bash deployment/deploy.sh nginx
# or
sudo DOMAIN=elpriset.example.com bash deployment/deploy.sh apache
# or
sudo DOMAIN=elpriset.example.com bash deployment/deploy.sh docker
```

The script will:
- Update system packages
- Install and configure the web server
- Setup SSL/TLS with Let's Encrypt
- Configure firewall
- Verify the deployment

---

## Option 2: Manual Nginx Setup (5 minutes)

### Step 1: Install Nginx
```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
```

### Step 2: Setup Application
```bash
sudo mkdir -p /var/www/elpriset
cd /var/www/elpriset
sudo git clone https://github.com/elpriset/elpriset.github.io.git .
sudo chown -R www-data:www-data /var/www/elpriset
```

### Step 3: Configure Nginx
```bash
# Copy configuration
sudo cp deployment/nginx-elpriset.conf /etc/nginx/sites-available/elpriset

# Enable site
sudo ln -s /etc/nginx/sites-available/elpriset /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Setup SSL (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d elpriset.example.com
```

### Step 5: Verify
```bash
# Check if running
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/elpriset_access.log
```

---

## Option 3: Docker Setup (3 minutes)

### Step 1: Install Docker
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
```

### Step 2: Deploy with Docker Compose
```bash
cd /path/to/elpriset
sudo docker-compose -f deployment/docker-compose.yml up -d
```

### Step 3: Verify
```bash
# Check container status
sudo docker ps

# View logs
sudo docker logs -f elpriset

# Test application
curl http://localhost
```

---

## Common Commands

### Check Service Status
```bash
# Nginx
sudo systemctl status nginx
sudo nginx -t

# Apache
sudo systemctl status apache2
sudo apache2ctl configtest

# Docker
sudo docker ps
sudo docker logs elpriset
```

### View Logs
```bash
# Nginx
sudo tail -f /var/log/nginx/elpriset_access.log
sudo tail -f /var/log/nginx/elpriset_error.log

# Apache
sudo tail -f /var/log/apache2/elpriset_access.log

# Docker
sudo docker logs -f elpriset

# Systemd
sudo journalctl -u nginx -f
sudo journalctl -u elpriset -f
```

### Restart Services
```bash
# Nginx
sudo systemctl restart nginx

# Apache
sudo systemctl restart apache2

# Docker
sudo docker-compose -f deployment/docker-compose.yml restart

# Systemd
sudo systemctl restart elpriset
```

### Update Application
```bash
cd /var/www/elpriset
sudo git pull origin main
sudo systemctl reload nginx  # or apache2
```

### Monitor Performance
```bash
# Check disk usage
du -sh /var/www/elpriset
df -h

# Check memory usage
free -h

# Check running processes
ps aux | grep nginx
ps aux | grep apache2
```

---

## Firewall Setup

### UFW (Ubuntu Firewall)
```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

---

## SSL/TLS Certificate Management

### Renew Certificate Manually
```bash
sudo certbot renew --dry-run  # Test renewal
sudo certbot renew             # Actual renewal
```

### Auto-Renewal (automatic)
```bash
# Check if enabled
sudo systemctl status certbot.timer

# Enable if not running
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### View Certificate Info
```bash
sudo certbot certificates
```

---

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 80
sudo lsof -i :80
sudo netstat -tlnp | grep :80

# Kill process if needed
sudo kill -9 <PID>
```

### Nginx Won't Start
```bash
# Test configuration
sudo nginx -t

# Check logs
sudo journalctl -u nginx -n 50

# Check for syntax errors
sudo cat /etc/nginx/sites-available/elpriset
```

### High Memory Usage
```bash
# Check memory
free -h

# Restart service
sudo systemctl restart nginx

# Check process memory
ps aux | grep nginx
```

### Cache Issues
```bash
# Clear browser cache (client-side)
# Or use incognito/private mode

# Clear Service Worker cache (client-side)
# DevTools > Application > Cache Storage > Delete

# Verify cache headers
curl -I https://elpriset.example.com/sw.js
```

### SSL Certificate Issues
```bash
# Check certificate validity
sudo certbot certificates

# Renew certificate
sudo certbot renew --force-renewal

# Check certificate expiration
echo | openssl s_client -servername elpriset.example.com -connect elpriset.example.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Performance Optimization

### Enable Gzip Compression
Already configured in provided nginx.conf

### Enable HTTP/2
Already configured in provided nginx.conf

### Add CDN (Optional)
Consider using Cloudflare for:
- Global content distribution
- DDoS protection
- Automatic HTTPS
- Image optimization

### Monitor Performance
```bash
# Response time test
curl -w "@curl-format.txt" -o /dev/null -s https://elpriset.example.com

# Load testing
ab -n 1000 -c 10 https://elpriset.example.com/
```

---

## Backup & Recovery

### Backup Application
```bash
# Create backup
sudo tar -czf elpriset-backup-$(date +%Y%m%d).tar.gz /var/www/elpriset

# List backups
ls -lh elpriset-backup-*.tar.gz

# Restore from backup
sudo tar -xzf elpriset-backup-20251031.tar.gz -C /
```

### Backup Configuration
```bash
# Nginx
sudo tar -czf nginx-config-$(date +%Y%m%d).tar.gz /etc/nginx/

# Apache
sudo tar -czf apache-config-$(date +%Y%m%d).tar.gz /etc/apache2/

# SSL Certificates
sudo tar -czf ssl-certs-$(date +%Y%m%d).tar.gz /etc/letsencrypt/
```

---

## Security Best Practices

1. **Keep system updated**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Use strong firewall rules**
   ```bash
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   ```

3. **Enable HTTPS only**
   - Redirect HTTP to HTTPS
   - Use HSTS headers

4. **Set proper file permissions**
   ```bash
   sudo chmod 755 /var/www/elpriset
   sudo chmod 644 /var/www/elpriset/*
   ```

5. **Regular backups**
   ```bash
   # Automated daily backup
   sudo crontab -e
   # Add: 0 2 * * * tar -czf /backups/elpriset-$(date +\%Y\%m\%d).tar.gz /var/www/elpriset
   ```

6. **Monitor logs**
   ```bash
   sudo tail -f /var/log/nginx/elpriset_error.log
   ```

---

## Support & Resources

- **GitHub**: https://github.com/elpriset/elpriset.github.io
- **Nginx Docs**: https://nginx.org/en/docs/
- **Apache Docs**: https://httpd.apache.org/docs/
- **Docker Docs**: https://docs.docker.com/
- **Let's Encrypt**: https://letsencrypt.org/
- **Ubuntu Docs**: https://ubuntu.com/server/docs

---

## Next Steps

1. Update DNS records to point to your server
2. Test the application at your domain
3. Monitor logs for any issues
4. Setup automated backups
5. Configure monitoring/alerting (optional)

For detailed information, see [DEPLOYMENT.md](DEPLOYMENT.md)