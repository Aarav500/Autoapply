# 🔄 Sync Local Activities to Production

## Problem

You're seeing **0 activities** on production because:

- **Local dev**: Activities stored in browser localStorage
- **Production**: Uses S3 storage (currently empty)

Your data exists locally but hasn't been uploaded to the S3 bucket yet.

---

## Solution: Export & Upload to S3

### Step 1: Export Your Local Data

Run this in your **local browser console** (on localhost:3000):

```javascript
// 1. Collect all your data from localStorage
const data = {
    activities: JSON.parse(localStorage.getItem('s3_cache_activities/all') ||
                          localStorage.getItem('s3_cache_activities') || '[]'),
    achievements: JSON.parse(localStorage.getItem('s3_cache_achievements/all') ||
                            localStorage.getItem('s3_cache_achievements') || '[]'),
    profile: JSON.parse(localStorage.getItem('s3_cache_cv/profile') ||
                       localStorage.getItem('s3_cache_cv-profile') || '{}')
};

// 2. Log the data
console.log('Your data:');
console.log('Activities:', data.activities.length);
console.log('Achievements:', data.achievements.length);
console.log('Has profile:', !!data.profile.name);

// 3. Copy this JSON to clipboard
copy(JSON.stringify(data, null, 2));
console.log('✓ Data copied to clipboard!');
```

### Step 2: Upload to Production

**Option A: Via API (Recommended)**

1. Go to your production site: http://3.238.126.54:3000
2. Open browser console (F12)
3. Paste this code (replace `YOUR_DATA` with the JSON you copied):

```javascript
const data = YOUR_DATA_HERE;  // Paste the JSON from Step 1

// Upload to production S3
fetch('/api/storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'activities/all', value: data.activities })
}).then(r => r.json()).then(console.log);

fetch('/api/storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'achievements/all', value: data.achievements })
}).then(r => r.json()).then(console.log);

fetch('/api/storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'cv/profile', value: data.profile })
}).then(r => r.json()).then(console.log);

console.log('✓ Upload complete! Refresh the page.');
```

**Option B: Manual Entry**

Just re-enter your activities on production:
1. Go to http://3.238.126.54:3000/activities
2. Click "+ Add Activity"
3. Fill in your activities manually

---

## Alternative: Check What's Actually in Production S3

Run this on production to see what's stored:

```javascript
// Check production storage
fetch('/api/storage?key=activities/all')
    .then(r => r.json())
    .then(data => console.log('Production activities:', data));

fetch('/api/storage?key=achievements/all')
    .then(r => r.json())
    .then(data => console.log('Production achievements:', data));
```

---

## Quick Check: Are you on Local or Production?

```javascript
// Run this in console
console.log('Current URL:', window.location.href);
// localhost:3000 = Local (uses localStorage)
// 3.238.126.54:3000 = Production (uses S3)
```

---

## Summary

| Environment | URL | Storage | Data Location |
|-------------|-----|---------|---------------|
| **Local Dev** | localhost:3000 | localStorage | Your browser |
| **Production** | 3.238.126.54:3000 | S3 Bucket | AWS (via GitHub secrets) |

**To sync:** Export from local → Upload to production S3

---

## After Upload

1. Refresh production page
2. Activities should appear
3. All future changes auto-save to S3

**Your data will then be persistent across all devices!**
