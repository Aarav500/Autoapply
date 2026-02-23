#!/bin/bash
set -e

echo "=== AutoApply Deployment ==="
echo ""

echo "Step 1: Checking dependencies..."
if ! command -v aws &> /dev/null; then
  echo "  Installing AWS CLI..."
  sudo apt-get update -qq && sudo apt-get install -y -qq unzip
  curl -s https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o /tmp/awscliv2.zip
  cd /tmp && unzip -qo awscliv2.zip && sudo ./aws/install && rm -rf aws awscliv2.zip
  cd -
else
  echo "  AWS CLI installed"
fi

if ! command -v docker &> /dev/null; then
  echo "  Installing Docker..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --batch --yes --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin
  sudo usermod -aG docker ubuntu
  sudo systemctl enable docker
  sudo systemctl start docker
else
  echo "  Docker installed"
fi

echo ""
echo "Step 2: Stopping existing containers..."
sudo docker stop autoapply-app 2>/dev/null || true
sudo docker rm autoapply-app 2>/dev/null || true

echo ""
echo "Step 3: Downloading deployment package..."
mkdir -p /home/ubuntu/autoapply
cd /home/ubuntu/autoapply
aws s3 cp "$S3_DEPLOY_PATH" deploy.tar.gz

echo ""
echo "Step 4: Extracting package..."
rm -rf app
mkdir -p app
tar -xzf deploy.tar.gz -C app
cd app

echo ""
echo "Step 5: Verifying build artifacts..."
if [ ! -f ".next/BUILD_ID" ]; then
  echo "ERROR: .next/BUILD_ID not found!"
  echo "Contents of current directory:"
  ls -la
  echo "Contents of .next/ (if exists):"
  ls -la .next/ 2>/dev/null || echo ".next/ directory does not exist"
  exit 1
fi
echo "  BUILD_ID: $(cat .next/BUILD_ID)"

echo ""
echo "Step 6: Building Docker image..."
sudo docker build -f Dockerfile -t autoapply:latest .

echo ""
echo "Step 7: Starting container..."
sudo docker run -d \
  --name autoapply-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  autoapply:latest

echo ""
echo "Step 8: Waiting for application to start..."
i=1
while [ $i -le 30 ]; do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "  Application is healthy!"
    echo ""
    echo "=== Container Logs ==="
    sudo docker logs autoapply-app --tail 20
    echo ""
    echo "=== Deployment Complete ==="
    exit 0
  fi
  echo "  Attempt $i/30: waiting..."
  sleep 2
  i=$((i + 1))
done

echo ""
echo "Application failed to start after 60 seconds"
echo ""
echo "=== Container Logs ==="
sudo docker logs autoapply-app 2>&1
echo ""
echo "=== Container Status ==="
sudo docker ps -a --filter name=autoapply-app
exit 1
