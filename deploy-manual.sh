#!/bin/bash

# Manual deployment script for Budget App (following ECardApp pattern)
# This builds directly on the Coolify server

set -e

echo "🚀 Starting manual deployment of Budget App to Coolify..."
echo "📝 App UUID: qg8c4ocgog8c0w4g4o4o40go"
echo "🌐 Target: budget.ashbi.ca"

# Step 1: Clone latest code on server
echo "📥 Cloning latest code to server..."
ssh root@187.77.26.99 'cd /tmp && rm -rf budget-app && git clone --depth 1 https://github.com/camster91/budget-app.git'

# Step 2: Get current commit hash for tagging
COMMIT_HASH=$(ssh root@187.77.26.99 'cd /tmp/budget-app && git log --oneline -1 | cut -d" " -f1')
echo "📊 Using commit: $COMMIT_HASH"

# Step 3: Build Docker image with proper tags
echo "🔨 Building Docker image..."
ssh root@187.77.26.99 'cd /tmp/budget-app && docker build \
  -t qg8c4ocgog8c0w4g4o4o40go:'"$COMMIT_HASH"' .'

# Step 4: Check if docker-compose.yaml exists, create if needed
echo "📋 Checking docker-compose configuration..."
ssh root@187.77.26.99 'mkdir -p /data/coolify/applications/qg8c4ocgog8c0w4g4o4o40go'

# Create docker-compose.yaml if it doesn't exist
ssh root@187.77.26.99 'cat > /data/coolify/applications/qg8c4ocgog8c0w4g4o4o40go/docker-compose.yaml << EOF
version: "3.8"

services:
  app:
    image: qg8c4ocgog8c0w4g4o4o40go:'"$COMMIT_HASH"'
    container_name: qg8c4ocgog8c0w4g4o4o40go-budget-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=file:./prisma/dev.db
    volumes:
      - budget-app-db:/app/prisma
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  budget-app-db:
    external: true
EOF'

# Step 5: Create Docker volume for database if it doesn't exist
echo "💾 Creating database volume..."
ssh root@187.77.26.99 'docker volume create budget-app-db 2>/dev/null || true'

# Step 6: Update docker-compose to new image tag
echo "🔄 Updating docker-compose to new image tag..."
# Already done in step 4 with the new commit hash

# Step 7: Recreate container
echo "🐳 Recreating Docker container..."
ssh root@187.77.26.99 "cd /data/coolify/applications/qg8c4ocgog8c0w4g4o4o40go && docker compose down 2>/dev/null || true"
ssh root@187.77.26.99 "cd /data/coolify/applications/qg8c4ocgog8c0w4g4o4o40go && docker compose up -d --force-recreate"

# Step 8: Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 10

# Step 9: Check container status
echo "🔍 Checking container status..."
ssh root@187.77.26.99 "docker ps | grep qg8c4ocgog8c0w4g4o4o40go"

# Step 10: Check logs
echo "📋 Checking container logs..."
ssh root@187.77.26.99 "docker logs qg8c4ocgog8c0w4g4o4o40go-budget-app --tail 20 2>/dev/null || echo 'Container not found or no logs available'"

# Step 11: Clean old images (keep only current and one previous)
echo "🧹 Cleaning up old images..."
ssh root@187.77.26.99 "docker images qg8c4ocgog8c0w4g4o4o40go --format '{{.Tag}}' | grep -v '$COMMIT_HASH' | head -n -1 | xargs -I {} docker rmi qg8c4ocgog8c0w4g4o4o40go:{} 2>/dev/null || true"
ssh root@187.77.26.99 "docker image prune -f 2>/dev/null || true"

echo ""
echo "🎉 Manual deployment completed!"
echo "🌐 App should be available at: http://187.77.26.99:3000"
echo "📊 Check Coolify dashboard: http://187.77.26.99:8000"
echo ""
echo "⚠️ Next steps:"
echo "1. Add DNS A record in Cloudflare: budget.ashbi.ca → 187.77.26.99"
echo "2. Configure custom domain in Coolify for budget.ashbi.ca"
echo "3. Test the health endpoint: curl http://187.77.26.99:3000/api/health"