# Deployment Verification Checklist

This checklist ensures all deployment errors are caught BEFORE pushing to production.

## Pre-Deployment Checks

### 1. Environment Variables ✓
**Verify ALL required environment variables are in [.github/workflows/deploy.yml](.github/workflows/deploy.yml)**

Required variables (checked against actual code usage):
- [ ] `NODE_ENV=production`
- [ ] `AWS_REGION` (for S3 client)
- [ ] `S3_BUCKET_NAME` (storage.ts line 232)
- [ ] `S3_REGION` (storage.ts line 227)
- [ ] `ANTHROPIC_API_KEY` (ai-client.ts)
- [ ] `TWILIO_ACCOUNT_SID` (sms-client.ts, whatsapp-client.ts)
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`
- [ ] `TWILIO_WHATSAPP_NUMBER`
- [ ] `GOOGLE_CLIENT_ID` (gmail-client.ts, calendar-client.ts)
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `JWT_SECRET` (auth-service.ts)
- [ ] `JWT_ACCESS_SECRET` (jwt.ts line 10)
- [ ] `JWT_REFRESH_SECRET` (jwt.ts line 11)
- [ ] `ENCRYPTION_KEY` (encryption.ts)
- [ ] `NEXT_PUBLIC_APP_URL` (Next.js public env var)
- [ ] `APP_URL` (fallback for server-side usage)

**How to check**: Run `grep -rh "process.env\." src/ | grep -o "process.env\.[A-Z_][A-Z_0-9]*" | sort -u`

### 2. Next.js Build Test ✓
**Test local build before pushing**

```bash
# Clean build
rm -rf .next

# Test production build
npm run build

