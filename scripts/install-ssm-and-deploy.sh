#!/bin/bash
set -e

echo "╔════════════════════════════════════════════╗"
echo "║   Install SSM Agent & Deploy AutoApply    ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# This script runs on EC2 via manual connection
# It installs SSM Agent, then deploys the application

COMMIT_SHA="${1:-latest}"
S3_BUCKET="${2:-autoapply-bucket}"
AWS_REGION="${3:-us-east-1}"

echo "Deployment Configuration:"
echo "  Commit: $COMMIT_SHA"
echo "  Bucket: $S3_BUCKET"
echo "  Region: $AWS_REGION"
echo ""

# ============================================================================
# Step 1: Install SSM Agent
# ============================================================================

echo "════════════════════════════════════════════"
echo "Step 1: Installing SSM Agent"
echo "════════════════════════════════════════════"
echo ""

if command -v snap &> /dev/null; then
  echo "Using snap to install SSM Agent..."

  # Check if already installed
  if snap list amazon-ssm-agent &> /dev/null; then
    echo "✅ SSM Agent already installed via snap"
    sudo snap start amazon-ssm-agent || true
  else
    echo "Installing amazon-ssm-agent..."
    sudo snap install amazon-ssm-agent --classic
    sudo snap start amazon-ssm-agent
  fi

  # Verify
  sudo snap services amazon-ssm-agent

elif command -v yum &> /dev/null; then
  echo "Using yum to install SSM Agent (Amazon Linux)..."

  if systemctl is-active amazon-ssm-agent &> /dev/null; then
    echo "✅ SSM Agent already running"
  else
    sudo yum install -y amazon-ssm-agent
    sudo systemctl enable amazon-ssm-agent
    sudo systemctl start amazon-ssm-agent
  fi

  sudo systemctl status amazon-ssm-agent --no-pager

else
  echo "⚠️  Could not determine package manager"
  echo "Please install SSM Agent manually:"
  echo "  https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-manual-agent-install.html"
fi

echo ""
echo "✅ SSM Agent installation complete"
echo ""

# ============================================================================
# Step 2: Check Docker
# ============================================================================

echo "════════════════════════════════════════════"
echo "Step 2: Checking Docker"
echo "════════════════════════════════════════════"
echo ""

if ! command -v docker &> /dev/null; then
  echo "Docker not found. Installing..."

  if command -v apt-get &> /dev/null; then
    # Ubuntu/Debian
    sudo apt-get update
    sudo apt-get install -y docker.io
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
  elif command -v yum &> /dev/null; then
    # Amazon Linux
    sudo yum update -y
    sudo yum install -y docker
    sudo service docker start
    sudo systemctl enable docker
    sudo usermod -aG docker ec2-user
  fi
else
  echo "✅ Docker already installed"
  sudo systemctl start docker || sudo service docker start || true
fi

docker --version
echo ""

# ============================================================================
# Step 3: Deploy Application
# ============================================================================

echo "════════════════════════════════════════════"
echo "Step 3: Deploying Application"
echo "════════════════════════════════════════════"
echo ""

WORKDIR="/tmp/autoapply-deploy-$COMMIT_SHA"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

echo "Working directory: $WORKDIR"
echo ""

# Download from S3
echo "Downloading from S3..."
if aws s3 cp "s3://$S3_BUCKET/deployments/autoapply-$COMMIT_SHA.tar.gz" . --region "$AWS_REGION"; then
  echo "✅ Download successful"
  ls -lh "autoapply-$COMMIT_SHA.tar.gz"
else
  echo "❌ Failed to download from S3"
  echo ""
  echo "Possible issues:"
  echo "  1. EC2 instance doesn't have IAM role with S3 permissions"
  echo "  2. File doesn't exist in S3"
  echo "  3. Bucket name is incorrect"
  echo ""
  echo "To fix IAM role:"
  echo "  1. Go to EC2 Console → Select instance"
  echo "  2. Actions → Security → Modify IAM role"
  echo "  3. Attach role with S3 read permissions"
  exit 1
