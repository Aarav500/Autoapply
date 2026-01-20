# 🔄 S3 Bucket Synchronization Guide

## Overview

All your data (activities, achievements, grades) is now **automatically synchronized** with your S3 bucket in real-time. This ensures:
- ✅ Your data is **backed up** in the cloud
- ✅ Essays can pull from **the same source of truth**
- ✅ You can access data across devices
- ✅ No data loss if you clear browser cache

---

## How S3 Sync Works

### Automatic Save (2-Second Debounce)

When you add or edit activities/achievements/grades:

1. **Data saved locally** (instant - to localStorage)
2. **Wait 2 seconds** (debounce to avoid excessive API calls)
3. **Auto-save to S3** (background sync)
4. **Show confirmation** (toast notification "✅ Saved to S3!")

**Example Flow**:
```
User adds activity "Research Assistant"
↓
Data saved to localStorage (instant)
↓
[2 second pause]
↓
Data saved to S3 bucket
↓
Toast: "✅ Activities saved to S3!"
↓
Status indicator: "Synced to S3 bucket"
```

### Manual Save Button

You can also **force immediate save** to S3 by clicking:
- **"Save to S3"** button in the Activities page header

This bypasses the 2-second debounce and saves immediately.

---

## Visual Indicators

### Activities Page Header

You'll see real-time status indicators:

**While saving**:
```
🔵 Saving to S3...  [spinning loader icon]
```

**After successful save**:
```
✅ Synced to S3 bucket
```

**If error occurs**:
```
Toast notification: "❌ Failed to save: [error message]"
```

---

## S3 Bucket Structure

Your data is stored in the S3 bucket with the following keys:

```
your-bucket-name/
├── activities                    # All activities
├── achievements                  # All achievements
├── grades/
│   └── transcript               # Grades and courses
├── user-profile                 # User profile
├── transfer-essays-mit          # MIT essays
├── transfer-essays-stanford     # Stanford essays
└── ... (other colleges)
```

### Activities Storage Key
- **Key**: `activities`
- **Format**: JSON array
- **Example**:
  ```json
  [
    {
      "id": "act_1234567890",
      "name": "Research Assistant",
      "role": "Lead Researcher",
      "organization": "UCR CS Lab",
      "category": "academic",
      "description": "Led ML research project...",
      "startDate": "2024-01-01",
      "endDate": "2025-01-01",
      "isOngoing": false,
      "hoursPerWeek": 15,
      "weeksPerYear": 40,
      "achievements": ["Published at IEEE", "Presented at symposium"]
    }
  ]
  ```

### Achievements Storage Key
- **Key**: `achievements`
- **Format**: JSON array
- **Example**:
  ```json
  [
    {
      "id": "ach_1234567890",
      "title": "National Merit Scholarship",
      "category": "award",
      "date": "2024-12-01",
      "description": "Top 1% PSAT performance",
      "issuer": "College Board"
    }
  ]
  ```

### Transcript Storage Key
- **Key**: `grades/transcript`
- **Format**: JSON object
- **Example**:
  ```json
  {
    "gpa": 3.90,
    "totalCredits": 18,
    "courses": [
      {
        "id": "1",
        "name": "Intro: CS for Sci, Math & Engr I",
        "code": "CS 010A",
        "grade": "A",
        "credits": 4,
        "semester": "Fall 2025",
        "learnings": ["Mastered programming fundamentals", "Built first coding projects"],
        "storyPotential": "Foundation course - shows strong start in CS major",
        "relevantEssays": ["mit", "stanford", "cmu"]
      }
    ]
  }
  ```

---

## Verifying S3 Sync

### Method 1: Check Status Indicator

On the **Activities page** (`/activities`):
1. Add or edit an activity
2. Wait 2-3 seconds
3. Look for **"✅ Synced to S3 bucket"** under the page title

### Method 2: Check Browser Console

1. Open DevTools (F12 or Ctrl+Shift+I)
2. Go to **Console** tab
3. Add an activity
4. You should see logs like:
   ```
   S3 save started for key: activities
   S3 save successful for key: activities
   ```

### Method 3: Check Network Tab

