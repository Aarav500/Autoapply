# GitHub Secrets Setup Guide

## Problem
The deployment failed with:
```
Error: can't connect without a private SSH key or password
```

This means the `EC2_SSH_PRIVATE_KEY` secret is **not configured** in your GitHub repository.

---

## ✅ Solution: Configure GitHub Secrets

### Step 1: Find Your EC2 SSH Private Key

You need the `.pem` file you use to SSH into your EC2 instance.

**Common locations:**
- Windows: `C:\Users\YourName\.ssh\your-key.pem`
- Mac/Linux: `~/.ssh/your-key.pem` or `~/Downloads/your-key.pem`

**If you don't have it:**
1. Go to AWS EC2 Console
2. You'll need to create a new key pair OR
3. Use AWS Systems Manager Session Manager (no key needed)

### Step 2: Open the Private Key File

```bash
# Mac/Linux - view the key
cat ~/.ssh/your-key.pem

# Windows - view the key in notepad
notepad C:\Users\YourName\.ssh\your-key.pem
```

The content should look like:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(many lines of random characters)
...
-----END RSA PRIVATE KEY-----
```

**IMPORTANT:** Copy the ENTIRE content including the `-----BEGIN` and `-----END` lines.

### Step 3: Add Secret to GitHub

1. **Go to your GitHub repository:**
   https://github.com/Aarav500/Autoapply

2. **Click on "Settings" tab** (top right)

3. **In left sidebar:**
   - Click "Secrets and variables"
   - Click "Actions"

4. **Click "New repository secret"** (green button)

5. **Add the SSH key:**
   - **Name:** `EC2_SSH_PRIVATE_KEY`
   - **Value:** Paste the ENTIRE content of your `.pem` file
   - Click "Add secret"

### Step 4: Verify Other Required Secrets

While you're in the Secrets page, verify these are also configured:

| Secret Name | Example Value | Required? |
|-------------|---------------|-----------|
| `EC2_SSH_PRIVATE_KEY` | (your .pem file content) | ✅ YES |
| `EC2_INSTANCE_ID` | i-0ac8fbf952ab92a65 | ✅ YES |
| `AWS_ACCESS_KEY_ID` | AKIAIOSFODNN7EXAMPLE | ✅ YES |
| `AWS_SECRET_ACCESS_KEY` | wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY | ✅ YES |
| `AWS_REGION` | us-east-1 | ✅ YES |
| `S3_BUCKET_NAME` | autoapply-production | ✅ YES |
| `CLAUDE_API_KEY` | sk-ant-api03-... | ✅ YES |
| `NEXTAUTH_URL` | http://54.123.45.67 | ✅ YES |
| `GOOGLE_CLIENT_ID` | (optional) | ⬜ No |
| `GOOGLE_CLIENT_SECRET` | (optional) | ⬜ No |
| `TWILIO_ACCOUNT_SID` | (optional) | ⬜ No |
| `TWILIO_AUTH_TOKEN` | (optional) | ⬜ No |
| `TWILIO_PHONE_NUMBER` | (optional) | ⬜ No |
| `SENDGRID_API_KEY` | (optional) | ⬜ No |

### Step 5: Run Deployment Again

Once secrets are configured:

1. Go to: https://github.com/Aarav500/Autoapply/actions
2. Click "Fast Deploy (Build on Runner)"
3. Click "Run workflow" → "Run workflow"
4. Wait 5-10 minutes
5. Check deployment succeeded

---

## 🔧 Alternative: If You Don't Have SSH Key

### Option A: Create New SSH Key Pair in AWS

1. **Go to AWS EC2 Console**
2. **Left sidebar:** Network & Security → Key Pairs
3. **Click "Create key pair"**
   - Name: `autoapply-deploy-key`
   - Type: RSA
   - Format: `.pem`
4. **Download the file** (save it securely!)
5. **Attach to your EC2 instance:**
   - Stop your instance
   - Actions → Security → Modify IAM role
   - Add the new key pair
   - Start instance
6. **Add to GitHub Secrets** (follow Step 3 above)

### Option B: Use AWS Systems Manager (No SSH Key Needed)

If you don't want to use SSH keys, you can use AWS Systems Manager instead:

**Requirements:**
1. EC2 instance must have SSM Agent installed
2. Instance must have IAM role with `AmazonSSMManagedInstanceCore` policy

**Setup SSM Agent:**

```bash
# SSH into your instance one more time with your current method
ssh -i your-old-key.pem ubuntu@YOUR-EC2-IP

# Install SSM Agent
sudo snap install amazon-ssm-agent --classic
sudo snap start amazon-ssm-agent

# Verify it's running
sudo snap services amazon-ssm-agent
```

**Then use the SSM deployment workflow:**
- File: `.github/workflows/deploy.yml`
- Triggers on push to main
- No SSH key needed

---

## 📋 Quick Checklist

Before running deployment, verify:

- [ ] `EC2_SSH_PRIVATE_KEY` secret is configured in GitHub
- [ ] Can SSH into EC2 manually: `ssh -i your-key.pem ubuntu@YOUR-EC2-IP`
- [ ] EC2 instance is running (check AWS Console)
- [ ] All required secrets are configured (see table above)
- [ ] S3 bucket exists and IAM user has access
- [ ] Docker is installed on EC2: `docker --version`

---

## 🔍 Testing Your Setup

### Test 1: SSH Connection (Local Machine)

```bash
# Replace with your details
ssh -i path/to/your-key.pem ubuntu@YOUR-EC2-IP

# If successful, you'll be logged into EC2
# If it fails, the GitHub Action will also fail
```

### Test 2: Docker on EC2

```bash
# After SSH-ing into EC2
docker --version
# Should show: Docker version 20.x or higher

# Test Docker works
docker ps
# Should list running containers (or show empty table)
```

### Test 3: AWS CLI Access

```bash
# On your local machine
aws ec2 describe-instances --instance-ids YOUR-INSTANCE-ID

# Should return instance details
# If it fails, your AWS credentials are wrong
```

---

## ❓ Still Having Issues?

### Common Errors:

**"Permission denied (publickey)"**
- Wrong SSH key configured
- Key doesn't match the EC2 instance
- Key file permissions wrong (should be 600)

**"Connection timeout"**
- EC2 instance is stopped
- Security group doesn't allow SSH (port 22)
- Wrong EC2 IP address

**"Failed to download from S3"**
- S3 bucket doesn't exist
- IAM user doesn't have S3 permissions
- Wrong bucket name in secrets

**"Docker build failed"**
- Not enough disk space on EC2
- Run: `docker system prune -a -f`
- Check: `df -h`

---

## 🎯 Next Steps

1. ✅ Configure `EC2_SSH_PRIVATE_KEY` in GitHub Secrets
2. ✅ Verify other required secrets
3. ✅ Run "Fast Deploy" workflow
4. ✅ Monitor deployment in GitHub Actions
5. ✅ Test: `curl http://YOUR-EC2-IP/api/health`

Once secrets are configured, deployment should work! 🚀
