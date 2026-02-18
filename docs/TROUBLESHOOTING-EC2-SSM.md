# EC2 SSM Connectivity Troubleshooting Guide

## Problem
SSM commands fail immediately with status "Failed" and no output, preventing automated deployments.

## Root Causes
1. SSM Agent not installed or not running
2. Instance IAM role missing required permissions
3. Network connectivity issues (security groups, VPC endpoints)
4. SSM Agent outdated or corrupted

---

## Step 1: Check Instance IAM Role

### Via AWS Console
1. Go to EC2 Console → Instances → Select your instance
2. Click on "Security" tab → Look at "IAM Role"
3. Click on the IAM role name → Check attached policies
4. Ensure **`AmazonSSMManagedInstanceCore`** policy is attached

### Via AWS CLI
```bash
# Get instance profile
aws ec2 describe-instances \
  --instance-ids i-0ac8fbf952ab92a65 \
  --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' \
  --output text

# Get role name from instance profile
PROFILE_NAME=$(aws ec2 describe-instances \
  --instance-ids i-0ac8fbf952ab92a65 \
  --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' \
  --output text | cut -d'/' -f2)

# List attached policies
aws iam list-attached-role-policies --role-name $PROFILE_NAME

# Check for AmazonSSMManagedInstanceCore
aws iam list-attached-role-policies --role-name $PROFILE_NAME \
  --query 'AttachedPolicies[?PolicyName==`AmazonSSMManagedInstanceCore`]'
```

### Fix: Attach Missing Policy
```bash
# If missing, attach the policy
aws iam attach-role-policy \
  --role-name YOUR_EC2_ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
```

**OR via Console:**
1. IAM Console → Roles → Select your EC2 role
2. Click "Attach policies"
3. Search for `AmazonSSMManagedInstanceCore`
4. Select and attach

---

## Step 2: Check SSM Agent Status (Requires SSH Access)

### Connect to Instance
```bash
# Get instance public IP
aws ec2 describe-instances \
  --instance-ids i-0ac8fbf952ab92a65 \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text

# SSH into instance (Ubuntu)
ssh -i ~/.ssh/your-key.pem ubuntu@<PUBLIC_IP>

# OR (Amazon Linux)
ssh -i ~/.ssh/your-key.pem ec2-user@<PUBLIC_IP>
```

### Check SSM Agent
```bash
# Check status
sudo systemctl status amazon-ssm-agent

# Expected output: "active (running)"
# If not running, you'll see "inactive (dead)" or "failed"
```

### Fix: Restart SSM Agent
```bash
# Start the agent
sudo systemctl start amazon-ssm-agent

# Enable auto-start on boot
sudo systemctl enable amazon-ssm-agent

# Verify it's running
sudo systemctl status amazon-ssm-agent

# Check logs if still failing
sudo journalctl -u amazon-ssm-agent -n 50
```

### Fix: Install SSM Agent (if not installed)

**Ubuntu/Debian:**
```bash
# Install via Snap (recommended for Ubuntu 20.04+)
sudo snap install amazon-ssm-agent --classic
sudo snap start amazon-ssm-agent

# OR install via package manager
wget https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/debian_amd64/amazon-ssm-agent.deb
sudo dpkg -i amazon-ssm-agent.deb
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent
```

**Amazon Linux 2:**
```bash
sudo yum install -y amazon-ssm-agent
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent
```

### Fix: Update SSM Agent (if outdated)
```bash
# Ubuntu
sudo snap refresh amazon-ssm-agent

# Amazon Linux
sudo yum update -y amazon-ssm-agent
sudo systemctl restart amazon-ssm-agent
```

---

## Step 3: Verify SSM Connectivity

### Check from AWS Console
1. Go to AWS Systems Manager → Fleet Manager
2. Look for your instance ID in the list
3. If visible, SSM is working
4. If not visible, continue troubleshooting

### Check via CLI
```bash
# List managed instances
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=i-0ac8fbf952ab92a65" \
  --query 'InstanceInformationList[0].[PingStatus, LastPingDateTime, PlatformName]' \
  --output table

# Expected: PingStatus = "Online"
# If empty or "ConnectionLost", SSM agent can't connect
```

### Test Simple Command
```bash
# Send a test command
COMMAND_ID=$(aws ssm send-command \
  --instance-ids i-0ac8fbf952ab92a65 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["echo SSM is working", "whoami", "date"]' \
  --output text --query 'Command.CommandId')

# Wait 10 seconds
sleep 10

# Check result
aws ssm get-command-invocation \
  --command-id $COMMAND_ID \
  --instance-id i-0ac8fbf952ab92a65 \
  --query '[Status, StandardOutputContent]' \
  --output text
```

---

## Step 4: Check Network Configuration

### Security Group Rules
SSM Agent needs **outbound** internet access to reach AWS SSM endpoints.

**Check current rules:**
```bash
# Get security group ID
SG_ID=$(aws ec2 describe-instances \
  --instance-ids i-0ac8fbf952ab92a65 \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text)

# Check outbound rules
aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --query 'SecurityGroups[0].IpPermissionsEgress' \
  --output table
```

**Required:** At minimum, allow outbound HTTPS (port 443) to `0.0.0.0/0` or specific SSM endpoints.

### VPC Endpoints (for private subnets)
If your instance is in a **private subnet** (no internet gateway), you need VPC endpoints:

