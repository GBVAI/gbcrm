# Railway Deployment Guide for Twenty CRM

## Project Configuration

**Railway Project:** twenty-crm-fork
**Project URL:** https://railway.com/project/e39359c5-d4ed-4c4a-a5e8-36dec6e79799

### Services Created

1. **Postgres** - Database service (automatically configured)
2. **Redis** - Cache service (automatically configured)
3. **twenty-server** - Main application service (server + frontend)
   - Domain: https://twenty-server-production-33ed.up.railway.app
4. **twenty-worker** - Background worker service
   - Domain: https://twenty-worker-production-7233.up.railway.app

## Next Steps to Complete Deployment

Since the CLI upload timed out due to repo size (295MB), complete the deployment via Railway Dashboard:

### 1. Connect Services to GitHub

For each service (twenty-server and twenty-worker):

1. Go to https://railway.com/project/e39359c5-d4ed-4c4a-a5e8-36dec6e79799
2. Click on the service (twenty-server or twenty-worker)
3. Go to **Settings** → **Source**
4. Click **Connect Repo**
5. Select your GitHub repo: **GBVAI/gbcrm**
6. Branch: **main**
7. For twenty-worker, also set:
   - **Root Directory:** Leave empty (uses monorepo root)
   - **Build Command:** Leave default (uses Dockerfile)

### 2. Verify Environment Variables

All environment variables have been pre-configured via CLI. Verify in the Railway dashboard:

#### twenty-server variables:
- `APP_SECRET`: ✓ Set (64-char hex)
- `PORT`: ✓ 3000
- `NODE_PORT`: ✓ 3000
- `STORAGE_TYPE`: ✓ local
- `STORAGE_LOCAL_PATH`: ✓ .local-storage
- `FRONTEND_URL`: ✓ https://twenty-server-production-33ed.up.railway.app
- `SERVER_URL`: ✓ https://twenty-server-production-33ed.up.railway.app
- `REACT_APP_SERVER_BASE_URL`: ✓ https://twenty-server-production-33ed.up.railway.app
- `PG_DATABASE_URL`: ✓ ${{Postgres.DATABASE_URL}}
- `REDIS_URL`: ✓ ${{Redis.REDIS_URL}}
- `DISABLE_DB_MIGRATIONS`: ✓ false
- `DISABLE_CRON_JOBS_REGISTRATION`: ✓ false

#### twenty-worker variables:
- `APP_SECRET`: ✓ Set (same as server)
- `DISABLE_DB_MIGRATIONS`: ✓ true
- `DISABLE_CRON_JOBS_REGISTRATION`: ✓ true
- `PG_DATABASE_URL`: ✓ ${{Postgres.DATABASE_URL}}
- `REDIS_URL`: ✓ ${{Redis.REDIS_URL}}
- `SERVER_URL`: ✓ https://twenty-server-production-33ed.up.railway.app
- `FRONTEND_URL`: ✓ https://twenty-server-production-33ed.up.railway.app
- `RAILWAY_DOCKERFILE_PATH`: ✓ Dockerfile.worker

### 3. Configure Build Settings

#### twenty-server:
- **Builder:** Dockerfile
- **Dockerfile Path:** `Dockerfile` (default)
- **Watch Paths:** Leave default

#### twenty-worker:
- **Builder:** Dockerfile
- **Dockerfile Path:** Automatically set via `RAILWAY_DOCKERFILE_PATH` env var
- **Watch Paths:** Leave default

### 4. Deploy

Once connected to GitHub:
1. Railway will automatically trigger a build
2. Monitor build logs in the Railway dashboard
3. First deployment may take 10-20 minutes (building Node.js images)

### 5. Health Check

After deployment completes:
1. Check **twenty-server**: https://twenty-server-production-33ed.up.railway.app/healthz
2. Verify logs show no errors
3. Worker should start processing background jobs

## Alternative: CLI Deployment (if repo push desired)

```bash
# Commit and push the Railway config
git add .railwayignore railway.json
git commit -m "Add Railway deployment configuration"
git push origin main

# Then connect services to GitHub repo in Railway dashboard
```

## Troubleshooting

### Database Connection Issues
- Verify Postgres and Redis services are running
- Check that variable references are correct: `${{Postgres.DATABASE_URL}}`
- Ensure services are in the same Railway project

### Build Failures
- Check build logs in Railway dashboard
- Verify Dockerfile paths are correct
- Ensure all dependencies in package.json are available

### Migration Issues
- First deployment: Server will run migrations automatically
- Check server logs for migration errors
- Worker has migrations disabled (DISABLE_DB_MIGRATIONS=true)

## Updating Deployment

```bash
# Any git push to main branch will trigger new deployment
git push origin main

# Or manually trigger via CLI:
railway up --service twenty-server
railway up --service twenty-worker
```

## Project Files Created

- `.railwayignore` - Excludes node_modules, build artifacts from uploads
- `railway.json` - Dockerfile build configuration for server
- `Dockerfile` - Multi-stage build for server + frontend
- `Dockerfile.worker` - Worker service build
