# GitHub Secrets Configuration

Before deploying, add these secrets to your GitHub repository:
**Settings > Secrets and variables > Actions > New repository secret**

## Required Secrets (Already Configured ✅)

```
AWS_ACCESS_KEY_ID          = Your AWS access key
AWS_SECRET_ACCESS_KEY      = Your AWS secret key
AWS_REGION                 = us-east-1 (or your region)
S3_BUCKET_NAME            = autoapply-production
EC2_INSTANCE_ID           = i-xxxxxxxxxxxxxxxxx
CLAUDE_API_KEY            = sk-ant-api03-xxx (Anthropic API key)
NEXTAUTH_URL              = https://your-domain.com
SENDGRID_API_KEY          = SG.xxx
SENDGRID_FROM_EMAIL       = noreply@your-domain.com
TWILIO_ACCOUNT_SID        = ACxxx
TWILIO_AUTH_TOKEN         = xxx
TWILIO_MESSAGING_SERVICE_SID = MGxxx
TWILIO_PHONE_NUMBER       = +1234567890
```

## Optional Secrets (Add if using Google OAuth)

```
GOOGLE_CLIENT_ID          = xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET      = GOCSPX-xxx
```

## Auto-Generated Secrets (Not needed in GitHub)

These are auto-generated during deployment:
- JWT_ACCESS_SECRET (openssl rand -hex 32)
- JWT_REFRESH_SECRET (openssl rand -hex 32)
- ENCRYPTION_KEY (openssl rand -hex 32)

## EC2 Instance Requirements

Your EC2 instance must have:
1. **AWS Systems Manager (SSM) Agent** installed and running
2. **IAM Instance Profile** with permissions:
   - `AmazonSSMManagedInstanceCore` (for SSM)
   - S3 read/write to your bucket
3. **Docker** installed
4. **Security Group** allowing:
   - Inbound: 80 (HTTP), 443 (HTTPS)
   - Outbound: All

## Verify EC2 SSM Access

```bash
# Check if instance is managed by SSM
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=YOUR_INSTANCE_ID" \
  --region us-east-1

# Should return instance details if SSM is working
```

## Deploy

Once all secrets are configured:

```bash
git add .
git commit -m "production: ready for deployment"
git push origin main
```

Watch the deployment: https://github.com/Aarav500/Autoapply/actions
