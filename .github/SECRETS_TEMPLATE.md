# Required GitHub Secrets for Deployment
# Go to: https://github.com/Aarav500/college-essay-app/settings/secrets/actions

## AWS Credentials (Required)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

## Claude API (Required)
CLAUDE_API_KEY=your_anthropic_api_key

## S3 Bucket (Required)
S3_BUCKET_NAME=college-essay-app-bucket

## Database (Required for production)
DATABASE_URL=postgresql://user:pass@host:5432/db

## Optional - EC2 Deployment
EC2_INSTANCE_ID=i-xxxxxxxxxxxx

## Optional - ECS/Docker Deployment
ECR_REGISTRY=123456789.dkr.ecr.us-west-2.amazonaws.com
ECS_CLUSTER=college-essay-cluster

# ========================================
# HOW TO SET UP GITHUB SECRETS
# ========================================
# 
# 1. Go to your repo: https://github.com/Aarav500/college-essay-app
# 2. Click "Settings" tab
# 3. Click "Secrets and variables" → "Actions"
# 4. Click "New repository secret"
# 5. Add each secret listed above
#
# ========================================
# GETTING YOUR API KEYS
# ========================================
#
# Claude API:
#   1. Go to https://console.anthropic.com
#   2. Create account / Sign in
#   3. Go to "API Keys"
#   4. Create new key
#
# AWS Credentials:
#   1. Go to AWS Console → IAM
#   2. Create new user with programmatic access
#   3. Attach policies: S3FullAccess, EC2FullAccess (or your custom policy)
#   4. Save the Access Key ID and Secret
#
# Database URL (if using AWS RDS):
#   postgresql://username:password@your-db.region.rds.amazonaws.com:5432/dbname
