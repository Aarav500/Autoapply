# Deploy AutoApply + Install SSM Agent

## Quick Deploy (Installs SSM Agent First)

This guide shows you how to deploy AND install SSM Agent in one step.

### Step 1: Connect to EC2 (Browser - No Keys!)

1. Go to: https://console.aws.amazon.com/ec2/v2/home
2. Select your instance (`i-0ac8fbf952ab92a65`)
3. Click **"Connect"** → **"EC2 Instance Connect"**
4. Click **"Connect"**
5. Browser terminal opens

### Step 2: Run This One Command

**Copy and paste this entire block** into the EC2 terminal:

```bash
# Download and run the deployment script
curl -sL https://raw.githubusercontent.com/Aarav500/Autoapply/main/scripts/install-ssm-and-deploy.sh | bash -s -- \
  LATEST_COMMIT_SHA \
  YOUR_S3_BUCKET \
  us-east-1
```

**Replace:**
- `LATEST_COMMIT_SHA` → Get from latest commit (or use `main`)
- `YOUR_S3_BUCKET` → Your S3 bucket name
- `us-east-1` → Your AWS region

### What This Does:

1. ✅ Installs SSM Agent
2. ✅ Installs Docker (if needed)
3. ✅ Downloads your app from S3
4. ✅ Builds Docker image
5. ✅ Starts container
6. ✅ Runs health checks

**Total time:** 5-10 minutes

---

## Alternative: Manual Steps

If you prefer to see each step:

### 1. Install SSM Agent

```bash
# Ubuntu/Debian (via snap)
sudo snap install amazon-ssm-agent --classic
sudo snap start amazon-ssm-agent
sudo snap services amazon-ssm-agent

# Amazon Linux (via yum)
sudo yum install -y amazon-ssm-agent
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent
sudo systemctl status amazon-ssm-agent
```

### 2. Install Docker (if not installed)

```bash
# Ubuntu
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker

# Amazon Linux
sudo yum install -y docker
sudo service docker start
sudo systemctl enable docker
```

### 3. Deploy Application

```bash
# Set variables
COMMIT_SHA="YOUR_COMMIT_SHA"
S3_BUCKET="YOUR_BUCKET"
AWS_REGION="us-east-1"

# Download from S3
cd /tmp
mkdir -p autoapply-deploy-$COMMIT_SHA
cd autoapply-deploy-$COMMIT_SHA

aws s3 cp s3://$S3_BUCKET/deployments/autoapply-$COMMIT_SHA.tar.gz . --region $AWS_REGION
tar -xzf autoapply-$COMMIT_SHA.tar.gz

# Build and run
export DOCKER_BUILDKIT=1
sudo docker build -f Dockerfile.fast -t autoapply:latest .

sudo docker stop autoapply 2>/dev/null || true
sudo docker rm autoapply 2>/dev/null || true

sudo docker run -d \
  --name autoapply \
  --restart unless-stopped \
  -p 80:3000 \
  -e NODE_ENV=production \
  -e AWS_ACCESS_KEY_ID="YOUR_AWS_KEY" \
  -e AWS_SECRET_ACCESS_KEY="YOUR_AWS_SECRET" \
  -e AWS_REGION="$AWS_REGION" \
  -e S3_BUCKET_NAME="$S3_BUCKET" \
  -e ANTHROPIC_API_KEY="YOUR_CLAUDE_KEY" \
  -e APP_URL="http://YOUR-EC2-IP" \
  -e JWT_ACCESS_SECRET="$(openssl rand -hex 32)" \
  -e JWT_REFRESH_SECRET="$(openssl rand -hex 32)" \
  -e ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  autoapply:latest

# Check it worked
sleep 15
curl http://localhost:3000/api/health
sudo docker logs autoapply --tail 30
```

---

## After Deployment

### 1. Verify SSM Agent

```bash
# Check status
sudo snap services amazon-ssm-agent

# OR for yum-based systems
sudo systemctl status amazon-ssm-agent
```

### 2. Add IAM Role (Important!)

SSM Agent needs an IAM role to register with AWS Systems Manager:

1. Go to EC2 Console
2. Select your instance
3. **Actions** → **Security** → **Modify IAM role**
4. Select a role with **`AmazonSSMManagedInstanceCore`** policy
   - If no role exists, create one in IAM Console first
5. Click **Save**

### 3. Wait 5 Minutes

SSM Agent needs time to register with AWS after the IAM role is attached.

### 4. Verify SSM Registration

From your local machine:

```bash
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=i-0ac8fbf952ab92a65" \
  --region us-east-1

# Should show:
# PingStatus: Online
# InstanceId: i-0ac8fbf952ab92a65
```

---

## Enable Automated Deployments

Once SSM is working:

### Test SSM Command

```bash
# From your local machine
aws ssm send-command \
  --instance-ids i-0ac8fbf952ab92a65 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["echo Hello from SSM!"]' \
  --region us-east-1
```

### Enable GitHub Actions

Once the test command succeeds, **automated deployments will work!**

Just push to main:

```bash
git push origin main
```

GitHub Actions will automatically:
1. Build Next.js on GitHub runners
2. Upload to S3
3. Send SSM command to EC2
4. EC2 deploys automatically
5. Done in 10-15 minutes!

---

## Troubleshooting

### SSM Agent Not Starting

```bash
# Check logs
sudo journalctl -u snap.amazon-ssm-agent.amazon-ssm-agent -f

# OR
sudo tail -f /var/log/amazon/ssm/amazon-ssm-agent.log
```

### IAM Role Issues

The role needs these permissions:
- `AmazonSSMManagedInstanceCore` (for SSM)
- `AmazonS3ReadOnlyAccess` (to download from S3)

### Docker Permission Denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Then logout and login again
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Install SSM | `sudo snap install amazon-ssm-agent --classic` |
| Start SSM | `sudo snap start amazon-ssm-agent` |
| Check SSM | `sudo snap services amazon-ssm-agent` |
| Install Docker | `sudo apt-get install -y docker.io` |
| Start Docker | `sudo systemctl start docker` |
| Check Container | `sudo docker ps \| grep autoapply` |
| View Logs | `sudo docker logs autoapply --tail 50` |
| Health Check | `curl http://localhost:3000/api/health` |

---

## Summary

**One-line deployment (installs SSM + deploys app):**

```bash
curl -sL https://raw.githubusercontent.com/Aarav500/Autoapply/main/scripts/install-ssm-and-deploy.sh | bash -s -- COMMIT_SHA S3_BUCKET us-east-1
```

**Then:**
1. Add IAM role in AWS Console
2. Wait 5 minutes
3. Future deploys are automated! 🎉