# Expected: Build should complete successfully
# Build creates: .next/standalone/ folder with server.js
```

**Common issues**:
- ❌ "Could not find production build" → Missing BUILD_ID or manifests in .next
- ❌ "Cannot find module 'next'" → Missing node_modules in deployment package
- ❌ "<Html> should not be imported" → Next.js + React version compatibility issue

### 3. Deployment Package Structure ✓
**Verify deployment workflow copies correct files**

Check [.github/workflows/deploy.yml](.github/workflows/deploy.yml) "Create deployment package" step:

```bash
# CORRECT structure:
cp -r .next/standalone/* deploy/          # All standalone files (server.js, node_modules, .next/)
cp -r .next/static deploy/.next/static    # Add static folder (only thing standalone is missing)
cp -r public deploy/public                # Public assets
cp Dockerfile.fast deploy/Dockerfile      # Docker config
```

**Why this matters**:
- `.next/standalone/` already contains: server.js, node_modules, `.next/` (with BUILD_ID, manifests, server/)
- `.next/standalone/.next/` is MISSING only: `static/` folder
- DO NOT overwrite `.next/` from standalone with main `.next/` folder

### 4. Dockerfile Verification ✓
**Ensure [Dockerfile.fast](Dockerfile.fast) copies deployment package correctly**

```dockerfile
# Should copy EVERYTHING from deployment package:
COPY --chown=nextjs:nodejs . ./

# NOT individual files - standalone structure is complex
```

### 5. GitHub Secrets ✓
**Verify all secrets are set in GitHub repository settings**

Go to: https://github.com/Aarav500/Autoapply/settings/secrets/actions

Required secrets:
- [ ] `EC2_INSTANCE_ID` (e.g., i-03d04c40f6c5dbe6d)
- [ ] `S3_BUCKET_NAME` (your S3 bucket name)
- [ ] `ANTHROPIC_API_KEY`
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`
- [ ] `TWILIO_WHATSAPP_NUMBER`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `JWT_SECRET` (generate with: `openssl rand -base64 32`)
- [ ] `JWT_REFRESH_SECRET` (generate separately)
- [ ] `ENCRYPTION_KEY` (32-byte hex: `openssl rand -hex 32`)
- [ ] `NEXT_PUBLIC_APP_URL` (your domain or IP)

**GitHub Actions service account**:
- [ ] `AWS_ACCESS_KEY_ID` (for Auto_apply IAM user)
- [ ] `AWS_SECRET_ACCESS_KEY`

### 6. AWS IAM Permissions ✓
**Verify IAM user and EC2 instance role have correct permissions**

**Auto_apply IAM User** (for GitHub Actions):
- [ ] `AmazonS3FullAccess` or custom S3 policy for your bucket
- [ ] `AmazonEC2ReadOnlyAccess` (to describe instances)
- [ ] `AmazonSSMFullAccess` (to send commands)

**EC2 Instance Role** (e.g., EC2-SSM-Managed):
- [ ] `AmazonSSMManagedInstanceCore` (for SSM Agent)
- [ ] `AmazonS3ReadOnlyAccess` or custom policy to download from deployment bucket
- [ ] Optional: `AmazonS3FullAccess` if app needs to write to S3 at runtime

### 7. EC2 Instance Setup ✓
**Verify EC2 is configured for SSM and has IAM role attached**

```bash
# Check SSM Agent status
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=i-03d04c40f6c5dbe6d" \
  --region us-east-1

# Should show: PingStatus: Online
```

**Requirements**:
- [ ] SSM Agent installed and running (pre-installed on Amazon Linux 2, Ubuntu 16.04+)
- [ ] IAM Instance Profile attached (EC2-SSM-Managed role)
- [ ] Security group allows outbound HTTPS to AWS services
- [ ] No need for SSH access or key pairs

### 8. API Routes Health Check ✓
**Verify health endpoint exists and works**

File: [src/app/api/health/route.ts](src/app/api/health/route.ts)

```typescript
export async function GET() {
  // Should return { status: 'ok', timestamp, uptime }
}
```

**Test after deployment**:
```bash
curl http://<EC2-PUBLIC-IP>:3000/api/health
# Expected: {"success":true,"data":{"status":"ok",...}}
```

## Post-Deployment Verification

### 1. Monitor GitHub Actions ✓
Watch deployment progress: https://github.com/Aarav500/Autoapply/actions

**Expected stages**:
1. ✅ Checkout code
2. ✅ Setup Node.js
3. ✅ Install dependencies
4. ✅ Build Next.js application
5. ✅ Create deployment package
6. ✅ Upload to S3
7. ✅ Deploy via SSM
8. ✅ Health check passes

### 2. Check SSM Command Output ✓
If deployment fails, check SSM output:

```bash
# Get latest command ID from GitHub Actions logs
COMMAND_ID="<from-deployment-logs>"

# Check command status
aws ssm get-command-invocation \
  --command-id "$COMMAND_ID" \
  --instance-id "i-03d04c40f6c5dbe6d" \
  --region us-east-1
```

### 3. Check Docker Container Status ✓
SSH into EC2 or use SSM Session Manager:

```bash
# Check if container is running
sudo docker ps | grep autoapply

# Check container logs
sudo docker logs autoapply-app

# Check application health
curl http://localhost:3000/api/health
```

## Common Errors and Solutions

### Error: "Could not find production build in ./.next directory"
**Cause**: Deployment package missing BUILD_ID, manifests, or server folder
**Fix**: Verify "Create deployment package" step copies `.next/standalone/*` first, then only adds `.next/static`

### Error: "Cannot find module 'next'"
**Cause**: node_modules not included in deployment package
**Fix**: Ensure Dockerfile copies entire deployment package: `COPY --chown=nextjs:nodejs . ./`

### Error: "Failed to run commands: exit status 127"
**Cause**: AWS CLI or Docker not installed on EC2
**Fix**: Deployment workflow auto-installs both (added in deploy.yml)

### Error: "User is not authorized to perform: ssm:SendCommand"
**Cause**: Auto_apply IAM user missing SSM permissions
**Fix**: Attach `AmazonSSMFullAccess` policy

### Error: "SSM Agent not registered"
**Cause**: EC2 instance missing IAM instance profile
**Fix**: Attach EC2-SSM-Managed role to instance

### Error: Docker build fails with "COPY failed"
**Cause**: Dockerfile expects wrong file structure
**Fix**: Use `COPY --chown=nextjs:nodejs . ./` to copy entire package

## Rollback Procedure

If deployment fails and application is down:

```bash
# 1. SSH or SSM into EC2
aws ssm start-session --target i-03d04c40f6c5dbe6d

# 2. Check previous deployment in S3
aws s3 ls s3://<bucket>/deployments/ --recursive

# 3. Download previous working version
aws s3 cp s3://<bucket>/deployments/<timestamp>/deploy.tar.gz .

# 4. Extract and redeploy
tar -xzf deploy.tar.gz
cd app
sudo docker build -t autoapply:latest .
sudo docker stop autoapply-app
sudo docker rm autoapply-app
sudo docker run -d --name autoapply-app -p 3000:3000 --env-file .env autoapply:latest
```

## Success Criteria

Deployment is successful when:
- [x] GitHub Actions workflow completes without errors
- [x] SSM command shows "✅ Application is healthy"
- [x] `curl http://<EC2-IP>:3000/api/health` returns `{"success":true,"data":{"status":"ok"}}`
- [x] Application accessible at public IP on port 3000
- [x] Docker container running: `sudo docker ps` shows `autoapply-app`
- [x] No errors in logs: `sudo docker logs autoapply-app`

---

**Last Updated**: 2026-02-23
**Version**: 1.0.0
**Maintained By**: Claude Code + Aarav