```bash
# List VPC endpoints
aws ec2 describe-vpc-endpoints \
  --filters "Name=vpc-id,Values=YOUR_VPC_ID" \
  --query 'VpcEndpoints[*].[ServiceName, State]' \
  --output table
```

**Required endpoints for private subnets:**
- `com.amazonaws.<region>.ssm`
- `com.amazonaws.<region>.ssmmessages`
- `com.amazonaws.<region>.ec2messages`

**Create missing endpoints:**
```bash
# Get VPC ID and subnet ID
VPC_ID=$(aws ec2 describe-instances \
  --instance-ids i-0ac8fbf952ab92a65 \
  --query 'Reservations[0].Instances[0].VpcId' \
  --output text)

SUBNET_ID=$(aws ec2 describe-instances \
  --instance-ids i-0ac8fbf952ab92a65 \
  --query 'Reservations[0].Instances[0].SubnetId' \
  --output text)

# Create SSM endpoint
aws ec2 create-vpc-endpoint \
  --vpc-id $VPC_ID \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.us-east-1.ssm \
  --subnet-ids $SUBNET_ID \
  --security-group-ids $SG_ID

# Repeat for ssmmessages and ec2messages
```

---

## Step 5: Check Instance Metadata Service

SSM Agent needs access to instance metadata (IMDSv2).

### Test from instance (via SSH)
```bash
# Get token (IMDSv2)
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

# Get instance ID
curl -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-id

# Get IAM role
curl -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/iam/security-credentials/

# If these fail, metadata service is blocked
```

---

## Step 6: Alternative Deployment Method (SSH-based)

If SSM continues to fail, use SSH-based deployment:

### Create SSH Deploy Workflow
```yaml
# .github/workflows/deploy-ssh.yml
name: Deploy via SSH

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_PUBLIC_IP }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_PRIVATE_KEY }}
          script: |
            cd /home/ubuntu/autoapply
            git pull origin main
            docker build -t autoapply:latest .
            docker stop autoapply || true
            docker rm autoapply || true
            docker run -d --name autoapply --restart unless-stopped -p 80:3000 \
              -e NODE_ENV=production \
              -e AWS_ACCESS_KEY_ID=${{ secrets.AWS_ACCESS_KEY_ID }} \
              -e AWS_SECRET_ACCESS_KEY=${{ secrets.AWS_SECRET_ACCESS_KEY }} \
              # ... other env vars
              autoapply:latest
```

---

## Quick Diagnostic Script

Run this script to check all common issues:

```bash
#!/bin/bash
# diagnose-ec2.sh

INSTANCE_ID="i-0ac8fbf952ab92a65"

echo "=== EC2 SSM Diagnostics ==="
echo ""

echo "1. Instance Status:"
aws ec2 describe-instance-status \
  --instance-ids "$INSTANCE_ID" \
  --query 'InstanceStatuses[0].[InstanceStatus.Status, SystemStatus.Status]' \
  --output table || echo "❌ Failed"

echo ""
echo "2. IAM Role:"
aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' \
  --output text || echo "❌ No IAM role attached"

echo ""
echo "3. SSM Agent Status:"
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
  --query 'InstanceInformationList[0].[PingStatus, LastPingDateTime, PlatformName, AgentVersion]' \
  --output table || echo "❌ Instance not registered with SSM"

echo ""
echo "4. Test Command:"
COMMAND_ID=$(aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["echo \"SSM is working\""]' \
  --output text --query 'Command.CommandId' 2>/dev/null)

if [ -n "$COMMAND_ID" ]; then
  sleep 10
  STATUS=$(aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --query 'Status' \
    --output text 2>/dev/null)

  if [ "$STATUS" = "Success" ]; then
    echo "✅ SSM is working correctly"
  else
    echo "❌ Test command failed with status: $STATUS"
  fi
else
  echo "❌ Could not send test command"
fi

echo ""
echo "=== Diagnostics Complete ==="
```

---

## Common Error Messages

### "No Instance ID found"
- **Cause:** Instance ID is incorrect or instance doesn't exist
- **Fix:** Verify instance ID in AWS Console

### "AccessDeniedException"
- **Cause:** IAM role missing permissions or AWS credentials invalid
- **Fix:** Attach `AmazonSSMManagedInstanceCore` policy to instance role

### "InvalidInstanceId"
- **Cause:** Instance not registered with SSM
- **Fix:** Install/restart SSM Agent on instance

### Command stays "Pending" forever
- **Cause:** SSM Agent not running or can't connect to AWS
- **Fix:** Check agent status and network connectivity

### "Failed" with no output
- **Cause:** SSM Agent not responding (most common)
- **Fix:** SSH into instance, check/restart SSM Agent

---

## Next Steps After Fix

Once SSM is working:

1. **Re-run diagnostic workflow:**
   ```bash
   # Via GitHub Actions UI
   Actions → "Diagnose EC2 SSM Connection" → Run workflow
   ```

2. **Test simple command:**
   ```bash
   aws ssm send-command \
     --instance-ids i-0ac8fbf952ab92a65 \
     --document-name "AWS-RunShellScript" \
     --parameters 'commands=["echo SSM is working"]'
   ```

3. **Retry deployment:**
   ```bash
   git push origin main
   # Or manually trigger: Actions → Deploy to EC2 → Run workflow
   ```

---

## Support Resources

- [AWS SSM Prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-prereqs.html)
- [Troubleshooting SSM Agent](https://docs.aws.amazon.com/systems-manager/latest/userguide/troubleshooting-ssm-agent.html)
- [SSM VPC Endpoints](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)