1. Open DevTools → **Network** tab
2. Add an activity
3. Wait 2 seconds
4. Look for POST request to `/api/storage`
5. Check response status: **200 OK**

### Method 4: AWS Console (Direct Verification)

1. Log into **AWS Console**
2. Go to **S3** service
3. Open your bucket
4. Look for file: `activities.json` (or `activities` depending on config)
5. Download and open to see your data

---

## Troubleshooting

### Issue: "Failed to save" error

**Possible causes**:
1. **No S3 credentials** - Check `.env.local`:
   ```bash
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   S3_BUCKET_NAME=your-bucket-name
   ```

2. **Wrong bucket name** - Verify bucket name in AWS Console

3. **No internet connection** - Data is still saved locally (localStorage)

**Solution**:
- Fix credentials
- Click **"Save to S3"** button to retry manual sync

### Issue: "Synced" but data not in S3

**Check**:
1. Verify S3 API endpoint is working:
   ```bash
   curl http://localhost:3000/api/storage?key=activities
   ```

2. Check browser console for errors

3. Try manual save with **"Save to S3"** button

### Issue: Data lost after refresh

**Cause**: Data not synced to S3 before closing browser

**Solution**:
- Always wait for **"✅ Synced to S3 bucket"** indicator
- Or click **"Save to S3"** manually before closing

### Issue: Different data on different devices

**Cause**: Data synced from one device but not refreshed on another

**Solution**:
- Refresh the page (F5) to pull latest data from S3
- Or use the `refresh` function in code:
  ```typescript
  const { refresh } = useS3Storage(...)
  await refresh()
  ```

---

## API Endpoints

### GET /api/storage

Retrieve data from S3:
```bash
GET /api/storage?key=activities
```

**Response**:
```json
[
  {
    "id": "act_123",
    "name": "Research Assistant",
    ...
  }
]
```

### POST /api/storage

Save data to S3:
```bash
POST /api/storage
Content-Type: application/json

{
  "key": "activities",
  "value": [...]
}
```

**Response**:
```json
{
  "success": true
}
```

### DELETE /api/storage

Delete data from S3:
```bash
DELETE /api/storage?key=activities
```

---

## Data Flow Diagram

```
┌─────────────────┐
│  User Action    │
│ (Add Activity)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  setActivities  │ ← useS3Storage hook
│  (React state)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│localStorage│ │  Wait 2 sec  │ ← Auto-save debounce
│  (backup)  │ │   debounce   │
└─────────┘ └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │ POST /api/   │
            │   storage    │
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │  AWS S3 API  │
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │ S3 Bucket    │
            │ activities   │
            └──────────────┘
                   │
                   ▼
            ┌──────────────┐
            │ Toast notify │
            │ "✅ Saved!"  │
            └──────────────┘
```

---

## Best Practices

### 1. Wait for Sync Confirmation

❌ **Don't**:
```
Add activity → Close browser immediately
```

✅ **Do**:
```
Add activity → Wait for "✅ Synced to S3 bucket" → Close browser
```

### 2. Use Manual Save for Critical Data

❌ **Don't**:
```
Add 10 activities → Hope auto-save works → Close browser
```

✅ **Do**:
```
Add 10 activities → Click "Save to S3" → Wait for confirmation → Close
```

### 3. Verify Sync Before Important Actions

❌ **Don't**:
```
Add activities → Generate essays immediately (might use old data)
```

✅ **Do**:
```
Add activities → Wait for "✅ Synced" → Generate essays (uses latest data)
```

### 4. Check Status After Bulk Operations

When using **"Documents"** tab to extract activities from CV:
```
Upload CV → Extract activities → "Save All to Profile"
↓
Wait for "✅ Synced to S3 bucket"
↓
Verify count matches expected
```

---

## Performance Notes

### Debounce Timing

- **2 seconds** is optimal balance between:
  - **Too fast** (excessive API calls, S3 costs)
  - **Too slow** (user frustration, data loss risk)

### Caching Strategy

Data is cached in 3 layers:
1. **React state** (instant reads)
2. **localStorage** (survives refresh, no network needed)
3. **S3 bucket** (cloud backup, cross-device sync)

