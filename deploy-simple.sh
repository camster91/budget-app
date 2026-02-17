#!/bin/bash

# Simple Budget App Deployment Script for Coolify
# Doesn't require jq, uses basic curl commands

set -e

# Configuration
COOLIFY_URL="http://187.77.26.99:8000"
API_TOKEN="2|OyUt8feqoaBUVu1Uvvkq59CCqNjIdj4j2Vf0OXYf"
SERVER_UUID="b4gwko84g88ssgwk0wc8ks40"
PROJECT_UUID="gsgwk4c4wco8osw40cw8k48k"

# Default values
APP_NAME="${1:-budget-app}"
DOMAIN="${2:-budget.ashbi.ca}"
GIT_REPO="https://github.com/camster91/budget-app"
BRANCH="main"
PORT="3000"

# API endpoints
API="$COOLIFY_URL/api/v1"
AUTH="Authorization: Bearer $API_TOKEN"

echo "🚀 Deploying $APP_NAME to Coolify..."
echo "📝 App Name: $APP_NAME"
echo "🌐 Domain: $DOMAIN"

# Create new application
echo "📝 Creating new application '$APP_NAME'..."
RESPONSE=$(curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
    "$API/applications/public" -d '{
        "project_uuid": "'"$PROJECT_UUID"'",
        "environment_name": "production",
        "server_uuid": "'"$SERVER_UUID"'",
        "git_repository": "'"$GIT_REPO"'",
        "git_branch": "'"$BRANCH"'",
        "build_pack": "dockerfile",
        "ports_exposes": "'"$PORT"'",
        "name": "'"$APP_NAME"'"
    }')

# Check if response contains UUID (basic check)
if [[ "$RESPONSE" == *"uuid"* ]]; then
    echo "✅ Application created successfully!"
    
    # Extract UUID (simple grep approach)
    APP_UUID=$(echo "$RESPONSE" | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4)
    echo "📦 App UUID: $APP_UUID"
    
    # Set environment variables
    echo "⚙️ Setting environment variables..."
    curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
        "$API/applications/$APP_UUID/envs" -d '{"key": "NODE_ENV", "value": "production"}'
    
    curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
        "$API/applications/$APP_UUID/envs" -d '{"key": "PORT", "value": "3000"}'
    
    curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
        "$API/applications/$APP_UUID/envs" -d '{"key": "DATABASE_URL", "value": "file:./prisma/dev.db"}'
    
    echo "✅ Environment variables set"
    
    # Set custom domain
    echo "🌐 Setting custom domain '$DOMAIN'..."
    curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
        "$API/applications/$APP_UUID" -d '{"domains": "https://'"$DOMAIN"'"}'
    
    echo "✅ Domain configured"
    
    # Trigger deployment
    echo "🚀 Triggering deployment..."
    DEPLOY_RESPONSE=$(curl -s -H "$AUTH" "$API/applications/$APP_UUID/restart")
    
    if [[ "$DEPLOY_RESPONSE" == *"success"* ]] || [[ "$DEPLOY_RESPONSE" == *"deployment_uuid"* ]]; then
        echo "✅ Deployment triggered successfully!"
        
        # Extract deployment UUID
        DEPLOYMENT_UUID=$(echo "$DEPLOY_RESPONSE" | grep -o '"deployment_uuid":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$DEPLOYMENT_UUID" ]; then
            echo "📊 Deployment UUID: $DEPLOYMENT_UUID"
        fi
        
    else
        echo "⚠️ Deployment response: $DEPLOY_RESPONSE"
    fi
    
else
    echo "❌ Failed to create application"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo "🎉 Deployment process initiated!"
echo "📊 Check Coolify dashboard: $COOLIFY_URL"
echo "🌐 Your app will be available at: https://$DOMAIN"
echo ""
echo "⚠️ Important next steps:"
echo "1. Add DNS A record in Cloudflare: $DOMAIN → 187.77.26.99"
echo "2. In Coolify dashboard, go to app settings → Resources"
echo "   - Add volume mount: Source=budget-app-db, Destination=/app/prisma"
echo "3. Monitor deployment in Coolify dashboard"
echo "4. Check logs if app doesn't start properly"