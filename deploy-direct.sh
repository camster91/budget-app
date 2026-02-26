#!/bin/bash

# Direct deployment script - copies local files to server and builds

set -e

echo "🚀 Starting direct deployment of Budget App..."
echo "📝 Using local files"

# Step 1: Create tarball of current directory
echo "📦 Creating tarball of current files..."
tar czf /tmp/budget-app-local.tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='*.tar.gz' \
  --exclude='.git' \
  .

# Step 2: Copy to server
echo "📤 Copying files to server..."
scp /tmp/budget-app-local.tar.gz root@187.77.26.99:/tmp/

# Step 3: Extract and build on server
echo "🔨 Building on server..."
ssh root@187.77.26.99 'cd /tmp && rm -rf budget-app-local && mkdir budget-app-local && tar xzf budget-app-local.tar.gz -C budget-app-local'

# Step 4: Get commit hash from local git
COMMIT_HASH=$(git log --oneline -1 | cut -d' ' -f1)
echo "📊 Using commit: $COMMIT_HASH"

# Step 5: Build Docker image on server
echo "🐳 Building Docker image on server..."
ssh root@187.77.26.99 'cd /tmp/budget-app-local && docker build \
  -t qg8c4ocgog8c0w4g4o4o40go:'"$COMMIT_HASH"' .'

# Step 6: Ensure application directory exists
ssh root@187.77.26.99 'mkdir -p /data/coolify/applications/qg8c4ocgog8c0w4g4o4o40go'

# Step 7: Create or update docker-compose.yaml
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

# Step 8: Create volume if needed
ssh root@187.77.26.99 'docker volume create budget-app-db 2>/dev/null || true'

# Step 9: Stop and recreate container
echo "🔄 Recreating container..."
ssh root@187.77.26.99 "cd /data/coolify/applications/qg8c4ocgog8c0w4g4o4o40go && docker compose down 2>/dev/null || true"
ssh root@187.77.26.99 "cd /data/coolify/applications/qg8c4ocgog8c0w4g4o4o40go && docker compose up -d --force-recreate"

# Step 10: Check status
echo "⏳ Waiting for container to start..."
sleep 15

echo "🔍 Checking container status..."
ssh root@187.77.26.99 "docker ps | grep qg8c4ocgog8c0w4g4o4o40go || echo 'Container not running'"

echo "📋 Checking logs..."
ssh root@187.77.26.99 "docker logs qg8c4ocgog8c0w4g4o4o40go-budget-app --tail 30 2>/dev/null || echo 'No logs available'"

# Cleanup
rm /tmp/budget-app-local.tar.gz

echo ""
echo "🎉 Direct deployment completed!"
echo "🌐 App should be available at: http://187.77.26.99:3000"
echo "📊 Check health endpoint: curl http://187.77.26.99:3000/api/health"