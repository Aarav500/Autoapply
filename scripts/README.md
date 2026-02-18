# Deployment Scripts

## diagnose-ec2.sh

Comprehensive diagnostic tool for EC2 SSM connectivity issues.

### What it checks:
1. ✅ EC2 instance status (running/stopped)
2. ✅ IAM instance profile and SSM policy
3. ✅ SSM Agent registration and ping status
4. ✅ Network connectivity (public/private IPs, security groups)
5. ✅ Live SSM command test

### Usage:

```bash
# Make executable
chmod +x scripts/diagnose-ec2.sh

# Run diagnostics
./scripts/diagnose-ec2.sh

# With custom AWS region
AWS_REGION=us-west-2 ./scripts/diagnose-ec2.sh
```

### Sample Output:

```
╔════════════════════════════════════════════╗
║   EC2 SSM Connectivity Diagnostics         ║
╚════════════════════════════════════════════╝

Instance ID: i-0ac8fbf952ab92a65
Region: us-east-1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. EC2 Instance Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Instance is running

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. IAM Instance Profile
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ IAM role attached: arn:aws:iam::...
✅ AmazonSSMManagedInstanceCore policy attached

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. SSM Agent Registration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SSM Agent is online
   Last ping: 2026-02-17T12:34:56Z
   Platform: Ubuntu
   Agent version: 3.2.1630.0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. Network Connectivity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Public IP: 54.123.45.67
Private IP: 172.31.12.34
✅ Security group allows outbound HTTPS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. SSM Command Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sending test command...
Command ID: abc123...
Waiting 15 seconds for execution...
✅ Test command executed successfully!

Command output:
   │ SSM test successful
   │ Mon Feb 17 12:35:00 UTC 2026
   │ ubuntu

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary & Recommendations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All checks passed! SSM is working correctly.

You can now deploy using:
  git push origin main

╚════════════════════════════════════════════╝
```

### Prerequisites:

- AWS CLI installed and configured
- `jq` command-line JSON processor
- AWS credentials with permissions:
  - `ec2:DescribeInstances`
  - `ec2:DescribeInstanceStatus`
  - `ec2:DescribeSecurityGroups`
  - `ssm:DescribeInstanceInformation`
  - `ssm:SendCommand`
  - `ssm:GetCommandInvocation`
  - `iam:ListAttachedRolePolicies`

### Install jq:

```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# Windows (via Chocolatey)
choco install jq
```

### Troubleshooting:

If the script fails, check:
1. AWS credentials are configured (`aws configure`)
2. Instance ID is correct (currently hardcoded: `i-0ac8fbf952ab92a65`)
3. You have necessary IAM permissions
4. `jq` is installed

### Related Documentation:

- [EC2 Deployment Fix Summary](../docs/EC2-DEPLOYMENT-FIX.md)
- [SSM Troubleshooting Guide](../docs/TROUBLESHOOTING-EC2-SSM.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)
