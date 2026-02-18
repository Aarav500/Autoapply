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
