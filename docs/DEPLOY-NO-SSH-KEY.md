# Deploy Without SSH Keys - SSM Method

## ✅ Perfect for You!

If you've been deploying to EC2 without SSH keys before, you're likely using **AWS Systems Manager Session Manager**. This is now the **recommended deployment method**!

---

## 🚀 Quick Deploy (No SSH Key Required)

### Method 1: Automatic on Push (RECOMMENDED)

**The easiest way** - just push your code:

```bash
git push origin main
```

✅ This automatically triggers the SSM deployment workflow
✅ Takes 10-15 minutes
✅ No SSH keys needed
✅ Builds on GitHub's fast runners
✅ Deploys via AWS Systems Manager

### Method 2: Manual Trigger

1. Go to: https://github.com/Aarav500/Autoapply/actions
2. Click **"Deploy via SSM (No SSH Key Required)"**
3. Click **"Run workflow"** dropdown → **"Run workflow"**
4. Wait 10-15 minutes
5. ✅ Done!

---

## 📋 Required GitHub Secrets

Make sure these are configured:

**Go to:** https://github.com/Aarav500/Autoapply/settings/secrets/actions

| Secret Name | Example | Required? |
|-------------|---------|-----------|
| `EC2_INSTANCE_ID` | i-0ac8fbf952ab92a65 | ✅ YES |
| `AWS_ACCESS_KEY_ID` | AKIAIOSFODNN7EXAMPLE | ✅ YES |
| `AWS_SECRET_ACCESS_KEY` | wJalrXUtn... | ✅ YES |
| `AWS_REGION` | us-east-1 | ✅ YES |
| `S3_BUCKET_NAME` | autoapply-production | ✅ YES |
| `CLAUDE_API_KEY` | sk-ant-api03-... | ✅ YES |
| `NEXTAUTH_URL` | http://YOUR-EC2-IP | ✅ YES |
| `GOOGLE_CLIENT_ID` | (optional) | ⬜ No |
| `GOOGLE_CLIENT_SECRET` | (optional) | ⬜ No |
| `TWILIO_ACCOUNT_SID` | (optional) | ⬜ No |

**Notice:** `EC2_SSH_PRIVATE_KEY` is **NOT required** for this method! 🎉

---

## 🔍 How It Works

```
1. You push code to GitHub
   ↓
2. GitHub Actions builds Next.js on fast runners (1-2 min)
   ↓
3. Packages built .next folder and uploads to S3
   ↓
4. Sends SSM command to EC2 instance
   ↓
5. EC2 downloads package from S3
   ↓
6. Builds minimal Docker image (<1 min)
   ↓
7. Starts new container
   ↓
8. Health check passes
   ↓
9. ✅ Deployment complete!
```

**Total time:** 10-15 minutes

---

## ✅ Verify It's Working

### Check Deployment Status

1. **GitHub Actions:**
   - Go to: https://github.com/Aarav500/Autoapply/actions
   - Click on the latest workflow run
   - Monitor each step in real-time

2. **Health Check:**
   ```bash
   # Replace with your EC2 IP
   curl http://YOUR-EC2-IP/api/health

   # Should return:
   # {"success":true,"data":{"status":"ok",...}}
   ```

3. **Container Status:**
   ```bash
   # Connect via SSM Session Manager (no SSH key needed!)
   aws ssm start-session --target YOUR-INSTANCE-ID

   # Once connected:
   docker ps | grep autoapply
   docker logs autoapply --tail 50
   ```

---

## 🎯 Deployment Workflow Files

Your repository now has **3 deployment methods**:

| Workflow | File | SSH Key? | Speed | Auto-trigger? |
|----------|------|----------|-------|---------------|
| **SSM Deploy** ⭐ | `.github/workflows/deploy-ssm.yml` | ❌ No | Fast | ✅ Yes (push to main) |
| Fast Deploy | `.github/workflows/deploy-fast.yml` | ✅ Yes | Fast | Manual only |
| Standard SSH | `.github/workflows/deploy-ssh.yml` | ✅ Yes | Slow | Manual only |

**Recommendation:** Use **SSM Deploy** - it's automatic and requires no SSH keys!

---

## 🔧 Requirements for SSM Method

Your EC2 instance needs:

1. ✅ **SSM Agent installed** (usually pre-installed on Amazon Linux 2, Ubuntu 20.04+)
2. ✅ **IAM Instance Profile** with `AmazonSSMManagedInstanceCore` policy
3. ✅ **Instance registered with SSM** (shows in Systems Manager console)
4. ✅ **Security group allows outbound HTTPS (443)**

**To verify SSM is working:**

```bash
# Run the diagnostic script
./scripts/diagnose-ec2.sh

# Should show:
# ✅ SSM Agent is online
```

If SSM isn't working, see the "Troubleshooting" section below.

---

## 📊 Comparison: SSM vs SSH Methods

| Feature | SSM Deploy | SSH Deploy |
|---------|------------|------------|
| SSH Key Required | ❌ No | ✅ Yes |
| Auto-deploy on push | ✅ Yes | ❌ No |
| Setup complexity | Easy | Medium |
| Connection method | AWS SSM | Direct SSH |
| Session recording | ✅ Yes (CloudTrail) | ❌ No |
| Build location | GitHub | GitHub |
| Speed | Fast | Fast |
| Best for | Production | Manual deploys |

---

## 🐛 Troubleshooting

### Error: "SSM command fails immediately"

**Problem:** SSM Agent not running or not configured

**Fix:**
```bash
# Connect via any method and run:
sudo snap install amazon-ssm-agent --classic
sudo snap start amazon-ssm-agent
sudo snap services amazon-ssm-agent
```

### Error: "Instance not found in SSM"

**Problem:** IAM instance profile missing SSM policy

**Fix:**
1. Go to EC2 Console → Instances
2. Select your instance
3. Actions → Security → Modify IAM role
4. Attach role with `AmazonSSMManagedInstanceCore` policy

### Error: "Failed to download from S3"

**Problem:** AWS credentials don't have S3 access

**Fix:**
1. Check IAM user has these permissions:
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:ListBucket`
2. Verify bucket name is correct in secrets

### Error: "Health check failed"

**Problem:** Application started but has errors

**Debug:**
```bash
# Connect via SSM
aws ssm start-session --target YOUR-INSTANCE-ID

# Check logs
docker logs autoapply --tail 100

# Check environment variables
docker inspect autoapply | grep -A 30 Env
```

---

## 🎯 Quick Start Checklist

- [ ] All required secrets configured in GitHub
- [ ] EC2 instance is running
- [ ] SSM Agent is installed and running (verify with diagnostic script)
- [ ] IAM instance profile has SSM policy
- [ ] S3 bucket exists and is accessible
- [ ] Docker is installed on EC2

**Once verified:**

```bash
git push origin main
```

Wait 10-15 minutes and your app will be live! 🚀

---

## 💡 Pro Tips

1. **Monitor deployments:** Watch GitHub Actions tab in real-time
2. **Check logs:** Use SSM Session Manager to view container logs
3. **Quick rollback:** Redeploy a previous commit via GitHub UI
4. **Health monitoring:** Set up CloudWatch alarms for `/api/health`
5. **Automatic deploys:** Every push to main triggers deployment

---

## 🎉 You're All Set!

Your application is configured for **automatic, keyless deployments**!

Just push your code and it deploys automatically. No SSH keys, no manual steps needed!

```bash
git add .
git commit -m "Your changes"
git push origin main

# Wait 10-15 minutes
# ✅ Deployed!
```
