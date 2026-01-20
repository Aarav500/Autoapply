# ✅ Fix Your Production Activities - AUTOMATED

## The Issue

Your activities are in S3 but at the **wrong paths**:
- **Old paths:** `/data/activities.json`, `/data/achievements.json`
- **New paths:** `/data/activities/all.json`, `/data/achievements/all.json`

The system is looking for the new paths, but your data is stored under old paths.

---

## ⚡ One-Click Fix (FASTEST)

After your deployment completes:

### **Step 1: Visit the S3 Admin Page**
```
http://3.238.126.54:3000/s3-admin
```

### **Step 2: Click "Run Migration"**
- The page will show you what data exists
- Click the **"Run Migration"** button
- Wait 5-10 seconds

### **Step 3: Go to Activities**
```
http://3.238.126.54:3000/activities
```

**Done!** Your activities should now appear. ✅

---

## What This Does Automatically

The migration system:
1. ✅ Lists all keys in your S3 bucket
2. ✅ Finds data at old paths (`activities.json`)
3. ✅ Copies it to new paths (`activities/all.json`)
4. ✅ Keeps original data as backup
5. ✅ Shows you the results

**Migration map:**
```
activities         → activities/all
achievements       → achievements/all
cv-profile         → cv/profile
user-profile       → user/profile
enhanced-jobs      → jobs/all
saved-job-ids      → jobs/saved-ids
... and more
```

---

## Alternative: Check What's in S3 Right Now

### Via API Endpoint

Visit this URL in your browser:
```
http://3.238.126.54:3000/api/s3-migrate
```

**Example response:**
```json
{
  "configured": true,
  "bucket": "your-bucket-name",
  "totalKeys": 5,
  "allKeys": [
    "data/activities.json",
    "data/achievements.json",
    "data/cv-profile.json"
  ],
  "oldKeys": ["data/activities.json", ...],
  "newKeys": [],
  "needsMigration": true,
  "suggestion": "Old keys found. Run POST /api/s3-migrate to migrate."
}
```

### Manually Trigger Migration

```bash
# Using curl
curl -X POST http://3.238.126.54:3000/api/s3-migrate

# Or in browser console (F12)
fetch('/api/s3-migrate', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

---

## Features of S3 Admin Dashboard

The `/s3-admin` page shows:
- ✅ S3 configuration status
- ✅ Number of old keys found
- ✅ Number of new keys found
- ✅ All bucket keys (debug view)
- ✅ Migration status for each key
- ✅ Record counts migrated

---

## After Migration

1. **Old data is preserved** - Never deleted, only copied
2. **New keys are created** - System reads from these
3. **Activities appear** - Refresh activities page
4. **Future saves** - Automatically use new keys

---

## Troubleshooting

### "S3 Not Configured"
- Check GitHub secrets are set:
  - `S3_BUCKET_NAME`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`

### "No old keys found"
- Data might already be migrated
- Or no data exists in S3 yet
- Check the "All S3 Keys" section for what exists

### "Migration failed"
- Check S3 bucket permissions (read + write)
- Check bucket region matches `AWS_REGION`
- Look at error messages in migration results

---

## Summary

**Your activities ARE in S3, just wrong paths.**

**Fix:** Visit `/s3-admin` → Click "Run Migration" → Done ✅

**Time:** 30 seconds

**Result:** All activities appear on production

---

**Status:** ✅ Code deployed to GitHub
**Action:** Visit http://3.238.126.54:3000/s3-admin after deployment
