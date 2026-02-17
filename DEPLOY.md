# Budget App Deployment to Coolify

## Prerequisites
- Coolify instance running at `http://187.77.26.99:8000`
- API Token: `2|OyUt8feqoaBUVu1Uvvkq59CCqNjIdj4j2Vf0OXYf`
- Server UUID: `b4gwko84g88ssgwk0wc8ks40`

## Deployment Options

### Option 1: Deploy via Coolify API (Recommended)
```bash
# Set variables
API="http://187.77.26.99:8000/api/v1"
AUTH="Authorization: Bearer 2|OyUt8feqoaBUVu1Uvvkq59CCqNjIdj4j2Vf0OXYf"
PROJECT_UUID="gsgwk4c4wco8osw40cw8k48k"  # Same as Taekwondo Tournament project

# Create new application
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
  "$API/applications/public" -d '{
    "project_uuid": "'"$PROJECT_UUID"'",
    "environment_name": "production",
    "server_uuid": "b4gwko84g88ssgwk0wc8ks40",
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
    "server_uuid": "b4gwko84g88ssgwk0wc8ks40",
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
- `DATABASE_URL="file:./prisma/dev.db"` (SQLite file in container)

## Database Persistence
For production, consider:
1. **SQLite with volume mount**: Mount a volume to `/app/prisma` to persist the database
2. **PostgreSQL**: Update Prisma schema to use PostgreSQL and set connection string

### SQLite Volume Mount (in Coolify)
Add volume mount in Coolify app settings:
- Source: `budget-app-db` (Docker volume)
- Destination: `/app/prisma`

## Domain Configuration
After deployment, set custom domain in Coolify:
```bash
curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
  "$API/applications/{APP_UUID}" -d '{"domains": "https://budget.ashbi.ca"}'
```

## DNS Configuration
Add A record in Cloudflare:
- `budget.ashbi.ca` → `187.77.26.99` (DNS only, not proxied)

## Health Check
The app has a built-in health check at `/api/health` (to be implemented).

## Troubleshooting
1. **Build fails**: Check Docker build logs in Coolify
2. **Database issues**: Ensure volume is mounted for SQLite persistence
3. **Port conflicts**: Ensure port 3000 is available on the server
4. **Memory issues**: Node.js apps may need memory limits adjusted

## Quick Redeploy
```bash
# Get app UUID from Coolify dashboard first
APP_UUID="your-app-uuid"
curl -s -H "$AUTH" "$API/applications/$APP_UUID/restart"
```