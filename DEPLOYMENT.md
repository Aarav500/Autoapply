# Autoapply Deployment Guide

## Prerequisites

### GitHub Secrets
Configure these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

```
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
AWS_REGION=us-east-1
S3_BUCKET_NAME=autoapply-production
EC2_INSTANCE_ID=<your-ec2-instance-id>
CLAUDE_API_KEY=<your-anthropic-api-key>
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-secret>
NEXTAUTH_URL=https://your-domain.com
SENDGRID_API_KEY=<your-sendgrid-key>
SENDGRID_FROM_EMAIL=noreply@your-domain.com
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
TWILIO_MESSAGING_SERVICE_SID=<your-messaging-service-sid>
TWILIO_PHONE_NUMBER=<your-twilio-phone>
```

### AWS Infrastructure Setup

#### 1. S3 Bucket
```bash
aws s3 mb s3://autoapply-production --region us-east-1
aws s3api put-bucket-versioning \
  --bucket autoapply-production \
  --versioning-configuration Status=Enabled
```

#### 2. ECR Repository
```bash
aws ecr create-repository \
  --repository-name autoapply \
  --region us-east-1
```

#### 3. EC2 Instance
- **AMI**: Amazon Linux 2023
- **Instance Type**: t3.medium (minimum)
- **Storage**: 30GB EBS
- **Security Group**:
  - Inbound: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (Next.js)
  - Outbound: All
- **IAM Role**: EC2 role with permissions to:
  - ECR pull images
  - S3 read/write to autoapply-production bucket

#### 4. EC2 Instance Configuration
SSH into your EC2 instance and run:

```bash
# Install Docker
sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Create environment file
cat > /home/ec2-user/.env.production << 'EOF'
NODE_ENV=production
APP_URL=https://your-domain.com

JWT_ACCESS_SECRET=<generate-with-openssl-rand-base64-32>
JWT_REFRESH_SECRET=<generate-with-openssl-rand-base64-32>
ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>

AWS_ACCESS_KEY_ID=<your-aws-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret>
AWS_REGION=us-east-1
S3_BUCKET_NAME=autoapply-production

ANTHROPIC_API_KEY=<your-claude-key>

GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/oauth/google/callback

TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
TWILIO_PHONE_NUMBER=<your-phone>
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_MESSAGING_SERVICE_SID=<your-messaging-sid>

SENDGRID_API_KEY=<your-sendgrid-key>
SENDGRID_FROM_EMAIL=noreply@your-domain.com

LOG_LEVEL=info
EOF

# Set correct permissions
chmod 600 /home/ec2-user/.env.production
```

## Deployment

### Automatic Deployment (via GitHub Actions)
1. Push to `main` branch
2. GitHub Actions will:
   - Build Docker image
   - Push to ECR
   - Deploy to EC2
   - Run health check

### Manual Deployment

#### Build and push Docker image:
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t autoapply .

# Tag image
docker tag autoapply:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/autoapply:latest

# Push image
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/autoapply:latest
```

#### Deploy on EC2:
```bash
# SSH to EC2
ssh ec2-user@<ec2-public-ip>

# Pull image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker pull <account-id>.dkr.ecr.us-east-1.amazonaws.com/autoapply:latest

# Stop old container
docker stop autoapply || true
docker rm autoapply || true

# Run new container
docker run -d \
  --name autoapply \
  -p 3000:3000 \
  --env-file /home/ec2-user/.env.production \
  --restart unless-stopped \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/autoapply:latest

# Check logs
docker logs -f autoapply
```

## Post-Deployment

### Set up SSL with Let's Encrypt
```bash
# Install Nginx
sudo yum install -y nginx

# Configure Nginx reverse proxy (see nginx.conf example below)
sudo nano /etc/nginx/conf.d/autoapply.conf

# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

### Nginx Configuration Example
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring

### Health Check
```bash
curl https://your-domain.com/api/health
```

### Container Logs
```bash
docker logs autoapply
docker logs -f autoapply  # Follow logs
```

### Scheduler Status
```bash
curl https://your-domain.com/api/scheduler/status
```

## Troubleshooting

### Container won't start
```bash
# Check Docker logs
docker logs autoapply

# Check environment variables
docker exec autoapply env | grep -E "AWS|ANTHROPIC|TWILIO"

# Restart container
docker restart autoapply
```

### S3 connection issues
- Verify EC2 IAM role has S3 permissions
- Check S3 bucket name in environment
- Test S3 access: `aws s3 ls s3://autoapply-production`

### Build fails
- Check Next.js build locally: `npm run build`
- Verify all dependencies are in package.json
- Check Node version matches Dockerfile (20)

## Rollback

```bash
# SSH to EC2
ssh ec2-user@<ec2-ip>

# Pull previous image version
docker pull <account-id>.dkr.ecr.us-east-1.amazonaws.com/autoapply:<previous-sha>

# Stop current container
docker stop autoapply && docker rm autoapply

# Run previous version
docker run -d \
  --name autoapply \
  -p 3000:3000 \
  --env-file /home/ec2-user/.env.production \
  --restart unless-stopped \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/autoapply:<previous-sha>
```
