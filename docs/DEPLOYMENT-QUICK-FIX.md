# Quick Deployment Fix - SSM Not Working

## Problem
SSM command fails immediately with no output. This means:
- SSM Agent is not running on EC2, OR
- EC2 instance doesn't have proper IAM role, OR
- Instance is not registered with SSM

## ✅ Solution: Use SSH-Based Fast Deploy

Since SSM is not working, use the **SSH-based Fast Deploy** method instead.

### Step 1: Verify GitHub Secrets

Make sure these secrets are configured in your GitHub repository:

**Go to:** `Settings` → `Secrets and variables` → `Actions`

**Required secrets:**
- ✅ `EC2_SSH_PRIVATE_KEY` - Your EC2 private key (PEM format)
- ✅ `EC2_INSTANCE_ID` - Your instance ID (i-0ac8fbf952ab92a65)
- ✅ `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_ACCESS_KEY`
- ✅ `AWS_REGION` (e.g., us-east-1)
- ✅ `S3_BUCKET_NAME`
- ✅ `CLAUDE_API_KEY` (Anthropic API key)
- ✅ `NEXTAUTH_URL` (e.g., http://your-ec2-ip or http://your-domain.com)

**Optional (can be empty):**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_MESSAGING_SERVICE_SID`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`

### Step 2: Deploy Using Fast Method

**Method A: GitHub Actions UI (RECOMMENDED - 5-10 minutes)**

1. Go to: https://github.com/Aarav500/Autoapply/actions
2. Click **"Fast Deploy (Build on Runner)"** workflow
3. Click **"Run workflow"** dropdown (right side)
4. Click green **"Run workflow"** button
5. Wait 5-10 minutes for completion
6. Check deployment status in the workflow logs

**Method B: Trigger via Push (Slower - 30-45 minutes)**

The SSH-based deployment will auto-trigger, but it's slower because it builds on EC2:

```bash
# This triggers .github/workflows/deploy-ssh.yml
git push origin main
```

## Checking Deployment Status

### View Logs
1. Go to GitHub Actions tab
2. Click on the running workflow
3. Click on the "Deploy to EC2" job
4. Expand each step to see logs

### Health Check
Once deployed, verify the application is running:

```bash
# Replace with your EC2 IP
curl http://YOUR-EC2-IP/api/health

# Should return:
# {"success":true,"data":{"status":"ok","timestamp":"...","storage":"connected"}}
```

### SSH into EC2 to Check
```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@YOUR-EC2-IP

# Check if container is running
docker ps | grep autoapply

# Check container logs
docker logs autoapply --tail 50

# Check health endpoint from inside EC2
curl http://localhost:3000/api/health
```

## Troubleshooting

### Error: "Permission denied (publickey)"
**Problem:** SSH key not configured or incorrect

**Fix:**
1. Verify you have the correct `.pem` file for your EC2 instance
2. Add it to GitHub Secrets as `EC2_SSH_PRIVATE_KEY`
3. Copy the ENTIRE file content including:
   ```
   -----BEGIN RSA PRIVATE KEY-----
   (content here)
   -----END RSA PRIVATE KEY-----
   ```

### Error: "Failed to download from S3"
**Problem:** AWS credentials don't have S3 access

**Fix:**
1. Verify AWS credentials in GitHub Secrets
2. Check IAM user has S3 permissions:
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:ListBucket`

### Error: "Docker build failed"
**Problem:** EC2 running out of resources

**Fix:**
1. SSH into EC2: `ssh -i your-key.pem ubuntu@YOUR-EC2-IP`
2. Clean up Docker:
   ```bash
   docker system prune -a -f
   docker volume prune -f
   ```
3. Check disk space: `df -h`
4. If disk is full, increase EBS volume size in AWS Console

### Error: "Health check failed"
**Problem:** Application started but has errors

**Fix:**
1. SSH into EC2
2. Check logs:
   ```bash
   docker logs autoapply --tail 100
   ```
3. Common issues:
   - Missing environment variables
   - S3 bucket doesn't exist
   - Invalid API keys

## Why SSM Doesn't Work

SSM requires:
1. ✅ EC2 instance must be running
2. ✅ IAM instance role with `AmazonSSMManagedInstanceCore` policy
3. ✅ SSM Agent installed and running
4. ✅ Instance registered with SSM (shows in Systems Manager console)
5. ✅ Outbound HTTPS (443) allowed in security group

**To fix SSM (optional - not required):**

1. **Check IAM Role:**
   ```bash
   # In AWS Console:
   # EC2 → Instances → Select instance → Actions → Security → Modify IAM role
   # Attach role with AmazonSSMManagedInstanceCore policy
   ```

2. **Install SSM Agent:**
   ```bash
   ssh -i your-key.pem ubuntu@YOUR-EC2-IP
   sudo snap install amazon-ssm-agent --classic
   sudo snap start amazon-ssm-agent
   sudo snap services amazon-ssm-agent
   ```

3. **Run Diagnostic:**
   ```bash
   ./scripts/diagnose-ec2.sh
   ```

## Recommended Approach

**For now:** Use the **Fast Deploy** workflow via GitHub Actions UI.

**Later (optional):** Fix SSM if you want automated deployments on push to main.

## Quick Deploy Now

```bash
# 1. Ensure GitHub secrets are configured
# 2. Go to GitHub Actions
# 3. Run "Fast Deploy (Build on Runner)"
# 4. Wait 5-10 minutes
# 5. Test: curl http://YOUR-EC2-IP/api/health
```

That's it! 🚀
