#!/bin/bash
# Deployment Script for College Essay App to AWS EC2
# This script deploys the application to an EC2 instance

set -e

echo "🚀 Deploying College Essay App to AWS..."

# Configuration
APP_NAME="college-essay-app"
REGION="${AWS_REGION:-us-west-2}"
INSTANCE_TYPE="${EC2_INSTANCE_TYPE:-t3.small}"
KEY_NAME="${EC2_KEY_NAME:-college-essay-app-key}"
AMI_ID="${AMI_ID:-ami-0c55b159cbfafe1f0}" # Amazon Linux 2

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Project directory: $PROJECT_DIR"

# Check if EC2 instance already exists
INSTANCE_ID=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=$APP_NAME" "Name=instance-state-name,Values=running" \
    --query "Reservations[0].Instances[0].InstanceId" \
    --output text 2>/dev/null)

if [ "$INSTANCE_ID" != "None" ] && [ -n "$INSTANCE_ID" ]; then
    echo -e "${YELLOW}Found existing instance: $INSTANCE_ID${NC}"
else
    echo "Creating new EC2 instance..."
    
    # Get security group ID
    SG_ID=$(aws ec2 describe-security-groups \
        --group-names "${APP_NAME}-sg" \
        --query "SecurityGroups[0].GroupId" \
        --output text)
    
    # User data script for instance initialization
    cat > /tmp/user-data.sh << 'EOF'
#!/bin/bash
# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs git

# Install PM2 globally
sudo npm install -g pm2

# Create app directory
sudo mkdir -p /opt/college-essay-app
sudo chown ec2-user:ec2-user /opt/college-essay-app

# Install nginx
sudo amazon-linux-extras install nginx1 -y
sudo systemctl enable nginx
sudo systemctl start nginx
EOF

    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id "$AMI_ID" \
        --instance-type "$INSTANCE_TYPE" \
        --key-name "$KEY_NAME" \
        --security-group-ids "$SG_ID" \
        --iam-instance-profile Name="${APP_NAME}-ec2-role" \
        --user-data file:///tmp/user-data.sh \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APP_NAME}]" \
        --query "Instances[0].InstanceId" \
        --output text)
    
    echo "Waiting for instance to be running..."
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"
    
    echo -e "${GREEN}EC2 instance created: $INSTANCE_ID${NC}"
fi

# Get instance public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query "Reservations[0].Instances[0].PublicIpAddress" \
    --output text)

echo "Instance public IP: $PUBLIC_IP"

# Build the application
echo "Building application..."
cd "$PROJECT_DIR"
npm run build

# Create deployment package
echo "Creating deployment package..."
tar -czf /tmp/deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.next/cache \
    --exclude=.git \
    .

# Copy to EC2
echo "Copying files to EC2..."
scp -o StrictHostKeyChecking=no \
    -i "$HOME/.ssh/$KEY_NAME.pem" \
    /tmp/deploy.tar.gz \
    ec2-user@$PUBLIC_IP:/opt/college-essay-app/

# Deploy on EC2
echo "Deploying on EC2..."
ssh -o StrictHostKeyChecking=no \
    -i "$HOME/.ssh/$KEY_NAME.pem" \
    ec2-user@$PUBLIC_IP << 'REMOTE_SCRIPT'
cd /opt/college-essay-app
tar -xzf deploy.tar.gz
rm deploy.tar.gz
npm install --production
pm2 stop all || true
pm2 start npm --name "college-essay-app" -- start
pm2 save
REMOTE_SCRIPT

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Application URL: http://$PUBLIC_IP:3000"
echo ""
echo "To view logs: ssh -i ~/.ssh/$KEY_NAME.pem ec2-user@$PUBLIC_IP 'pm2 logs'"
