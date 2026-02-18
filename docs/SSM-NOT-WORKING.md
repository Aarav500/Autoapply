# SSM Not Working - Manual Deployment Guide

## Problem

SSM commands fail immediately with no output:
```
Status: Failed
STDOUT: (empty)
STDERR: (empty)
```

This means **SSM Agent is NOT running or NOT configured** on your EC2 instance.

---

## ✅ Immediate Solution: Manual Deployment

Since automated deployments aren't working, use this **manual deployment method**:

### Step 1: Build Locally

Run this script on your **local machine**:

```bash
# Make the script executable
chmod +x scripts/deploy-manual.sh

# Set required environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
export S3_BUCKET_NAME="your-bucket-name"
export EC2_INSTANCE_ID="i-0ac8fbf952ab92a65"

# Run the deployment script
./scripts/deploy-manual.sh
```

**What this does:**
1. ✅ Builds Next.js locally on your machine (fast!)
2. ✅ Creates deployment package
3. ✅ Uploads to S3
4. ✅ Generates commands for you to run on EC2

### Step 2: Deploy on EC2

The script will give you commands to run. Connect to EC2 using **one of these methods**:

#### **Option A: AWS Session Manager (Browser-based, No Keys)**

1. Go to: https://console.aws.amazon.com/ec2
2. Select your instance
3. Click **"Connect"** button
4. Choose **"Session Manager"** tab
5. Click **"Connect"**
6. A browser terminal will open
7. Paste and run the commands from the script

#### **Option B: EC2 Instance Connect (Browser-based, No Keys)**

1. Go to: https://console.aws.amazon.com/ec2
2. Select your instance
3. Click **"Connect"** button
4. Choose **"EC2 Instance Connect"** tab
5. Click **"Connect"**
6. A browser terminal will open
7. Paste and run the commands from the script

#### **Option C: Copy the Deployment Script**

The manual deployment script creates a file: `/tmp/ec2-deploy-XXXXX.sh`

1. Connect to EC2 via any method
2. Create the script file on EC2
3. Add your API keys to the script
4. Run: `bash ec2-deploy-XXXXX.sh`

---

## 🔧 Fix SSM for Future Deployments (Optional)

If you want automated deployments working, you need to fix SSM:

### Check 1: Is SSM Agent Installed?

Connect to your EC2 instance and run:

```bash
# Check if SSM agent is installed
sudo systemctl status amazon-ssm-agent

# OR for snap-based systems
sudo snap services amazon-ssm-agent
```

**If not installed:**

```bash
# Ubuntu/Debian
sudo snap install amazon-ssm-agent --classic
sudo snap start amazon-ssm-agent

# Amazon Linux 2
sudo yum install -y amazon-ssm-agent
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent
```

### Check 2: Does EC2 Have IAM Role?

1. Go to EC2 Console
2. Select your instance
3. Look at **"Security"** tab
4. Check **"IAM Role"** field

**If empty or missing SSM policy:**

1. Go to IAM Console → Roles
2. Create a new role OR modify existing role
3. Add policy: **AmazonSSMManagedInstanceCore**
4. Attach this role to your EC2 instance:
   - EC2 Console → Select instance
   - Actions → Security → Modify IAM role
   - Select the role → Save

### Check 3: Is Instance Registered with SSM?

```bash
# Run from your local machine
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=YOUR-INSTANCE-ID" \
  --region YOUR-REGION

# Should return instance info
# If empty, SSM agent isn't registering
```

### Check 4: Run Diagnostic Script

```bash
# From your local machine
chmod +x scripts/diagnose-ec2.sh
./scripts/diagnose-ec2.sh
```

This will check all SSM requirements and show what's wrong.

---

## 📋 Deployment Comparison

| Method | Works Now? | Setup Required | Speed |
|--------|------------|----------------|-------|
| **Manual (Local Build)** | ✅ Yes | None | Fast |
| SSM Deploy | ❌ No | Fix SSM agent | Fast |
| SSH Deploy | ❓ Maybe | SSH key needed | Fast |

---

## 🎯 Quick Deploy Right Now

**Run these commands on your local machine:**

```bash
# 1. Set environment variables (one-time setup)
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_REGION="us-east-1"
export S3_BUCKET_NAME="your-bucket"
export EC2_INSTANCE_ID="i-0ac8fbf952ab92a65"

# 2. Build and upload
chmod +x scripts/deploy-manual.sh
./scripts/deploy-manual.sh

# 3. Follow the instructions to deploy on EC2
```

---

## 🔍 Why SSM Fails

Common reasons SSM commands fail immediately:

| Symptom | Cause | Fix |
|---------|-------|-----|
| No output, instant fail | SSM Agent not running | Install/start SSM agent |
| No output, instant fail | No IAM role | Attach role with SSM policy |
| No output, instant fail | Instance not registered | Wait 5 min after role attached |
| No output, instant fail | No internet access | Check security groups |

---

## 📖 Alternative: Use SSH Keys

If you have an SSH key for your EC2 instance:

1. Add it to GitHub Secrets as `EC2_SSH_PRIVATE_KEY`
2. Use the Fast Deploy workflow:
   - Go to: https://github.com/Aarav500/Autoapply/actions
   - Click "Fast Deploy (Build on Runner)"
   - Click "Run workflow"

See: [docs/GITHUB-SECRETS-SETUP.md](GITHUB-SECRETS-SETUP.md)

---

## ✅ Recommended Approach

**For immediate deployment:**
1. Use the manual deployment script (works now!)
2. Build locally on your machine
3. Connect to EC2 via browser (Session Manager/Instance Connect)
4. Deploy manually

**For automated deployments (later):**
1. Fix SSM agent on EC2
2. Verify with diagnostic script
3. Push to main will auto-deploy

---

## 🎉 Summary

**You can deploy RIGHT NOW using the manual method:**

```bash
# On your local machine
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-east-1"
export S3_BUCKET_NAME="..."
export EC2_INSTANCE_ID="i-0ac8fbf952ab92a65"

chmod +x scripts/deploy-manual.sh
./scripts/deploy-manual.sh

# Then connect to EC2 via browser and run the commands shown
```

**This bypasses all SSH/SSM issues and gets your app deployed!**
