#!/bin/bash
# Bootstrap script: installs SSM Agent + Docker on a fresh EC2 instance.
# Run once via SSH. After this, all deployments go through SSM — no SSH needed.
set -euo pipefail

echo "=========================================="
echo "  AutoApply EC2 Bootstrap"
echo "=========================================="

# ── Detect distro ────────────────────────────────────────────────────────────
if [ -f /etc/os-release ]; then
  . /etc/os-release
  DISTRO=$ID
else
  echo "❌ Cannot detect OS"; exit 1
fi
echo "Detected OS: $DISTRO $VERSION_ID"

# ── System update ─────────────────────────────────────────────────────────────
echo ""
echo "=== Updating system packages ==="
if [ "$DISTRO" = "ubuntu" ] || [ "$DISTRO" = "debian" ]; then
  export DEBIAN_FRONTEND=noninteractive
  sudo apt-get update -y
  sudo apt-get upgrade -y
elif [ "$DISTRO" = "amzn" ] || [ "$DISTRO" = "rhel" ] || [ "$DISTRO" = "centos" ]; then
  sudo yum update -y
fi

# ── AWS SSM Agent ─────────────────────────────────────────────────────────────
echo ""
echo "=== Installing AWS SSM Agent ==="
if systemctl is-active --quiet amazon-ssm-agent 2>/dev/null; then
  echo "SSM Agent already running: $(amazon-ssm-agent -version 2>/dev/null || echo 'unknown version')"
else
  if [ "$DISTRO" = "ubuntu" ] || [ "$DISTRO" = "debian" ]; then
    ARCH=$(dpkg --print-architecture)
    if [ "$ARCH" = "arm64" ]; then
      SSM_PKG="amazon-ssm-agent_arm64.deb"
      SSM_URL="https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/debian_arm64/${SSM_PKG}"
    else
      SSM_PKG="amazon-ssm-agent_amd64.deb"
      SSM_URL="https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/debian_amd64/${SSM_PKG}"
    fi
    wget -q "$SSM_URL" -O /tmp/amazon-ssm-agent.deb
    sudo dpkg -i /tmp/amazon-ssm-agent.deb
    rm /tmp/amazon-ssm-agent.deb
  elif [ "$DISTRO" = "amzn" ]; then
    # Amazon Linux 2023 — SSM Agent is pre-installed; just ensure it's enabled
    sudo yum install -y amazon-ssm-agent 2>/dev/null || true
  elif [ "$DISTRO" = "rhel" ] || [ "$DISTRO" = "centos" ]; then
    sudo yum install -y "https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm"
  fi

  sudo systemctl enable amazon-ssm-agent
  sudo systemctl start amazon-ssm-agent
  sleep 3
  if systemctl is-active --quiet amazon-ssm-agent; then
    echo "✅ SSM Agent installed and running"
  else
    echo "❌ SSM Agent failed to start — check: sudo journalctl -u amazon-ssm-agent"
    exit 1
  fi
fi

# ── AWS CLI v2 ────────────────────────────────────────────────────────────────
echo ""
echo "=== Installing AWS CLI v2 ==="
if command -v aws &>/dev/null; then
  echo "AWS CLI already installed: $(aws --version)"
else
  ARCH=$(uname -m)
  if [ "$ARCH" = "aarch64" ]; then
    AWS_URL="https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip"
  else
    AWS_URL="https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip"
  fi
  curl -fsSL "$AWS_URL" -o /tmp/awscliv2.zip
  sudo apt-get install -y unzip 2>/dev/null || sudo yum install -y unzip 2>/dev/null || true
  unzip -q /tmp/awscliv2.zip -d /tmp/awscli
  sudo /tmp/awscli/aws/install
  rm -rf /tmp/awscliv2.zip /tmp/awscli
  echo "✅ AWS CLI installed: $(aws --version)"
fi

# ── Docker ────────────────────────────────────────────────────────────────────
echo ""
echo "=== Installing Docker ==="
if command -v docker &>/dev/null; then
  echo "Docker already installed: $(docker --version)"
else
  if [ "$DISTRO" = "ubuntu" ] || [ "$DISTRO" = "debian" ]; then
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/${DISTRO}/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/${DISTRO} $(lsb_release -cs) stable" \
      | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  elif [ "$DISTRO" = "amzn" ]; then
    sudo yum install -y docker
    sudo usermod -aG docker ec2-user
  fi

  sudo systemctl enable docker
  sudo systemctl start docker

  # Add current user to docker group (takes effect on next login / newgrp)
  CURRENT_USER=$(logname 2>/dev/null || echo "${SUDO_USER:-ubuntu}")
  sudo usermod -aG docker "$CURRENT_USER" 2>/dev/null || true

  echo "✅ Docker installed: $(docker --version)"
fi

# ── Utilities ─────────────────────────────────────────────────────────────────
echo ""
echo "=== Installing utilities ==="
if [ "$DISTRO" = "ubuntu" ] || [ "$DISTRO" = "debian" ]; then
  sudo apt-get install -y curl wget git jq unzip
elif [ "$DISTRO" = "amzn" ]; then
  sudo yum install -y curl wget git jq unzip
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  ✅ Bootstrap Complete!"
echo "=========================================="
echo "  SSM Agent : $(systemctl is-active amazon-ssm-agent)"
echo "  AWS CLI   : $(aws --version 2>&1 | head -1)"
echo "  Docker    : $(docker --version)"
echo "  Docker CP : $(docker compose version 2>/dev/null || echo 'plugin not found')"
echo "=========================================="
echo ""
echo "SSM is now active — future deployments use GitHub Actions → SSM (no SSH needed)."