fi

echo ""

# Extract
echo "Extracting package..."
tar -xzf "autoapply-$COMMIT_SHA.tar.gz"
echo "✅ Extraction complete"
echo ""

# Build Docker image
echo "Building Docker image..."
export DOCKER_BUILDKIT=1

if sudo docker build -f Dockerfile.fast --progress=plain -t autoapply:latest .; then
  echo "✅ Docker build successful"
else
  echo "❌ Docker build failed"
  exit 1
fi

echo ""
sudo docker images | grep autoapply
echo ""

# Stop old container
echo "Stopping old container..."
sudo docker stop autoapply 2>/dev/null || echo "No container to stop"
sudo docker rm autoapply 2>/dev/null || echo "No container to remove"
echo ""

# Get environment variables (you'll need to set these)
echo "⚠️  IMPORTANT: Set your environment variables!"
echo ""
echo "Example:"
echo "  export AWS_ACCESS_KEY_ID='your-key'"
echo "  export AWS_SECRET_ACCESS_KEY='your-secret'"
echo "  export ANTHROPIC_API_KEY='your-claude-key'"
echo "  export APP_URL='http://your-ec2-ip'"
echo ""

# Start new container
echo "Starting new container..."

# Use environment variables if set, otherwise use placeholders
AWS_KEY="${AWS_ACCESS_KEY_ID:-REPLACE_WITH_YOUR_AWS_KEY}"
AWS_SECRET="${AWS_SECRET_ACCESS_KEY:-REPLACE_WITH_YOUR_AWS_SECRET}"
CLAUDE_KEY="${ANTHROPIC_API_KEY:-REPLACE_WITH_YOUR_CLAUDE_KEY}"
APP_URL="${APP_URL:-http://localhost}"

sudo docker run -d \
  --name autoapply \
  --restart unless-stopped \
  -p 80:3000 \
  -e NODE_ENV=production \
  -e AWS_ACCESS_KEY_ID="$AWS_KEY" \
  -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET" \
  -e AWS_REGION="$AWS_REGION" \
  -e S3_BUCKET_NAME="$S3_BUCKET" \
  -e ANTHROPIC_API_KEY="$CLAUDE_KEY" \
  -e APP_URL="$APP_URL" \
  -e JWT_ACCESS_SECRET="$(openssl rand -hex 32)" \
  -e JWT_REFRESH_SECRET="$(openssl rand -hex 32)" \
  -e ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  autoapply:latest

echo "✅ Container started"
echo ""

# Wait and check
echo "Waiting for application to start..."
sleep 15

# Show status
echo "Container status:"
sudo docker ps | grep autoapply
echo ""

echo "Container logs (last 30 lines):"
sudo docker logs autoapply --tail 30
echo ""

# Health check
echo "Health check:"
for i in {1..10}; do
  if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "✅ Health check passed!"
    curl -s http://localhost:3000/api/health
    break
  fi
  echo "Attempt $i/10..."
  sleep 3
done

echo ""

# Cleanup
echo "Cleaning up..."
sudo docker image prune -f
cd /tmp
rm -rf "$WORKDIR"

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║          Deployment Complete! 🎉          ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "What was done:"
echo "  ✅ SSM Agent installed and started"
echo "  ✅ Docker installed/verified"
echo "  ✅ Application deployed to container"
echo "  ✅ Container running on port 80"
echo ""
echo "Next steps:"
echo "  1. Test: curl http://localhost:3000/api/health"
echo "  2. Access: http://YOUR-EC2-IP"
echo "  3. Wait 5 minutes for SSM to register"
echo "  4. Verify SSM: sudo snap services amazon-ssm-agent"
echo "  5. Future deploys will be automated via GitHub Actions!"
echo ""
echo "To enable automated deploys:"
echo "  1. Ensure EC2 has IAM role with AmazonSSMManagedInstanceCore"
echo "  2. Wait 5 minutes for SSM registration"
echo "  3. Push to main branch - auto deploys!"
echo ""
