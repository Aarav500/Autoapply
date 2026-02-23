#!/bin/bash
set -e

echo "=========================================="
echo "AutoApply EC2 Setup Script"
echo "=========================================="
echo ""
echo "This script will install:"
echo "  - AWS CLI v2"
echo "  - Docker"
echo "  - Docker Compose"
echo ""
echo "Run this on a fresh Ubuntu EC2 instance"
echo "=========================================="
echo ""

# Update system
echo "=== Updating system packages ==="
sudo apt-get update -y

# Install AWS CLI v2
echo ""
echo "=== Installing AWS CLI v2 ==="
if command -v aws &> /dev/null; then
    echo "AWS CLI already installed: $(aws --version)"
else
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    sudo apt-get install -y unzip
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
    echo "✅ AWS CLI installed: $(aws --version)"
fi

# Install Docker
echo ""
echo "=== Installing Docker ==="
if command -v docker &> /dev/null; then
    echo "Docker already installed: $(docker --version)"
else
    # Install Docker dependencies
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    # Add Docker's official GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    # Set up Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Add ubuntu user to docker group
    sudo usermod -aG docker ubuntu

    # Start Docker
    sudo systemctl enable docker
    sudo systemctl start docker

    echo "✅ Docker installed: $(docker --version)"
fi

# Install Docker Compose (standalone)
echo ""
echo "=== Installing Docker Compose ==="
if command -v docker-compose &> /dev/null; then
    echo "Docker Compose already installed: $(docker-compose --version)"
else
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed: $(docker-compose --version)"
fi

# Install additional utilities
echo ""
echo "=== Installing utilities ==="
sudo apt-get install -y curl wget git jq

echo ""
echo "=========================================="
echo "✅ EC2 Setup Complete!"
echo "=========================================="
echo ""
echo "Installed:"
echo "  - AWS CLI: $(aws --version 2>&1 | head -n1)"
echo "  - Docker: $(docker --version)"
echo "  - Docker Compose: $(docker-compose --version 2>&1 || echo 'docker compose (plugin)')"
echo ""
echo "IMPORTANT: Log out and log back in for Docker group changes to take effect"
echo "           Or run: newgrp docker"
echo ""
echo "You can now deploy from GitHub Actions!"
echo "=========================================="
