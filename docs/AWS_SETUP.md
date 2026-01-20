# AWS Infrastructure Setup for AutoApply

## 🖥️ EC2 Instance (Ubuntu)

### Recommended: t3.small
| Spec | Value |
|------|-------|
| **Instance Type** | `t3.small` |
| **vCPUs** | 2 |
| **Memory** | 2 GB |
| **Storage** | 20 GB SSD (gp3) |
| **OS** | Ubuntu 22.04 LTS |
| **Region** | `us-east-1` |
| **Cost** | ~$15/month |

**Budget Alternative:** `t3.micro` (~$8/month) - Good for development/testing

### EC2 Setup Commands (after SSH):
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx as reverse proxy
sudo apt install -y nginx

# Clone your repo
git clone https://github.com/Aarav500/Autoapply.git
cd Autoapply

# Install dependencies
npm ci --production

# Build the app
npm run build

# Start with PM2
pm2 start npm --name "autoapply" -- start

# Auto-start on reboot
pm2 save
pm2 startup
```

---

## 🪣 S3 Bucket

### Configuration
| Setting | Value |
|---------|-------|
| **Bucket Name** | `autoapply-assets-{your-id}` |
| **Region** | `us-east-1` (N. Virginia) |
| **Storage Class** | Standard |
| **Versioning** | Disabled (save costs) |
| **Public Access** | Block all |
| **Cost** | ~$0.50-2/month |

### What to store in S3:
- User uploaded transcripts/resumes
- Application documents
- Backup data exports

---

## ❌ No PostgreSQL Needed!

The app uses **localStorage** for data storage:
- Essays and drafts
- User profile
- Saved jobs
- Application status

**Benefits:**
- No database costs ($0)
- Simpler deployment
- Faster setup
- Data persists in browser

**If you need database later:**
- Free options: Supabase, Neon, PlanetScale
- Or add RDS later

---

## 💰 Total Monthly Cost

| Service | Monthly Cost |
|---------|-------------|
| EC2 t3.small | ~$15 |
| S3 (5GB storage) | ~$0.50 |
| Data Transfer | ~$1-5 |
| **Total** | **~$17-20/month** |

### 🎁 Free Tier (first 12 months):
- 750 hours/month EC2 t2.micro or t3.micro
- 5GB S3 storage
- **Could be $0/month with t3.micro!**

---

## 🔐 Security Groups

### EC2 Security Group:
| Type | Port | Source |
|------|------|--------|
| SSH | 22 | Your IP only |
| HTTP | 80 | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |

---

## 📋 Setup Checklist

### Step 1: Create IAM User
1. Go to IAM Console
2. Create user: `autoapply-deploy`
3. Attach policy: `AmazonS3FullAccess`
4. Save Access Key ID and Secret

### Step 2: Launch EC2
1. Region: `us-east-1`
2. Choose Ubuntu 22.04 LTS AMI
3. Select t3.small (or t3.micro for budget)
4. Create/select key pair for SSH
5. Security group: SSH (22), HTTP (80), HTTPS (443)
6. Add 20GB gp3 storage
7. Launch!

### Step 3: Create S3 Bucket
1. Region: `us-east-1`
2. Create bucket with unique name
3. Block all public access
4. Enable server-side encryption

### Step 4: Add GitHub Secrets
Add these to https://github.com/Aarav500/Autoapply/settings/secrets/actions:

```
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxx
AWS_REGION=us-east-1
S3_BUCKET_NAME=autoapply-assets-your-id
CLAUDE_API_KEY=sk-ant-api03-xxxxx
```

**Note: DATABASE_URL is NOT required!**

---

## 🚀 Quick Summary

| What | Value |
|------|-------|
| EC2 | t3.small, Ubuntu 22.04, us-east-1 |
| S3 | us-east-1, private bucket |
| Database | None needed (localStorage) |
| Cost | ~$17-20/month (or $0 with free tier) |
