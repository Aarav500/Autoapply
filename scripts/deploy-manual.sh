#!/bin/bash
set -e

# Manual deployment script - Run this locally on your machine
# This builds locally and uploads to S3, then triggers EC2 to pull and deploy

echo "╔════════════════════════════════════════════╗"
echo "║   AutoApply Manual Deployment              ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Check required environment variables
REQUIRED_VARS=(
  "AWS_ACCESS_KEY_ID"
  "AWS_SECRET_ACCESS_KEY"
  "AWS_REGION"
  "S3_BUCKET_NAME"
  "EC2_INSTANCE_ID"
)

echo "Checking environment variables..."
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Error: $var is not set"
    echo ""
    echo "Please set required environment variables:"
    echo "  export AWS_ACCESS_KEY_ID=your-key"
    echo "  export AWS_SECRET_ACCESS_KEY=your-secret"
    echo "  export AWS_REGION=us-east-1"
    echo "  export S3_BUCKET_NAME=your-bucket"
    echo "  export EC2_INSTANCE_ID=i-xxxxx"
    exit 1
  fi
done
echo "✅ All environment variables set"
echo ""

# Get commit hash
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "manual-$(date +%s)")
echo "Commit: $COMMIT_SHA"
echo ""

# Build Next.js
echo "════════════════════════════════════════════"
echo "1. Building Next.js Application"
echo "════════════════════════════════════════════"
echo ""

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm ci --prefer-offline --no-audit --no-fund
fi

echo "Building application..."
NODE_ENV=production npm run build

if [ ! -d ".next" ]; then
  echo "❌ Build failed - .next directory not found"
  exit 1
fi

echo "✅ Build successful"
echo ""

# Create deployment package
echo "════════════════════════════════════════════"
echo "2. Creating Deployment Package"
echo "════════════════════════════════════════════"
echo ""

tar --exclude='.git' \
    --exclude='node_modules' \
    --exclude='src' \
    --exclude='*.md' \
    --exclude='.env*' \
    --warning=no-file-changed \
    -czf deploy-manual.tar.gz \
    .next \
    public \
    Dockerfile.fast \
    package.json \
    next.config.ts || [[ $? -eq 1 ]]

PACKAGE_SIZE=$(du -h deploy-manual.tar.gz | cut -f1)
echo "✅ Package created: $PACKAGE_SIZE"
echo ""

# Upload to S3
echo "════════════════════════════════════════════"
echo "3. Uploading to S3"
echo "════════════════════════════════════════════"
echo ""

S3_KEY="deployments/autoapply-manual-$COMMIT_SHA.tar.gz"

aws s3 cp deploy-manual.tar.gz s3://$S3_BUCKET_NAME/$S3_KEY || {
  echo "❌ S3 upload failed"
  echo "Check:"
  echo "  - S3 bucket exists: $S3_BUCKET_NAME"
  echo "  - AWS credentials have s3:PutObject permission"
  exit 1
}

echo "✅ Uploaded to: s3://$S3_BUCKET_NAME/$S3_KEY"
echo ""

# Get EC2 IP
echo "════════════════════════════════════════════"
echo "4. Getting EC2 Instance Information"
echo "════════════════════════════════════════════"
echo ""

