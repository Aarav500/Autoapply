# Deployment Guide

## Build Requirements

**CRITICAL:** Always set `NODE_ENV=production` when building:

```bash
NODE_ENV=production npm run build
```

The application will fail to build without this environment variable set correctly.

## Prerequisites

1. **AWS Account** with:
   - EC2 instance running (Ubuntu 20.04+)
   - S3 bucket created
   - IAM user with programmatic access

2. **GitHub Repository Secrets:**
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `S3_BUCKET_NAME`
   - `EC2_INSTANCE_ID`
   - `CLAUDE_API_KEY`
   - `NEXTAUTH_URL`
   - (Optional: Google, Twilio, SendGrid credentials)

## Deployment Methods

### 1. GitHub Actions (Recommended)

Push to main branch triggers automatic deployment:

```bash
git push origin main
```

Uses `.github/workflows/deploy-ssh.yml` (SSH-based deployment)

### 2. Manual Deployment

SSH into EC2 and run:

```bash
cd /path/to/autoapply
git pull origin main
chmod +x scripts/deploy.sh
NODE_ENV=production ./scripts/deploy.sh
```

## Health Check

After deployment:

```bash
curl http://your-domain.com/api/health
```

Should return: `{"status":"ok","timestamp":"..."}`

## Troubleshooting

- **Build fails:** Ensure `NODE_ENV=production` is set
- **Docker fails:** Check disk space with `docker system prune -a`
- **App won't start:** Check logs with `docker logs autoapply`
- **Port conflict:** Change port mapping or stop conflicting service

## Deployment Methods Comparison

### 1. Fast Deploy (RECOMMENDED) ⚡
**File:** `.github/workflows/deploy-fast.yml`

**How it works:**
- Builds Next.js app on GitHub's fast runners (30-60 seconds)
- Packages only the built `.next` folder and minimal files
- Copies to EC2 and builds tiny Docker image (<1 minute)
- **Total time: ~5-10 minutes**

**Trigger:**
```bash
# Manual trigger via GitHub Actions UI
# Select "Fast Deploy (Build on Runner)" workflow
```

### 2. Standard SSH Deploy
**File:** `.github/workflows/deploy-ssh.yml`

**How it works:**
- Packages source code
- Builds entire app on EC2 inside Docker (slow)
- **Total time: 20-45 minutes**
- Use only if fast deploy fails

**Trigger:**
```bash
git push origin main  # Auto-triggers
```

## Quick Deployment Guide

**For fastest deployments:**
1. Go to GitHub Actions tab
2. Select "Fast Deploy (Build on Runner)"
3. Click "Run workflow"
4. Wait ~5-10 minutes
5. Check health: `http://your-ec2-ip/api/health`

**Troubleshooting slow builds:**
- Always use Fast Deploy method for production
- Standard method is backup only
- EC2 t3.small instances are slow for Docker builds
- GitHub runners are much faster (8 CPU cores vs 2)
