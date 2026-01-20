#!/bin/bash
# ============================================
# AutoApply Setup & Validation Script
# ============================================

set -e  # Exit on error

echo "=== AutoApply Setup & Validation ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js version
echo "🔍 Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18 or higher${NC}"
    exit 1
fi

node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ required (found: $(node -v))${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install --silent
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi
echo ""

# Check for Chrome/Chromium
echo "🌐 Checking for Chrome/Chromium..."
if ! command -v google-chrome &> /dev/null && ! command -v chromium &> /dev/null && ! command -v chrome &> /dev/null; then
    echo -e "${YELLOW}⚠️  Chrome/Chromium not found in PATH - Puppeteer will use bundled browser${NC}"
fi
echo ""

# Install Puppeteer browser
echo "🌐 Installing Puppeteer Chrome browser..."
npx puppeteer browsers install chrome 2>&1 | grep -E "(chrome@|Downloaded)" || true
if [ $? -eq 0 ] || [ -d "$HOME/.cache/puppeteer" ]; then
    echo -e "${GREEN}✅ Puppeteer browser installed${NC}"
else
    echo -e "${YELLOW}⚠️  Puppeteer browser installation may have failed${NC}"
fi
echo ""

# Validate environment variables
echo "🔍 Validating environment configuration..."
if [ ! -f .env.local ]; then
    if [ -f .env.example ]; then
        echo -e "${YELLOW}⚠️  .env.local not found, copying from .env.example${NC}"
        cp .env.example .env.local
    else
        echo -e "${YELLOW}⚠️  .env.local not found, creating template${NC}"
        cat > .env.local << 'EOF'
# Required API Keys
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# AWS S3 Configuration (for data persistence)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# Optional: Custom Chrome path
# PUPPETEER_EXECUTABLE_PATH=/path/to/chrome

# Optional: Proxy list (comma-separated)
# PROXY_LIST=http://proxy1:port,http://proxy2:port
EOF
        echo -e "${YELLOW}⚠️  Please edit .env.local with your actual credentials${NC}"
    fi
fi

# Check required env vars
source .env.local 2>/dev/null || true
missing_vars=()

if [ -z "$NEXT_PUBLIC_GEMINI_API_KEY" ] || [ "$NEXT_PUBLIC_GEMINI_API_KEY" = "your_gemini_api_key_here" ]; then
    missing_vars+=("NEXT_PUBLIC_GEMINI_API_KEY")
fi

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ "$AWS_ACCESS_KEY_ID" = "your_aws_access_key" ]; then
    missing_vars+=("AWS_ACCESS_KEY_ID")
fi

if [ -z "$S3_BUCKET_NAME" ] || [ "$S3_BUCKET_NAME" = "your-bucket-name" ]; then
    missing_vars+=("S3_BUCKET_NAME")
fi

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing or template environment variables:${NC}"
    for var in "${missing_vars[@]}"; do
        echo -e "   - $var"
    done
    echo -e "${YELLOW}   Please edit .env.local with actual values${NC}"
    echo ""
fi

# Verify package.json scripts
echo "🔍 Verifying npm scripts..."
if npm run --silent 2>&1 | grep -q "dev"; then
    echo -e "${GREEN}✅ npm scripts configured${NC}"
else
    echo -e "${RED}❌ package.json scripts may be misconfigured${NC}"
fi
echo ""

# Final summary
echo "========================================="
echo "✨ Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your API keys and AWS credentials"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:3000"
echo "4. Test health check: curl http://localhost:3000/api/health"
echo ""
echo -e "${GREEN}Happy scraping! 🚀${NC}"
