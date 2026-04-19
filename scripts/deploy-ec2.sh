#!/bin/bash
# deploy-ec2.sh — runs on EC2 via SSM on every GitHub Actions deploy
set -euo pipefail

echo "=========================================="
echo "  AutoApply Deployment"
echo "=========================================="

# ── Step 1: Ensure dependencies ──────────────────────────────────────────────
echo ""
echo "Step 1: Checking dependencies..."

if ! command -v aws &>/dev/null; then
  echo "  Installing AWS CLI..."
  sudo apt-get update -qq && sudo apt-get install -y -qq unzip
  curl -fsSL https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o /tmp/awscliv2.zip
  cd /tmp && unzip -qo awscliv2.zip && sudo ./aws/install && rm -rf aws awscliv2.zip
  cd -
fi
echo "  ✓ AWS CLI: $(aws --version 2>&1 | head -1)"

if ! command -v docker &>/dev/null; then
  echo "  Installing Docker..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq ca-certificates curl gnupg lsb-release
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --batch --yes --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin
  sudo usermod -aG docker ubuntu
  sudo systemctl enable docker && sudo systemctl start docker
fi
echo "  ✓ Docker: $(docker --version)"

# ── Step 2: Install + configure nginx (reverse proxy port 80 → 3000) ─────────
echo ""
echo "Step 2: Configuring nginx reverse proxy..."

if ! command -v nginx &>/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq nginx
  sudo systemctl enable nginx
fi

sudo tee /etc/nginx/sites-available/autoapply > /dev/null <<'NGINX'
server {
    listen 80;
    server_name autoapply.aarav-shah.com aarav-shah.com www.aarav-shah.com _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    # Pass real IP from Cloudflare
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 2400:cb00::/32;
    real_ip_header CF-Connecting-IP;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }

    # Health check endpoint (no proxy logging noise)
    location /api/health {
        proxy_pass http://127.0.0.1:3000;
        access_log off;
    }
}
NGINX

# Enable site
sudo ln -sf /etc/nginx/sites-available/autoapply /etc/nginx/sites-enabled/autoapply
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx || sudo systemctl start nginx
echo "  ✓ nginx configured: port 80 → localhost:3000"

# ── Step 3: Stop existing container ──────────────────────────────────────────
echo ""
echo "Step 3: Stopping existing container..."
sudo docker stop autoapply-app 2>/dev/null || true
sudo docker rm   autoapply-app 2>/dev/null || true

# ── Step 4: Download deployment package from S3 ──────────────────────────────
echo ""
echo "Step 4: Downloading deployment package..."
mkdir -p /home/ubuntu/autoapply
cd /home/ubuntu/autoapply
aws s3 cp "$S3_DEPLOY_PATH" deploy.tar.gz
echo "  ✓ Downloaded"

# ── Step 5: Extract ───────────────────────────────────────────────────────────
echo ""
echo "Step 5: Extracting package..."
rm -rf app && mkdir -p app
tar -xzf deploy.tar.gz -C app
cd app

if [ ! -f ".next/BUILD_ID" ]; then
  echo "ERROR: .next/BUILD_ID missing!"
  ls -la; ls -la .next/ 2>/dev/null || true
  exit 1
fi
echo "  ✓ BUILD_ID: $(cat .next/BUILD_ID)"

# ── Step 6: Build Docker image ───────────────────────────────────────────────
echo ""
echo "Step 6: Pruning old Docker data..."
sudo docker system prune -af --volumes 2>/dev/null || true

echo ""
echo "Step 7: Building Docker image..."
sudo docker build --progress=plain -f Dockerfile -t autoapply:latest . 2>&1

# ── Step 7: Start container ───────────────────────────────────────────────────
echo ""
echo "Step 8: Starting container..."
sudo docker run -d \
  --name autoapply-app \
  --restart unless-stopped \
  --network host \
  --env-file .env \
  autoapply:latest

# ── Step 8: Health check ──────────────────────────────────────────────────────
echo ""
echo "Step 9: Waiting for app to be healthy..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo ""
    echo "  ✓ App is healthy on :3000"
    echo ""
    echo "=== Recent logs ==="
    sudo docker logs autoapply-app --tail 15
    echo ""
    echo "=========================================="
    echo "  ✅ Deployment complete!"
    echo "  🌐 https://autoapply.aarav-shah.com"
    echo "=========================================="
    exit 0
  fi
  echo "  [${i}/30] waiting..."
  sleep 2
done

echo "❌ App failed to start within 60s"
sudo docker logs autoapply-app 2>&1
sudo docker ps -a --filter name=autoapply-app
exit 1
