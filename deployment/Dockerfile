# Dockerfile for Elpriser Sverige PWA
# Build: docker build -t elpriset:latest .
# Run: docker run -d -p 80:80 --name elpriset elpriset:latest

FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy application files to nginx html directory
COPY . /usr/share/nginx/html/

# Copy custom nginx configuration
COPY deployment/nginx-docker.conf /etc/nginx/conf.d/default.conf

# Create nginx cache directory
RUN mkdir -p /var/cache/nginx && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check - verify the application is responding
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]