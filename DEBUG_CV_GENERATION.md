# CV Generation Debugging Guide

## 🔍 How to Debug CV Generation

Since your essays work fine with the same API key setup, let's identify why CVs are falling back to the template.

---

## Step 1: Check Server Logs (MOST IMPORTANT)

When you click "Generate CV", watch your **server terminal** (where `npm run dev` is running).

You'll see detailed logs like:

### ✅ SUCCESS Pattern:
```
[AI Generate] Request details: {
  provider: 'claude',
  hasClientApiKey: false,
  hasEnvClaudeKey: true,         ← Should be TRUE
  systemPromptLength: 12450,
  userMessageLength: 8932
}
[AI Generate] Final key status: {
  provider: 'claude',
  hasActiveKey: true,            ← Should be TRUE
  activeKeyLength: 108,
  activeKeyPrefix: 'sk-ant-ap...'
}
[Claude API] Calling with: {
  model: 'claude-opus-4-5-20251101',
  maxTokens: 8192,
  temperature: 0.3
}
[Claude API] Success! Generated tokens: 4523
[AI Generate] Success! Response length: 18234
```

### ❌ FAILURE Pattern - No Key:
```
[AI Generate] Request details: {
  provider: 'claude',
  hasClientApiKey: false,
  hasEnvClaudeKey: false,        ← Problem: FALSE!
  hasEnvPublicClaudeKey: false
}
[AI Generate] Final key status: {
  hasActiveKey: false,           ← Problem: No key!
  activeKeyPrefix: 'none'
}
[AI Generate] No API key found!
```

### ❌ FAILURE Pattern - API Error:
```
[Claude API] Error response: {
  status: 401,
  statusText: 'Unauthorized',
  error: '{"error":{"type":"authentication_error"...'
}
```

---

## Step 2: Test API Endpoint Directly

Open terminal and run:

```bash
# Check if API endpoint sees the key
curl http://localhost:3000/api/ai/generate
```

**Expected Response:**
```json
{
  "available": true,
  "providers": {
    "claude": true,
    "gemini": false,
    "openai": false
  }
}
```

If `"claude": false`, your environment variable isn't loaded.

---

## Step 3: Check Environment Variables

Run in terminal:

```bash
cd college-essay-app

# Check if CLAUDE_API_KEY is set
echo $CLAUDE_API_KEY

# Or on Windows:
echo %CLAUDE_API_KEY%

# Check Next.js environment
npx next info
```

---

## Step 4: Browser Console Check

1. Open browser DevTools (F12)
2. Go to CV Builder page
3. Click "Generate CV"
4. Watch **Console** tab for errors

Look for:
- "AI Generation Failed: [error message]"
- Network errors in Network tab
- Red error messages

---

## Common Issues & Fixes

### Issue 1: Environment Variable Not Loaded

**Symptoms:**
- Server logs show `hasEnvClaudeKey: false`
- Essays work, CVs don't

**Possible Causes:**
1. CV generation runs on different deployment than essays
2. Environment variable only set for specific routes
3. Docker/deployment config issue

**Fix Options:**

**Option A:** Add to `.env.local` (for local development):
```bash
# .env.local
CLAUDE_API_KEY=your_key_here
```

**Option B:** Check deployment environment variables:
```bash
# If using Docker
docker exec -it your-container env | grep CLAUDE

# If using Vercel/similar
vercel env ls
```

**Option C:** Set in code temporarily (for testing):
```typescript
// In src/app/api/ai/generate/route.ts, line 13
const getClaudeKey = () =>
  'sk-ant-api03-YOUR_KEY_HERE' ||  // Temporary hardcode for testing
  process.env.CLAUDE_API_KEY ||
  process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';
```

⚠️ **Don't commit hardcoded keys!**

---

### Issue 2: Model Not Available

**Symptoms:**
- Server logs show: `Claude API error (404): model not found`

**Cause:** Claude Opus 4.5 not available on your API tier

**Fix:** Downgrade model temporarily:

In `src/app/api/ai/generate/route.ts`, line 27, change:
```typescript
model: 'claude-3-5-sonnet-20241022',  // Changed from opus-4-5
```

---

### Issue 3: Token Limit Hit

**Symptoms:**
- Server logs show: `Claude API error (400): prompt is too long`

**Cause:** System prompt + user message > model's context limit

**Fix:** Reduce prompt size in `src/app/cv-builder/page.tsx`:

```typescript
// Line 162, reduce max activities
maxActivities: mode === 'job' ? 5 : 4,  // Reduced from 10/8
```

---

### Issue 4: Rate Limit

**Symptoms:**
- Server logs show: `Claude API error (429): rate_limit_error`

**Cause:** Too many requests

**Fix:**
- Wait 60 seconds
- Check Anthropic console usage limits
- Upgrade API tier if needed

---

## Step 5: Compare with Essay Generation

Since essays work, let's compare the API calls:

### Essay Generation Flow:
```
User → Essay Page → callAI() → /api/ai/generate → Claude API
```

### CV Generation Flow:
```
User → CV Builder → fetch('/api/ai/generate') → /api/ai/generate → Claude API
```

**Same endpoint!** So if one works, both should work.

**Possible Difference:**
- Prompt size (CVs are MUCH larger)
- Request timeout
- Different deployment/environment

---

## Diagnostic Test Script

Create a test to compare both:

```bash
# Test essay generation
curl http://localhost:3000/api/ai/generate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "claude",
    "systemPrompt": "You are a test assistant.",
    "userMessage": "Say hello in 10 words."
  }'

# Test CV generation (larger prompt)
curl http://localhost:3000/api/ai/generate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "claude",
    "systemPrompt": "'"$(head -c 10000 < src/app/cv-builder/page.tsx)"'",
    "userMessage": "Generate a CV."
  }'
```

---

## Next Steps

1. **Run the app**: `npm run dev`
2. **Try to generate a CV**
3. **Share the server logs** with me (copy from terminal)
4. **Share browser console errors** (F12 → Console tab)

With the detailed logs, I can identify:
- ✅ Is the key available?
- ✅ Is the API call succeeding?
- ✅ Is Claude responding?
- ✅ Is the response being processed correctly?
- ✅ Where exactly is it failing?

---

## Expected Behavior After Fix

Once working, you should see:

**Server Logs:**
```
[AI Generate] Request details: { hasEnvClaudeKey: true }
[AI Generate] Final key status: { hasActiveKey: true }
[Claude API] Calling with: { model: 'claude-opus-4-5-20251101' }
[Claude API] Success! Generated tokens: 4523
[AI Generate] Success! Response length: 18234
```

**Browser:**
```
🚀 Generating job-targeted CV...
✨ CV generated with all 8 activities included!
```

**Generated CV:**
- ALL activities included (not just 3)
- Detailed X-Y-Z formula bullets
- Metrics and quantification
- Keyword optimization
- Professional formatting

The system is ready - we just need to find where the disconnect is! 🔧
