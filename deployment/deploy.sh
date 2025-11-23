#!/bin/bash

# Elpriser Sverige PWA - Deployment Script for Ubuntu Linux
# This script automates the deployment process
# Usage: sudo bash deploy.sh [nginx|apache|docker]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${DOMAIN:-elpriset.example.com}"
APP_DIR="/var/www/elpriset"
REPO_URL="${REPO_URL:-https://github.com/elpriset/elpriset.github.io.git}"
DEPLOYMENT_METHOD="${1:-nginx}"

# Functions
print_header() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

check_ubuntu() {
    if ! grep -q "Ubuntu" /etc/os-release; then
        print_error "This script is designed for Ubuntu Linux"
        exit 1
    fi
}

update_system() {
    print_header "Updating System"
    apt update
    apt upgrade -y
    print_success "System updated"
}

install_nginx() {
    print_header "Installing Nginx"
    apt install -y nginx
    systemctl enable nginx
    print_success "Nginx installed and enabled"
}

install_apache() {
    print_header "Installing Apache2"
    apt install -y apache2
    a2enmod rewrite headers deflate
    systemctl enable apache2
    print_success "Apache2 installed and enabled"
}

install_docker() {
    print_header "Installing Docker"
    apt install -y docker.io docker-compose
    systemctl enable docker
    usermod -aG docker $SUDO_USER 2>/dev/null || true
    print_success "Docker installed and enabled"
}

setup_application() {
    print_header "Setting Up Application"
    
    # Create application directory
    mkdir -p "$APP_DIR"
    
    # Clone or update repository
    if [ -d "$APP_DIR/.git" ]; then
        print_info "Updating existing repository..."
        cd "$APP_DIR"
        git pull origin main
    else
        print_info "Cloning repository..."
        git clone "$REPO_URL" "$APP_DIR"
    fi
    
    # Set permissions
    chown -R www-data:www-data "$APP_DIR"
    chmod -R 755 "$APP_DIR"
    
    print_success "Application setup complete"
}

setup_nginx() {
    print_header "Configuring Nginx"
    
    # Copy nginx configuration
    cp deployment/nginx-elpriset.conf /etc/nginx/sites-available/elpriset
    
    # Enable site
    ln -sf /etc/nginx/sites-available/elpriset /etc/nginx/sites-enabled/elpriset
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    if nginx -t; then
        systemctl reload nginx
        print_success "Nginx configured and reloaded"
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
}

setup_apache() {
    print_header "Configuring Apache2"
    
    # Copy apache configuration
    cp deployment/apache-elpriset.conf /etc/apache2/sites-available/elpriset.conf
    
    # Enable site
    a2ensite elpriset.conf
    
    # Disable default site
    a2dissite 000-default.conf
    
    # Test configuration
    if apache2ctl configtest | grep -q "Syntax OK"; then
        systemctl reload apache2
        print_success "Apache2 configured and reloaded"
    else
        print_error "Apache2 configuration test failed"
        exit 1
    fi
}

setup_docker() {
    print_header "Setting Up Docker"
    
    cd "$APP_DIR"
    
    # Build Docker image
    print_info "Building Docker image..."
    docker build -t elpriset:latest -f deployment/Dockerfile .
    
    # Run container
    print_info "Starting Docker container..."
    docker-compose -f deployment/docker-compose.yml up -d
    
    print_success "Docker setup complete"
}

setup_ssl() {
    print_header "Setting Up SSL/TLS with Let's Encrypt"
    
    apt install -y certbot python3-certbot-nginx
    
    print_info "Requesting SSL certificate for $DOMAIN..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@"$DOMAIN"
    
    # Enable auto-renewal
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    print_success "SSL/TLS configured"
}

setup_firewall() {
    print_header "Configuring Firewall"
    
    apt install -y ufw
    
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    
    print_success "Firewall configured"
}

setup_monitoring() {
    print_header "Setting Up Monitoring"
    
    # Create systemd service
    cp deployment/systemd-elpriset.service /etc/systemd/system/elpriset.service
    systemctl daemon-reload
    systemctl enable elpriset.service
    
    print_success "Monitoring setup complete"
}

verify_deployment() {
    print_header "Verifying Deployment"
    
    print_info "Checking if application is accessible..."
    
    if [ "$DEPLOYMENT_METHOD" = "docker" ]; then
        if docker ps | grep -q elpriset; then
            print_success "Docker container is running"
        else
            print_error "Docker container is not running"
            exit 1
        fi
    else
        if systemctl is-active --quiet nginx || systemctl is-active --quiet apache2; then
            print_success "Web server is running"
        else
            print_error "Web server is not running"
            exit 1
        fi
    fi
    
    print_success "Deployment verification complete"
}

show_summary() {
    print_header "Deployment Summary"
    
    echo "Deployment Method: $DEPLOYMENT_METHOD"
    echo "Application Directory: $APP_DIR"
    echo "Domain: $DOMAIN"
    echo ""
    echo "Next steps:"
    echo "1. Update your domain DNS records to point to this server"
    echo "2. Run: sudo certbot --nginx -d $DOMAIN (for SSL setup)"
    echo "3. Check logs: sudo journalctl -u nginx -f (or apache2)"
    echo "4. Monitor: sudo systemctl status elpriset"
    echo ""
    echo "Useful commands:"
    echo "  View logs: sudo journalctl -u nginx -f"
    echo "  Restart service: sudo systemctl restart nginx"
    echo "  Check status: sudo systemctl status nginx"
    echo "  Update app: cd $APP_DIR && sudo git pull"
}

# Main execution
main() {
    print_header "Elpriser Sverige PWA - Deployment Script"
    
    check_root
    check_ubuntu
    
    print_info "Deployment method: $DEPLOYMENT_METHOD"
    print_info "Domain: $DOMAIN"
    
    # Update system
    update_system
    
    # Setup application
    setup_application
    
    # Setup based on deployment method
    case $DEPLOYMENT_METHOD in
        nginx)
            install_nginx
            setup_nginx
            setup_ssl
            setup_monitoring
            ;;
        apache)
            install_apache
            setup_apache
            setup_ssl
            setup_monitoring
            ;;
        docker)
            install_docker
            setup_docker
            ;;
        *)
            print_error "Unknown deployment method: $DEPLOYMENT_METHOD"
            echo "Usage: sudo bash deploy.sh [nginx|apache|docker]"
            exit 1
            ;;
    esac
    
    # Setup firewall
    setup_firewall
    
    # Verify deployment
    verify_deployment
    
    # Show summary
    show_summary
    
    print_success "Deployment completed successfully!"
}

# Run main function
main