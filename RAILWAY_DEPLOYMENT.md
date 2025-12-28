# Railway Deployment Guide for Twenty CRM

## Project Configuration

**Railway Project:** twenty-crm-fork
**Project URL:** https://railway.com/project/e39359c5-d4ed-4c4a-a5e8-36dec6e79799

### Services Required

1. **Supabase** - PostgreSQL database (managed Supabase instance)
2. **Redis** - Cache service for background jobs and caching
3. **Minio** - S3-compatible object storage for file uploads
4. **twenty-server** - Main application service (server + frontend)
   - Domain: https://twenty-server-production-33ed.up.railway.app
5. **twenty-worker** - Background worker service
   - Domain: https://twenty-worker-production-7233.up.railway.app

---

## Service Setup

### Supabase Database

Your Supabase instance is already created. Configure the connection:

1. Get your connection string from Supabase Dashboard → Settings → Database
2. Use the **pooler connection** (port 6543) for better connection handling:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

**Environment Variables:**
```bash
PG_DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
PG_SSL_ALLOW_SELF_SIGNED=true
```

### Redis Service

Add Redis to your Railway project:
```bash
railway add -d redis
```

**Environment Variables (on Twenty services):**
```bash
REDIS_URL=${{Redis.REDIS_URL}}
CACHE_STORAGE_TYPE=redis
CACHE_STORAGE_TTL=3600
```

### Minio S3 Storage

Add Minio service via Railway Dashboard:
1. Click "New Service" → "Docker Image"
2. Image: `minio/minio`
3. Configure start command: `server /data --console-address ":9001"`
4. Add a volume mount for `/data`

**Minio Service Variables:**
```bash
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your-secure-password-here
```

**Twenty Service Variables:**
```bash
STORAGE_TYPE=s3
STORAGE_S3_NAME=twenty
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ENDPOINT=http://${{Minio.RAILWAY_PRIVATE_DOMAIN}}:9000
STORAGE_S3_ACCESS_KEY_ID=${{Minio.MINIO_ROOT_USER}}
STORAGE_S3_SECRET_ACCESS_KEY=${{Minio.MINIO_ROOT_PASSWORD}}
```

**Post-Setup:** Access Minio console (port 9001) and create a bucket named `twenty`

---

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

### 2. Configure Environment Variables

Update environment variables in Railway dashboard to use Supabase, Redis, and Minio:

#### twenty-server variables:
```bash
# Core Application
APP_SECRET=<generate with: openssl rand -hex 32>
PORT=3000
NODE_PORT=3000
FRONTEND_URL=https://twenty-server-production-33ed.up.railway.app
SERVER_URL=https://twenty-server-production-33ed.up.railway.app
REACT_APP_SERVER_BASE_URL=https://twenty-server-production-33ed.up.railway.app

# Database - Supabase
PG_DATABASE_URL=<your-supabase-connection-string>
PG_SSL_ALLOW_SELF_SIGNED=true

# Redis
REDIS_URL=${{Redis.REDIS_URL}}
CACHE_STORAGE_TYPE=redis
CACHE_STORAGE_TTL=3600

# Minio S3 Storage
STORAGE_TYPE=s3
STORAGE_S3_NAME=twenty
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ENDPOINT=http://${{Minio.RAILWAY_PRIVATE_DOMAIN}}:9000
STORAGE_S3_ACCESS_KEY_ID=${{Minio.MINIO_ROOT_USER}}
STORAGE_S3_SECRET_ACCESS_KEY=${{Minio.MINIO_ROOT_PASSWORD}}

# Migrations (server runs migrations)
DISABLE_DB_MIGRATIONS=false
DISABLE_CRON_JOBS_REGISTRATION=false
```

#### twenty-worker variables:
```bash
# Core Application
APP_SECRET=<same as server>
FRONTEND_URL=https://twenty-server-production-33ed.up.railway.app
SERVER_URL=https://twenty-server-production-33ed.up.railway.app

# Database - Supabase
PG_DATABASE_URL=<your-supabase-connection-string>
PG_SSL_ALLOW_SELF_SIGNED=true

# Redis
REDIS_URL=${{Redis.REDIS_URL}}
CACHE_STORAGE_TYPE=redis

# Minio S3 Storage
STORAGE_TYPE=s3
STORAGE_S3_NAME=twenty
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ENDPOINT=http://${{Minio.RAILWAY_PRIVATE_DOMAIN}}:9000
STORAGE_S3_ACCESS_KEY_ID=${{Minio.MINIO_ROOT_USER}}
STORAGE_S3_SECRET_ACCESS_KEY=${{Minio.MINIO_ROOT_PASSWORD}}

# Worker-specific (no migrations)
DISABLE_DB_MIGRATIONS=true
DISABLE_CRON_JOBS_REGISTRATION=true
RAILWAY_DOCKERFILE_PATH=Dockerfile.worker
```

#### Minio service variables:
```bash
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<generate-secure-password>
```

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
