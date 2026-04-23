# Budget App Deployment to Coolify

## Prerequisites
- Coolify instance running at `[Set COOLIFY_URL in environment variables]`
- API Token: `[Set COOLIFY_API_TOKEN in environment variables]`
- Server UUID: `[Set COOLIFY_SERVER_UUID in environment variables]`

## Deployment Options

### Option 1: Deploy via Coolify API (Recommended)
```bash
# Set variables
API="$COOLIFY_URL/api/v1"
AUTH="Authorization: Bearer $COOLIFY_API_TOKEN"
PROJECT_UUID="$COOLIFY_PROJECT_UUID"

# Create new application
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
  "$API/applications/public" -d '{
    "project_uuid": "'"$PROJECT_UUID"'",
    "environment_name": "production",
    "server_uuid": "'"$COOLIFY_SERVER_UUID"'",
    "git_repository": "https://github.com/camster91/budget-app",
    "git_branch": "main",
    "build_pack": "dockerfile",
    "ports_exposes": "3000",
    "name": "budget-app"
}'
```

### Option 2: Manual Docker Build & Deploy
```bash
# 1. Build Docker image locally or on server
docker build -t budget-app:latest .

# 2. Push to Docker registry (if using private registry)
# docker tag budget-app:latest your-registry/budget-app:latest
# docker push your-registry/budget-app:latest

# 3. Deploy via Coolify API with custom image
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
  "$API/applications" -d '{
    "project_uuid": "'"$PROJECT_UUID"'",
    "environment_name": "production",
    "server_uuid": "'"$COOLIFY_SERVER_UUID"'",
    "name": "budget-app",
    "build_pack": "dockerfile",
    "dockerfile_location": "/",
    "ports_exposes": "3000",
    "install_command": "",
    "build_command": "",
    "start_command": ""
}'
```

## Environment Variables
Set these in Coolify dashboard after creating the app:
- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL` — PostgreSQL connection string (set in Coolify environment)

## Database
The app uses PostgreSQL via Prisma ORM. Set the `DATABASE_URL` environment variable in Coolify to your PostgreSQL connection string.

## Domain Configuration
After deployment, set custom domain in Coolify:
```bash
curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
  "$API/applications/{APP_UUID}" -d '{"domains": "https://budget.ashbi.ca"}'
```

## DNS Configuration
Add A record in Cloudflare:
- `budget.ashbi.ca` → `[Your server IP]` (DNS only, not proxied)

## Health Check
The app has a built-in health check at `/api/health` (to be implemented).

## Troubleshooting
1. **Build fails**: Check Docker build logs in Coolify
2. **Database issues**: Ensure DATABASE_URL is correctly set for PostgreSQL
3. **Port conflicts**: Ensure port 3000 is available on the server
4. **Memory issues**: Node.js apps may need memory limits adjusted

## Quick Redeploy
```bash
# Get app UUID from Coolify dashboard first
APP_UUID="your-app-uuid"
curl -s -H "$AUTH" "$API/applications/$APP_UUID/restart"
```