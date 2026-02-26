#!/bin/bash

# Simple Budget App Deployment Script for Coolify
# Doesn't require jq - uses grep and awk for parsing

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
echo "🔗 Git Repo: $GIT_REPO"
echo "🌿 Branch: $BRANCH"
echo "🔌 Port: $PORT"

# Function to extract UUID from JSON
extract_uuid() {
    echo "$1" | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4
}

extract_success() {
    echo "$1" | grep -o '"success":true' > /dev/null && echo "true" || echo "false"
}

# Step 1: Check if app already exists
echo "🔍 Checking if application already exists..."
APPS_RESPONSE=$(curl -s -H "$AUTH" "$API/applications")
EXISTING_APP=$(echo "$APPS_RESPONSE" | grep -o "\"name\":\"$APP_NAME\"[^}]*\"uuid\":\"[^\"]*\"" | grep -o '\"uuid\":\"[^\"]*\"' | cut -d'"' -f4 | head -1)

if [ -n "$EXISTING_APP" ]; then
    echo "📦 Found existing app with UUID: $EXISTING_APP"
    
    # Step 2: Restart existing app
    echo "🔄 Restarting existing application..."
    RESPONSE=$(curl -s -H "$AUTH" "$API/applications/$EXISTING_APP/restart")
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo "✅ Application restart triggered successfully!"
        
        # Try to extract deployment UUID
        DEPLOYMENT_UUID=$(echo "$RESPONSE" | grep -o '"deployment_uuid":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$DEPLOYMENT_UUID" ]; then
            echo "📊 Deployment UUID: $DEPLOYMENT_UUID"
        fi
        
        # Wait a bit
        echo "⏳ Waiting 10 seconds before checking deployment status..."
        sleep 10
        
        echo "📋 Deployment in progress. Check Coolify dashboard for logs."
        
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
    
    APP_UUID=$(extract_uuid "$RESPONSE")
    
    if [ -n "$APP_UUID" ]; then
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
        
        if echo "$DEPLOY_RESPONSE" | grep -q '"success":true'; then
            DEPLOYMENT_UUID=$(echo "$DEPLOY_RESPONSE" | grep -o '"deployment_uuid":"[^"]*"' | cut -d'"' -f4)
            echo "✅ Deployment triggered successfully!"
            
            if [ -n "$DEPLOYMENT_UUID" ]; then
                echo "📊 Deployment UUID: $DEPLOYMENT_UUID"
            fi
            
            # Wait
            echo "⏳ Waiting 15 seconds..."
            sleep 15
            
            echo "📋 Deployment started. Check Coolify dashboard for progress."
            
        else
            echo "⚠️ Deployment response didn't show success, but app was created."
            echo "Check Coolify dashboard manually."
        fi
        
    else
        echo "❌ Failed to create application"
        echo "Response: $RESPONSE"
        exit 1
    fi
fi

echo ""
echo "🎉 Deployment process initiated!"
echo "📊 Check Coolify dashboard: $COOLIFY_URL"
echo "🌐 Your app will be available at: https://$DOMAIN"
echo ""
echo "⚠️ Next steps:"
echo "1. Add DNS A record in Cloudflare: $DOMAIN → 187.77.26.99"
echo "2. Configure volume mount for SQLite database persistence in Coolify"
echo "3. Monitor deployment logs in Coolify dashboard"