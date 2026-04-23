#!/bin/bash

# Budget App Deployment Script for Coolify
# Usage: ./deploy-to-coolify.sh [APP_NAME] [DOMAIN]

set -e

# Configuration
COOLIFY_URL="http://187.77.26.99:8000"
API_TOKEN="2|OyUt8feqoaBUVu1Uvvkq59CCqNjIdj4j2Vf0OXYf"
SERVER_UUID="b4gwko84g88ssgwk0wc8ks40"
PROJECT_UUID="gsgwk4c4wco8osw40cw8k48k"  # Same as Taekwondo Tournament project

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
echo "🔗 Git Repo: $GIT_REPO"
echo "🌿 Branch: $BRANCH"
echo "🔌 Port: $PORT"

# Step 1: Check if app already exists
echo "🔍 Checking if application already exists..."
EXISTING_APP=$(curl -s -H "$AUTH" "$API/applications" | jq -r ".data[] | select(.name == \"$APP_NAME\") | .uuid")

if [ -n "$EXISTING_APP" ]; then
    echo "📦 Found existing app with UUID: $EXISTING_APP"
    
    # Step 2: Restart existing app
    echo "🔄 Restarting existing application..."
    RESPONSE=$(curl -s -H "$AUTH" "$API/applications/$EXISTING_APP/restart")
    
    if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        echo "✅ Application restart triggered successfully!"
        
        # Get deployment status
        DEPLOYMENT_UUID=$(echo "$RESPONSE" | jq -r '.deployment_uuid')
        echo "📊 Deployment UUID: $DEPLOYMENT_UUID"
        
        # Wait a bit and check status
        echo "⏳ Waiting 10 seconds before checking deployment status..."
        sleep 10
        
        # Check deployment logs
        echo "📋 Checking deployment logs..."
        curl -s -H "$AUTH" "$API/applications/$EXISTING_APP/logs?deployment_uuid=$DEPLOYMENT_UUID" | jq -r '.data[] | .message'
        
    else
        echo "❌ Failed to restart application"
        echo "Response: $RESPONSE"
        exit 1
    fi
else
    echo "🆕 Creating new application..."
    
    # Step 2: Create new application
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
    
    if echo "$RESPONSE" | jq -e '.uuid' > /dev/null 2>&1; then
        APP_UUID=$(echo "$RESPONSE" | jq -r '.uuid')
        echo "✅ Application created successfully with UUID: $APP_UUID"
        
        # Step 3: Set environment variables
        echo "⚙️ Setting environment variables..."
        curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
            "$API/applications/$APP_UUID/envs" -d '{"key": "NODE_ENV", "value": "production"}' > /dev/null
        
        curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
            "$API/applications/$APP_UUID/envs" -d '{"key": "PORT", "value": "3000"}' > /dev/null
        
        curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
            "$API/applications/$APP_UUID/envs" -d '{"key": "DATABASE_URL", "value": "file:./prisma/dev.db"}' > /dev/null
        
        echo "✅ Environment variables set"
        
        # Step 4: Set custom domain
        echo "🌐 Setting custom domain '$DOMAIN'..."
        curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
            "$API/applications/$APP_UUID" -d '{"domains": "https://'"$DOMAIN"'"}' > /dev/null
        
        echo "✅ Domain configured"
        
        # Step 5: Trigger first deployment
        echo "🚀 Triggering initial deployment..."
        DEPLOY_RESPONSE=$(curl -s -H "$AUTH" "$API/applications/$APP_UUID/restart")
        
        if echo "$DEPLOY_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
            DEPLOYMENT_UUID=$(echo "$DEPLOY_RESPONSE" | jq -r '.deployment_uuid')
            echo "✅ Deployment triggered successfully!"
            echo "📊 Deployment UUID: $DEPLOYMENT_UUID"
            
            # Wait and check status
            echo "⏳ Waiting 15 seconds before checking deployment status..."
            sleep 15
            
            echo "📋 Checking deployment logs..."
            curl -s -H "$AUTH" "$API/applications/$APP_UUID/logs?deployment_uuid=$DEPLOYMENT_UUID" | jq -r '.data[] | .message' | tail -20
            
        else
            echo "❌ Failed to trigger deployment"
            echo "Response: $DEPLOY_RESPONSE"
        fi
        
    else
        echo "❌ Failed to create application"
        echo "Response: $RESPONSE"
        exit 1
    fi
fi

echo ""
echo "🎉 Deployment process completed!"
echo "📊 Check Coolify dashboard: $COOLIFY_URL"
echo "🌐 Your app will be available at: https://$DOMAIN"
echo ""
echo "⚠️ Don't forget to:"
echo "1. Add DNS A record in Cloudflare: $DOMAIN → 187.77.26.99"
echo "2. Configure volume mount for SQLite database persistence in Coolify"
echo "3. Monitor deployment logs in Coolify dashboard"