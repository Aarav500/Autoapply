#!/bin/bash
set -e

echo "🚀 Deploying Autoapply to Production..."

# Check required environment variables
REQUIRED_VARS=(
  "AWS_ACCESS_KEY_ID"
  "AWS_SECRET_ACCESS_KEY"
  "AWS_REGION"
  "S3_BUCKET_NAME"
  "ANTHROPIC_API_KEY"
  "NEXTAUTH_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Error: $var is not set"
    exit 1
  fi
done

echo "✅ Environment variables validated"

# Generate secrets
export JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET:-$(openssl rand -hex 32)}
export JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-$(openssl rand -hex 32)}
export ENCRYPTION_KEY=${ENCRYPTION_KEY:-$(openssl rand -hex 32)}

echo "📦 Building Docker image..."
docker build -t autoapply:latest .

echo "🛑 Stopping old container..."
docker stop autoapply 2>/dev/null || true
docker rm autoapply 2>/dev/null || true

echo "🚀 Starting new container..."
docker run -d \
  --name autoapply \
  --restart unless-stopped \
  -p 80:3000 \
  -e NODE_ENV=production \
  -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
  -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
  -e AWS_REGION="$AWS_REGION" \
  -e S3_BUCKET_NAME="$S3_BUCKET_NAME" \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e APP_URL="$NEXTAUTH_URL" \
  -e JWT_ACCESS_SECRET="$JWT_ACCESS_SECRET" \
  -e JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  -e ENCRYPTION_KEY="$ENCRYPTION_KEY" \
  -e GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}" \
  -e GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}" \
  -e GOOGLE_REDIRECT_URI="${NEXTAUTH_URL}/api/auth/oauth/google/callback" \
  -e TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:-}" \
  -e TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN:-}" \
  -e TWILIO_PHONE_NUMBER="${TWILIO_PHONE_NUMBER:-}" \
  -e TWILIO_MESSAGING_SERVICE_SID="${TWILIO_MESSAGING_SERVICE_SID:-}" \
  -e SENDGRID_API_KEY="${SENDGRID_API_KEY:-}" \
  -e SENDGRID_FROM_EMAIL="${SENDGRID_FROM_EMAIL:-}" \
  autoapply:latest

echo "⏳ Waiting for health check..."
sleep 10

MAX_ATTEMPTS=12
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -f http://localhost:3000/api/health 2>/dev/null; then
    echo ""
    echo "✅ Deployment successful!"
    echo "📍 URL: $NEXTAUTH_URL"
    echo "🏥 Health: http://localhost:3000/api/health"
    docker logs autoapply --tail 20
    exit 0
  fi

  echo -n "."
  ATTEMPT=$((ATTEMPT + 1))
  sleep 5
done

echo ""
echo "❌ Health check failed after $((MAX_ATTEMPTS * 5)) seconds"
echo "📋 Container logs:"
docker logs autoapply --tail 50
exit 1
