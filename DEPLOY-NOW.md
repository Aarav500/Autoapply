# Deploy AutoApply NOW (SSM Not Working)

## The Problem

Your EC2 instance does **NOT have SSM Agent working**. Every SSM command fails immediately with:
```
Status: Failed
STDOUT: (empty)
STDERR: (empty)
```

This means automated GitHub Actions deployments **will not work** until SSM is fixed.

---

## ✅ WORKING SOLUTION: Manual Deployment

Use this method to deploy **RIGHT NOW** without fixing SSM:

### Step 1: Build Locally (Your Computer)

```bash
# Open Git Bash or WSL on Windows
cd c:/AutoApply

# Set AWS credentials
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
export S3_BUCKET_NAME="your-bucket-name"
export EC2_INSTANCE_ID="i-0ac8fbf952ab92a65"

# Run deployment script
chmod +x scripts/deploy-manual.sh
./scripts/deploy-manual.sh
```

**This will:**
1. Build Next.js on your computer (1-2 minutes)
2. Upload to S3
3. Show you commands to run on EC2

### Step 2: Connect to EC2 (No SSH Key Needed!)

**Use AWS Console (Browser):**

1. Go to: https://console.aws.amazon.com/ec2/v2/home
2. Find your instance: `i-0ac8fbf952ab92a65`
3. Select it (checkbox)
4. Click **"Connect"** button
5. Choose **"Session Manager"** OR **"EC2 Instance Connect"**
6. Click **"Connect"**
7. Browser terminal opens!

### Step 3: Run Deployment Commands

The script from Step 1 will show you commands like this. Copy and paste them:

```bash
# Download from S3
cd /tmp
mkdir -p autoapply-deploy-XXX
cd autoapply-deploy-XXX

aws s3 cp s3://YOUR-BUCKET/deployments/autoapply-XXX.tar.gz .

# Extract
tar -xzf autoapply-XXX.tar.gz

# Build Docker image (fast - pre-built)
export DOCKER_BUILDKIT=1
docker build -f Dockerfile.fast -t autoapply:latest .

# Stop old container
docker stop autoapply 2>/dev/null || true
docker rm autoapply 2>/dev/null || true

# Start new container
docker run -d \
  --name autoapply \
  --restart unless-stopped \
  -p 80:3000 \
  -e NODE_ENV=production \
  -e AWS_ACCESS_KEY_ID="YOUR_KEY" \
  -e AWS_SECRET_ACCESS_KEY="YOUR_SECRET" \
  -e AWS_REGION="us-east-1" \
  -e S3_BUCKET_NAME="YOUR_BUCKET" \
  -e ANTHROPIC_API_KEY="YOUR_CLAUDE_KEY" \
  -e APP_URL="http://YOUR-EC2-IP" \
  -e JWT_ACCESS_SECRET="$(openssl rand -hex 32)" \
  -e JWT_REFRESH_SECRET="$(openssl rand -hex 32)" \
  -e ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  autoapply:latest

# Check it worked
sleep 10
docker ps | grep autoapply
curl http://localhost:3000/api/health
```

**Replace with your actual values!**

---

## 🔧 To Fix SSM (For Future Automated Deploys)

If you want GitHub Actions to work automatically:

### Connect to EC2 and Run:

```bash
# Install SSM Agent
sudo snap install amazon-ssm-agent --classic
sudo snap start amazon-ssm-agent
sudo snap services amazon-ssm-agent

# Verify
sudo systemctl status snap.amazon-ssm-agent.amazon-ssm-agent.service
```

### Add IAM Role (AWS Console):

1. Go to EC2 Console
2. Select your instance
3. Actions → Security → Modify IAM role
4. Select a role with `AmazonSSMManagedInstanceCore` policy
   - Or create one if it doesn't exist
5. Save

### Wait 5 Minutes

SSM agent needs to register with AWS after the role is attached.

### Verify SSM Works:

```bash
# From your local machine
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=i-0ac8fbf952ab92a65" \
  --region us-east-1

# Should show your instance with PingStatus: Online
```

---

## 📋 Quick Reference

| Method | Works Now? | Requires |
|--------|-----------|----------|
| **Manual Script** | ✅ YES | AWS credentials, browser |
| GitHub Actions (SSM) | ❌ NO | SSM Agent fixed |
| GitHub Actions (SSH) | ❌ NO | SSH private key |

---

## ⚡ Deploy in Next 5 Minutes

```bash
# 1. On your computer (Git Bash/WSL):
cd c:/AutoApply
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-east-1"
export S3_BUCKET_NAME="..."
export EC2_INSTANCE_ID="i-0ac8fbf952ab92a65"

chmod +x scripts/deploy-manual.sh
./scripts/deploy-manual.sh

# 2. In AWS Console:
# - Connect to EC2 via Session Manager
# - Paste the commands shown by the script
# - Hit Enter

# 3. Done! Test:
curl http://YOUR-EC2-IP/api/health
```

---

## 🎯 Bottom Line

**SSM is not configured on your EC2 instance.**

**Use the manual deployment script** - it works RIGHT NOW without any fixes needed.

**To enable automated deployments**, you must install SSM Agent and attach an IAM role to your EC2 instance.

---

## Need Help?

1. **Manual deployment**: See [scripts/deploy-manual.sh](scripts/deploy-manual.sh)
2. **SSM troubleshooting**: See [docs/SSM-NOT-WORKING.md](docs/SSM-NOT-WORKING.md)
3. **Full deployment guide**: See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
