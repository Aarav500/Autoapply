#!/bin/bash
set -e

INSTANCE_ID="i-0ac8fbf952ab92a65"
REGION="${AWS_REGION:-us-east-1}"

echo "╔════════════════════════════════════════════╗"
echo "║   EC2 SSM Connectivity Diagnostics         ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "Instance ID: $INSTANCE_ID"
echo "Region: $REGION"
echo ""

# Function to print status with color
print_status() {
  if [ "$1" = "ok" ]; then
    echo "✅ $2"
  elif [ "$1" = "warn" ]; then
    echo "⚠️  $2"
  else
    echo "❌ $2"
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. EC2 Instance Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

INSTANCE_STATE=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text 2>/dev/null || echo "unknown")

if [ "$INSTANCE_STATE" = "running" ]; then
  print_status "ok" "Instance is running"
else
  print_status "fail" "Instance state: $INSTANCE_STATE (expected: running)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. IAM Instance Profile"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

IAM_PROFILE=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' \
  --output text 2>/dev/null || echo "None")

if [ "$IAM_PROFILE" != "None" ]; then
  print_status "ok" "IAM role attached: $IAM_PROFILE"

  # Check for SSM policy
  ROLE_NAME=$(echo "$IAM_PROFILE" | cut -d'/' -f2)
  HAS_SSM_POLICY=$(aws iam list-attached-role-policies \
    --role-name "$ROLE_NAME" \
    --query 'AttachedPolicies[?PolicyName==`AmazonSSMManagedInstanceCore`].PolicyName' \
    --output text 2>/dev/null)

  if [ -n "$HAS_SSM_POLICY" ]; then
    print_status "ok" "AmazonSSMManagedInstanceCore policy attached"
  else
    print_status "fail" "Missing AmazonSSMManagedInstanceCore policy!"
    echo "   Fix: aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  fi
else
  print_status "fail" "No IAM role attached to instance!"
  echo "   Fix: Attach an IAM role with AmazonSSMManagedInstanceCore policy"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. SSM Agent Registration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SSM_INFO=$(aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
  --region "$REGION" \
  --query 'InstanceInformationList[0]' \
  --output json 2>/dev/null)

if [ -n "$SSM_INFO" ] && [ "$SSM_INFO" != "null" ]; then
  PING_STATUS=$(echo "$SSM_INFO" | jq -r '.PingStatus // "Unknown"')
  LAST_PING=$(echo "$SSM_INFO" | jq -r '.LastPingDateTime // "Never"')
  PLATFORM=$(echo "$SSM_INFO" | jq -r '.PlatformName // "Unknown"')
  AGENT_VERSION=$(echo "$SSM_INFO" | jq -r '.AgentVersion // "Unknown"')

  if [ "$PING_STATUS" = "Online" ]; then
    print_status "ok" "SSM Agent is online"
    echo "   Last ping: $LAST_PING"
    echo "   Platform: $PLATFORM"
    echo "   Agent version: $AGENT_VERSION"
  else
    print_status "fail" "SSM Agent status: $PING_STATUS"
    echo "   Last ping: $LAST_PING"
  fi
else
  print_status "fail" "Instance not registered with SSM!"
  echo "   Possible causes:"
  echo "   - SSM Agent not installed"
  echo "   - SSM Agent not running"
  echo "   - No internet connectivity"
  echo "   - Missing IAM permissions"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Network Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text 2>/dev/null || echo "None")

PRIVATE_IP=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].PrivateIpAddress' \
  --output text 2>/dev/null || echo "None")

echo "Public IP: $PUBLIC_IP"
echo "Private IP: $PRIVATE_IP"

# Check security group egress rules
SG_ID=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text 2>/dev/null)

if [ -n "$SG_ID" ]; then
  ALLOWS_HTTPS=$(aws ec2 describe-security-groups \
    --group-ids "$SG_ID" \
    --region "$REGION" \
    --query "SecurityGroups[0].IpPermissionsEgress[?((IpProtocol=='-1') || (IpProtocol=='tcp' && (FromPort<=443 && ToPort>=443)))]" \
    --output json 2>/dev/null | jq 'length')

  if [ "$ALLOWS_HTTPS" -gt 0 ]; then
    print_status "ok" "Security group allows outbound HTTPS"
  else
    print_status "warn" "Security group may not allow outbound HTTPS (required for SSM)"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. SSM Command Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Sending test command..."
COMMAND_ID=$(aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["echo \"SSM test successful\"", "date", "whoami"]' \
  --output text \
  --query 'Command.CommandId' 2>/dev/null || echo "FAILED")

if [ "$COMMAND_ID" = "FAILED" ]; then
  print_status "fail" "Could not send SSM command"
else
  echo "Command ID: $COMMAND_ID"
  echo "Waiting 15 seconds for execution..."
  sleep 15

  STATUS=$(aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Status' \
    --output text 2>/dev/null || echo "Unknown")

  if [ "$STATUS" = "Success" ]; then
    print_status "ok" "Test command executed successfully!"
    echo ""
    echo "Command output:"
    aws ssm get-command-invocation \
      --command-id "$COMMAND_ID" \
      --instance-id "$INSTANCE_ID" \
      --region "$REGION" \
      --query 'StandardOutputContent' \
      --output text 2>/dev/null | sed 's/^/   │ /'
  else
    print_status "fail" "Test command failed with status: $STATUS"
    echo ""
    echo "Error output:"
    aws ssm get-command-invocation \
      --command-id "$COMMAND_ID" \
      --instance-id "$INSTANCE_ID" \
      --region "$REGION" \
      --query 'StandardErrorContent' \
      --output text 2>/dev/null | sed 's/^/   │ /' || echo "   │ (no error output)"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary & Recommendations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$STATUS" = "Success" ]; then
  echo "✅ All checks passed! SSM is working correctly."
  echo ""
  echo "You can now deploy using:"
  echo "  git push origin main"
  echo ""
else
  echo "⚠️  Issues detected. Recommended actions:"
  echo ""

  if [ "$INSTANCE_STATE" != "running" ]; then
    echo "1. Start the EC2 instance"
  fi

  if [ "$IAM_PROFILE" = "None" ] || [ -z "$HAS_SSM_POLICY" ]; then
    echo "2. Attach IAM role with AmazonSSMManagedInstanceCore policy"
  fi

  if [ -z "$SSM_INFO" ] || [ "$SSM_INFO" = "null" ]; then
    echo "3. SSH into instance and install/start SSM Agent:"
    echo "   ssh -i your-key.pem ubuntu@$PUBLIC_IP"
    echo "   sudo snap install amazon-ssm-agent --classic"
    echo "   sudo snap start amazon-ssm-agent"
  fi

  echo ""
  echo "For detailed troubleshooting, see:"
  echo "  docs/TROUBLESHOOTING-EC2-SSM.md"
  echo ""
  echo "Alternative: Use SSH-based deployment:"
  echo "  .github/workflows/deploy-ssh.yml"
fi

echo ""
echo "╚════════════════════════════════════════════╝"
