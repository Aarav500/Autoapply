# SSH Deployment Troubleshooting

## Issue: SSH Connection Timeout

If you see this error:
```
dial tcp X.X.X.X:22: i/o timeout
```

This means GitHub Actions cannot connect to your EC2 instance via SSH.

## Solutions

### 1. Check EC2 Instance State

Make sure your EC2 instance is **running**:

```bash
aws ec2 describe-instances \
  --instance-ids YOUR_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text
```

Should return: `running`

If stopped, start it:
```bash
aws ec2 start-instances --instance-ids YOUR_INSTANCE_ID
```

### 2. Fix Security Group (Most Common Issue)

Your EC2 security group must allow **SSH (port 22)** from GitHub Actions.

**Option A: Allow from anywhere (easiest)**
1. Go to AWS Console → EC2 → Security Groups
2. Select your instance's security group
3. Add inbound rule:
   - Type: SSH
   - Protocol: TCP
   - Port: 22
   - Source: `0.0.0.0/0` (anywhere)

**Option B: Allow only GitHub IPs (more secure)**
1. Get GitHub's IP ranges: https://api.github.com/meta
2. Add inbound rules for each range in the `hooks` section

Using AWS CLI:
```bash
# Get security group ID
SG_ID=$(aws ec2 describe-instances \
  --instance-ids YOUR_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text)

# Add SSH rule
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0
```

### 3. Verify SSH Key

Make sure the `SECRET_KEY` GitHub secret contains your **complete** private SSH key:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
... (full key content) ...
-----END OPENSSH PRIVATE KEY-----
```

**How to add/update:**
1. Go to GitHub → Repository → Settings → Secrets and variables → Actions
2. Update `SECRET_KEY` with your private key
3. Make sure there are **no extra spaces** or newlines at start/end

### 4. Test SSH Connection Manually

From your local machine:
```bash
ssh -i /path/to/key.pem ubuntu@EC2_IP_ADDRESS
```

If this works, the GitHub Actions should work too after fixing security group.

If this fails:
- Check if key permissions are correct: `chmod 600 key.pem`
- Verify username is `ubuntu` (for Ubuntu AMIs) or `ec2-user` (for Amazon Linux)
- Check if key matches the one used when instance was created

### 5. Check Network ACLs

Your VPC's Network ACLs might be blocking traffic:
1. Go to VPC → Network ACLs
2. Find the ACL for your subnet
3. Ensure it allows inbound/outbound on port 22

### 6. Alternative: Use SSM Instead of SSH

If SSH continues to fail, you can use AWS Systems Manager instead (no SSH key needed):

**Requirements:**
1. Install SSM Agent on EC2:
```bash
sudo snap install amazon-ssm-agent --classic
sudo snap start amazon-ssm-agent
```

2. Attach IAM role to instance with `AmazonSSMManagedInstanceCore` policy

3. Use the SSM-based workflow (see `.github/workflows/deploy-ssh.yml` for reference)

## Quick Test

Run this from GitHub Actions to test connectivity:

```yaml
- name: Test SSH
  run: |
    timeout 10 nc -zv YOUR_EC2_IP 22 && echo "✅ SSH port open" || echo "❌ SSH port closed"
```

## Still Having Issues?

Check the workflow run logs for specific error messages:
https://github.com/Aarav500/Autoapply/actions

Common fixes:
- ✅ Security group allows port 22
- ✅ Instance is running
- ✅ SSH key is correct
- ✅ No firewall blocking on instance (check `ufw status`)
