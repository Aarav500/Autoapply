# EC2 Deployment Fix Summary

## Current Issue

**Deployment Status:** ❌ FAILING
**Error:** SSM commands fail immediately with status "Failed" and no output
**Root Cause:** SSM Agent not responding on EC2 instance

## What I've Created

### 1. Comprehensive Troubleshooting Guide
📄 [docs/TROUBLESHOOTING-EC2-SSM.md](./TROUBLESHOOTING-EC2-SSM.md)

**Contains:**
- Step-by-step diagnosis of all SSM connectivity issues
- IAM role and policy checks
- SSM Agent installation/restart procedures
- Network configuration requirements
- VPC endpoint setup for private subnets
- Common error messages and solutions

### 2. Enhanced Diagnostic Script
📜 [scripts/diagnose-ec2.sh](../scripts/diagnose-ec2.sh)

**Features:**
- Checks EC2 instance status
- Verifies IAM role and AmazonSSMManagedInstanceCore policy
- Tests SSM Agent registration and connectivity
- Validates network configuration
- Sends test SSM command
- Provides actionable recommendations

**Usage:**
```bash
chmod +x scripts/diagnose-ec2.sh
./scripts/diagnose-ec2.sh
```

### 3. SSH-Based Deployment (Backup)
🔧 [.github/workflows/deploy-ssh.yml](../.github/workflows/deploy-ssh.yml)

**When to use:**
- SSM deployment is not working
- Need faster feedback during debugging
- Prefer direct SSH connection

**Prerequisites:**
- SSH key stored in GitHub secrets as `EC2_SSH_PRIVATE_KEY`
- Security group allows SSH (port 22)

**How to trigger:**
1. Go to GitHub Actions tab
2. Select "Deploy via SSH (Backup Method)"
3. Click "Run workflow"

### 4. Deployment Guide
📚 [docs/DEPLOYMENT.md](./DEPLOYMENT.md)

**Comprehensive guide covering:**
- Both deployment methods (SSM and SSH)
- Setup requirements and prerequisites
- Monitoring and troubleshooting
- Rollback procedures
- Best practices

## Immediate Next Steps

### Option 1: Fix SSM (Recommended)

You need to SSH into the EC2 instance and fix the SSM Agent:

```bash
# 1. Get instance public IP
# (Check AWS Console or use diagnostic workflow)

# 2. SSH into instance
ssh -i ~/.ssh/your-key.pem ubuntu@<EC2_PUBLIC_IP>

# 3. Check SSM Agent status
sudo systemctl status snap.amazon-ssm-agent.amazon-ssm-agent.service

# 4. If not running, start it
sudo snap start amazon-ssm-agent

# 5. If not installed, install it
sudo snap install amazon-ssm-agent --classic
sudo snap start amazon-ssm-agent

# 6. Exit and wait 2-3 minutes for agent to register

# 7. Run diagnostic script from local machine
./scripts/diagnose-ec2.sh

# 8. If all checks pass, retry deployment
git push origin main
```

### Option 2: Use SSH Deployment (Quick Fix)

If you need to deploy immediately while fixing SSM:

```bash
# 1. Add SSH private key to GitHub secrets
# GitHub → Settings → Secrets → New repository secret
# Name: EC2_SSH_PRIVATE_KEY
# Value: <paste entire private key>

# 2. Trigger SSH deployment workflow
# GitHub → Actions → "Deploy via SSH" → Run workflow

# 3. Monitor deployment logs
```

### Option 3: Run Diagnostic Workflow

A GitHub Actions workflow is available to diagnose SSM issues:

```bash
# Trigger via GitHub UI:
# Actions → "Diagnose EC2 SSM Connection" → Run workflow
```

## Verification Steps

After fixing SSM Agent:

### 1. Run Diagnostic Script
```bash
./scripts/diagnose-ec2.sh
```

**Expected output:**
```
✅ Instance is running
✅ IAM role attached
✅ AmazonSSMManagedInstanceCore policy attached
✅ SSM Agent is online
✅ Test command executed successfully!
```

### 2. Test Simple SSM Command
```bash
aws ssm send-command \
  --instance-ids i-0ac8fbf952ab92a65 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["echo Working"]' \
  --region us-east-1
```

### 3. Retry Deployment
```bash
git add .
git commit -m "test: verify deployment works"
git push origin main
```

### 4. Check Health Endpoint
```bash
# After successful deployment
curl http://<EC2_PUBLIC_IP>/api/health

# Expected:
# {"status":"ok","timestamp":"..."}
```

## Common Issues and Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| **SSM Agent not running** | `sudo snap start amazon-ssm-agent` |
| **SSM Agent not installed** | `sudo snap install amazon-ssm-agent --classic` |
| **Missing IAM policy** | Attach `AmazonSSMManagedInstanceCore` to instance role |
| **Instance not running** | Start instance in AWS Console |
| **No IAM role** | Create and attach IAM role with SSM policy |
| **Network issues** | Check security group allows outbound HTTPS |

## Files Modified/Created

```
✅ docs/TROUBLESHOOTING-EC2-SSM.md (new)
✅ docs/DEPLOYMENT.md (new)
✅ docs/EC2-DEPLOYMENT-FIX.md (new - this file)
✅ scripts/diagnose-ec2.sh (enhanced)
✅ .github/workflows/deploy-ssh.yml (new)
```

## Resources

- **AWS SSM Prerequisites:** https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-prereqs.html
- **Troubleshooting SSM Agent:** https://docs.aws.amazon.com/systems-manager/latest/userguide/troubleshooting-ssm-agent.html
- **Current deployment workflow:** [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)

## Summary

The SSM-based deployment is failing because the SSM Agent on your EC2 instance is not responding. You have three paths forward:

1. **Fix SSM Agent** (best long-term solution) - SSH into instance, install/start agent
2. **Use SSH deployment** (immediate workaround) - Add SSH key to secrets, use backup workflow
3. **Run diagnostics first** (recommended) - Use diagnostic script to identify exact issue

All the tools and documentation you need are now in place. Choose the approach that works best for your situation.
