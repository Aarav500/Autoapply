#!/bin/bash
# AWS Infrastructure Setup Script for College Essay App
# This script sets up the required AWS resources for the application

set -e

echo "🚀 Setting up AWS infrastructure for College Essay App..."

# Configuration
APP_NAME="college-essay-app"
REGION="${AWS_REGION:-us-west-2}"
BUCKET_NAME="${S3_BUCKET_NAME:-college-essay-app-documents}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check AWS credentials
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials not configured. Run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}AWS credentials verified.${NC}"

# Create S3 bucket for document storage
echo "Creating S3 bucket..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo -e "${YELLOW}Bucket $BUCKET_NAME already exists.${NC}"
else
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION"
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --versioning-configuration Status=Enabled
    
    # Set CORS policy for browser uploads
    cat > /tmp/cors-config.json << EOF
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["ETag"]
        }
    ]
}
EOF
    aws s3api put-bucket-cors \
        --bucket "$BUCKET_NAME" \
        --cors-configuration file:///tmp/cors-config.json
    
    # Set lifecycle policy for temporary files
    cat > /tmp/lifecycle-config.json << EOF
{
    "Rules": [
        {
            "ID": "Delete temporary files after 30 days",
            "Status": "Enabled",
            "Filter": {
                "Prefix": "temp/"
            },
            "Expiration": {
                "Days": 30
            }
        }
    ]
}
EOF
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "$BUCKET_NAME" \
        --lifecycle-configuration file:///tmp/lifecycle-config.json
    
    echo -e "${GREEN}S3 bucket created: $BUCKET_NAME${NC}"
fi

# Create security group for EC2
echo "Creating security group..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)
SG_NAME="${APP_NAME}-sg"

if aws ec2 describe-security-groups --group-names "$SG_NAME" 2>/dev/null; then
    echo -e "${YELLOW}Security group $SG_NAME already exists.${NC}"
    SG_ID=$(aws ec2 describe-security-groups --group-names "$SG_NAME" --query "SecurityGroups[0].GroupId" --output text)
else
    SG_ID=$(aws ec2 create-security-group \
        --group-name "$SG_NAME" \
        --description "Security group for College Essay App" \
        --vpc-id "$VPC_ID" \
        --query "GroupId" --output text)
    
    # Allow SSH (22)
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp --port 22 --cidr 0.0.0.0/0
    
    # Allow HTTP (80)
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp --port 80 --cidr 0.0.0.0/0
    
    # Allow HTTPS (443)
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp --port 443 --cidr 0.0.0.0/0
    
    # Allow Next.js dev server (3000)
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp --port 3000 --cidr 0.0.0.0/0
    
    echo -e "${GREEN}Security group created: $SG_ID${NC}"
fi

# Create IAM role for EC2
echo "Creating IAM role..."
ROLE_NAME="${APP_NAME}-ec2-role"

if aws iam get-role --role-name "$ROLE_NAME" 2>/dev/null; then
    echo -e "${YELLOW}IAM role $ROLE_NAME already exists.${NC}"
else
    # Trust policy for EC2
    cat > /tmp/trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "ec2.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file:///tmp/trust-policy.json
    
    # S3 access policy
    cat > /tmp/s3-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::$BUCKET_NAME",
                "arn:aws:s3:::$BUCKET_NAME/*"
            ]
        }
    ]
}
EOF

    aws iam put-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-name "${APP_NAME}-s3-access" \
        --policy-document file:///tmp/s3-policy.json
    
    # Create instance profile
    aws iam create-instance-profile --instance-profile-name "$ROLE_NAME" || true
    aws iam add-role-to-instance-profile \
        --instance-profile-name "$ROLE_NAME" \
        --role-name "$ROLE_NAME" || true
    
    echo -e "${GREEN}IAM role created: $ROLE_NAME${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}AWS infrastructure setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Resources created:"
echo "  - S3 Bucket: $BUCKET_NAME"
echo "  - Security Group: $SG_ID"
echo "  - IAM Role: $ROLE_NAME"
echo ""
echo "Next steps:"
echo "  1. Set environment variables in .env.local"
echo "  2. Run ./deploy/deploy.sh to deploy the application"