Read priority:
```
S3 (on page load) → localStorage (fallback) → defaultValue (last resort)
```

Write strategy:
```
React state (instant) → localStorage (instant) → S3 (debounced 2s)
```

---

## FAQ

### Q: Do I need to click "Save to S3" every time?

**A**: No! Auto-save happens after 2 seconds automatically. Manual save is optional for:
- Immediate sync before closing browser
- Verifying data is in S3
- Force sync after bulk operations

### Q: What happens if S3 fails?

**A**: Data is still saved in **localStorage** as backup. You won't lose data. Next time you click "Save to S3" or auto-save runs, it will retry.

### Q: Can I see what's in my S3 bucket?

**A**: Yes! Use AWS Console or AWS CLI:
```bash
aws s3 ls s3://your-bucket-name/
aws s3 cp s3://your-bucket-name/activities activities.json
cat activities.json
```

### Q: How much does S3 storage cost?

**A**: Very cheap:
- **Storage**: $0.023 per GB/month
- **Requests**: $0.0004 per 1000 requests

For typical usage (10 activities, 5 achievements, 10 courses):
- **Total size**: ~50 KB
- **Monthly cost**: ~$0.000001 storage + ~$0.0004 requests = **~$0.0004/month** (less than a penny!)

### Q: Is my data secure?

**A**: Yes!
- Data transmitted over **HTTPS**
- S3 bucket uses **IAM credentials**
- Access controlled by **AWS access keys**
- Only your application can read/write

---

## Testing Your Sync

Run this checklist to verify everything works:

### Test 1: Add Activity
- [ ] Go to `/activities`
- [ ] Click "Add Activity"
- [ ] Fill in: Name, Role, Organization
- [ ] Click "Save Activity"
- [ ] Wait 2-3 seconds
- [ ] See "✅ Synced to S3 bucket" indicator
- [ ] See toast: "✅ Activities saved to S3!"

### Test 2: Manual Save
- [ ] Add another activity
- [ ] Click "Save to S3" button immediately
- [ ] See "Saving to S3..." indicator
- [ ] See toast: "✅ Activities saved to S3!"
- [ ] Indicator changes to "✅ Synced to S3 bucket"

### Test 3: Verify in Essay Generation
- [ ] Go to `/transfer/mit`
- [ ] Click "Generate Essay"
- [ ] Check button text shows: `(X activities, Y achievements, GPA Z.ZZ)`
- [ ] If counts match what you added → **sync is working!**

### Test 4: Refresh Test
- [ ] Add an activity
- [ ] Wait for sync confirmation
- [ ] Refresh page (F5)
- [ ] Activity is still there → **S3 working!**
- [ ] Delete localStorage (DevTools → Application → localStorage → Clear)
- [ ] Refresh again
- [ ] Activity is still there → **S3 is the source of truth!**

---

## Success Criteria

Your S3 sync is working correctly if:

✅ Adding activities shows "✅ Synced to S3 bucket" within 2-3 seconds
✅ Manual "Save to S3" button triggers immediate save
✅ Toast notifications appear on successful save
✅ Data persists after page refresh
✅ Data persists after clearing localStorage
✅ Essay generation uses the latest activities count
✅ Multiple tabs/devices show the same data (after refresh)

---

## Next Steps

Now that S3 sync is working:

1. **Add Your Activities** → Go to `/activities` and add 5+ activities
2. **Add Achievements** → Switch to "Achievements" tab and add awards
3. **Verify Grades** → Check `/grades` has your UC Riverside transcript
4. **Generate Essays** → Go to `/transfer/mit` and generate essays with full profile!
5. **Monitor Sync** → Watch for "✅ Synced to S3 bucket" indicator

Your essays will now pull from **activities.json**, **achievements.json**, and **grades/transcript** in your S3 bucket! 🎉

---

## Support

If sync is not working:

1. **Check browser console** for errors
2. **Verify S3 credentials** in `.env.local`
3. **Test API endpoint**: `curl http://localhost:3000/api/storage?key=activities`
4. **Check AWS S3 bucket** in AWS Console
5. **Try manual save** with "Save to S3" button

**Remember**: Even if S3 fails, your data is safe in localStorage! 🛡️