EC2_IP=$(aws ec2 describe-instances \
  --instance-ids $EC2_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

EC2_STATE=$(aws ec2 describe-instances \
  --instance-ids $EC2_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text)

echo "Instance ID: $EC2_INSTANCE_ID"
echo "State: $EC2_STATE"
echo "Public IP: $EC2_IP"
echo ""

if [ "$EC2_STATE" != "running" ]; then
  echo "⚠️  Warning: EC2 instance is not running"
  echo "Start your instance in AWS Console before deploying"
  exit 1
fi

# Provide manual commands
echo "════════════════════════════════════════════"
echo "5. Deploy on EC2"
echo "════════════════════════════════════════════"
echo ""
echo "The package is ready in S3. Now you need to deploy it on EC2."
echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  OPTION 1: Connect via AWS Console         ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "1. Go to: https://console.aws.amazon.com/ec2"
echo "2. Select your instance: $EC2_INSTANCE_ID"
echo "3. Click 'Connect' → 'Session Manager' → 'Connect'"
echo "4. Run these commands in the browser terminal:"
echo ""
echo "────────────────────────────────────────────"
cat << 'DEPLOY_SCRIPT'
# Download and deploy
COMMIT_SHA="REPLACE_WITH_COMMIT"
S3_BUCKET="REPLACE_WITH_BUCKET"

cd /tmp
mkdir -p autoapply-deploy-$COMMIT_SHA
cd autoapply-deploy-$COMMIT_SHA

echo "Downloading from S3..."
aws s3 cp s3://$S3_BUCKET/deployments/autoapply-manual-$COMMIT_SHA.tar.gz .

echo "Extracting..."
tar -xzf autoapply-manual-$COMMIT_SHA.tar.gz

echo "Building Docker image..."
export DOCKER_BUILDKIT=1
docker build -f Dockerfile.fast -t autoapply:latest .

echo "Stopping old container..."
docker stop autoapply 2>/dev/null || true
docker rm autoapply 2>/dev/null || true

echo "Starting new container..."
docker run -d \
  --name autoapply \
  --restart unless-stopped \
  -p 80:3000 \
  -e NODE_ENV=production \
  -e AWS_ACCESS_KEY_ID="YOUR_AWS_KEY" \
  -e AWS_SECRET_ACCESS_KEY="YOUR_AWS_SECRET" \
  -e AWS_REGION="YOUR_REGION" \
  -e S3_BUCKET_NAME="YOUR_BUCKET" \
  -e ANTHROPIC_API_KEY="YOUR_CLAUDE_KEY" \
  -e APP_URL="http://YOUR_EC2_IP" \
  -e JWT_ACCESS_SECRET="$(openssl rand -hex 32)" \
  -e JWT_REFRESH_SECRET="$(openssl rand -hex 32)" \
  -e ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  autoapply:latest

echo "Checking health..."
sleep 10
docker logs autoapply --tail 30
curl http://localhost:3000/api/health

echo "✅ Deployment complete!"
DEPLOY_SCRIPT
echo "────────────────────────────────────────────"
echo ""
echo "Replace placeholders with actual values:"
echo "  REPLACE_WITH_COMMIT  → $COMMIT_SHA"
echo "  REPLACE_WITH_BUCKET  → $S3_BUCKET_NAME"
echo "  YOUR_AWS_KEY         → (from GitHub Secrets)"
echo "  YOUR_AWS_SECRET      → (from GitHub Secrets)"
echo "  YOUR_REGION          → $AWS_REGION"
echo "  YOUR_BUCKET          → $S3_BUCKET_NAME"
echo "  YOUR_CLAUDE_KEY      → (from GitHub Secrets)"
echo "  YOUR_EC2_IP          → $EC2_IP"
echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  OPTION 2: Use EC2 Instance Connect        ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "1. Go to: https://console.aws.amazon.com/ec2"
echo "2. Select instance: $EC2_INSTANCE_ID"
echo "3. Click 'Connect' → 'EC2 Instance Connect'"
echo "4. Click 'Connect' button"
echo "5. Run the commands above in the terminal"
echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  OPTION 3: Create deployment script        ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Create a ready-to-use deployment script
cat > /tmp/ec2-deploy-$COMMIT_SHA.sh << DEPLOY_EOF
#!/bin/bash
set -e

COMMIT_SHA="$COMMIT_SHA"
S3_BUCKET="$S3_BUCKET_NAME"

cd /tmp
mkdir -p autoapply-deploy-\$COMMIT_SHA
cd autoapply-deploy-\$COMMIT_SHA

echo "Downloading from S3..."
aws s3 cp s3://\$S3_BUCKET/deployments/autoapply-manual-\$COMMIT_SHA.tar.gz .

echo "Extracting..."
tar -xzf autoapply-manual-\$COMMIT_SHA.tar.gz

echo "Building Docker image..."
export DOCKER_BUILDKIT=1
docker build -f Dockerfile.fast -t autoapply:latest .

echo "Stopping old container..."
docker stop autoapply 2>/dev/null || true
docker rm autoapply 2>/dev/null || true

echo "Starting new container..."
# NOTE: Replace these environment variables with your actual values!
docker run -d \\
  --name autoapply \\
  --restart unless-stopped \\
  -p 80:3000 \\
  -e NODE_ENV=production \\
  -e AWS_ACCESS_KEY_ID="YOUR_AWS_KEY" \\
  -e AWS_SECRET_ACCESS_KEY="YOUR_AWS_SECRET" \\
  -e AWS_REGION="$AWS_REGION" \\
  -e S3_BUCKET_NAME="$S3_BUCKET_NAME" \\
  -e ANTHROPIC_API_KEY="YOUR_CLAUDE_KEY" \\
  -e APP_URL="http://$EC2_IP" \\
  -e JWT_ACCESS_SECRET="\$(openssl rand -hex 32)" \\
  -e JWT_REFRESH_SECRET="\$(openssl rand -hex 32)" \\
  -e ENCRYPTION_KEY="\$(openssl rand -hex 32)" \\
  autoapply:latest

echo "Waiting for application..."
sleep 10

echo "Container logs:"
docker logs autoapply --tail 30

echo "Health check:"
curl http://localhost:3000/api/health

echo "✅ Deployment complete!"
echo "Access at: http://$EC2_IP"
DEPLOY_EOF

chmod +x /tmp/ec2-deploy-$COMMIT_SHA.sh

echo "I've created a deployment script for you:"
echo "  /tmp/ec2-deploy-$COMMIT_SHA.sh"
echo ""
echo "To use it:"
echo "  1. Copy this file to your EC2 instance"
echo "  2. Edit it to add your actual API keys"
echo "  3. Run: bash ec2-deploy-$COMMIT_SHA.sh"
echo ""
echo "════════════════════════════════════════════"
echo "Summary"
echo "════════════════════════════════════════════"
echo ""
echo "✅ Build completed locally"
echo "✅ Package uploaded to S3"
echo "⏳ Waiting for you to deploy on EC2"
echo ""
echo "Next steps:"
echo "  1. Connect to EC2 (Session Manager or Instance Connect)"
echo "  2. Run the deployment commands shown above"
echo "  3. Test: curl http://$EC2_IP/api/health"
echo ""
echo "Deployment script saved to: /tmp/ec2-deploy-$COMMIT_SHA.sh"
echo ""

# Cleanup
rm -f deploy-manual.tar.gz

echo "╔════════════════════════════════════════════╗"
echo "║  Local build complete! 🎉                  ║"
echo "╚════════════════════════════════════════════╝"
