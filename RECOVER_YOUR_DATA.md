# 🔧 Recover Your Activities Data

## What Happened

After the storage system update, your activities appear missing because they're stored under the **old localStorage keys**. The data is still there - it just needs to be migrated to the new key names.

**Old keys:** `s3_cache_activities`, `s3_cache_achievements`, `s3_cache_cv-profile`
**New keys:** `s3_cache_activities/all`, `s3_cache_achievements/all`, `s3_cache_cv/profile`

---

## Quick Fix (2 minutes)

### Option 1: Use the Migration Page (Recommended)

1. **Visit the migration page:**
   ```
   http://localhost:3000/migrate-storage
   ```

2. **Click "Run Migration"**
   - The page will show you what data exists
   - Click the migration button
   - Wait 2 seconds

3. **Refresh your activities page**
   ```
   http://localhost:3000/activities
   ```

4. **Done!** Your activities should now be visible

---

### Option 2: Manual Migration (Browser Console)

If you prefer to do it manually:

1. **Open browser DevTools** (Press F12)

2. **Go to Console tab**

3. **Paste this code and press Enter:**

```javascript
// Check what data you have
console.log('Old activities:', localStorage.getItem('s3_cache_activities') ? 'Found' : 'Not found');
console.log('New activities:', localStorage.getItem('s3_cache_activities/all') ? 'Found' : 'Not found');

// Migrate activities
const oldActivities = localStorage.getItem('s3_cache_activities');
if (oldActivities && !localStorage.getItem('s3_cache_activities/all')) {
    localStorage.setItem('s3_cache_activities/all', oldActivities);
    console.log('✓ Activities migrated');
}

// Migrate achievements
const oldAchievements = localStorage.getItem('s3_cache_achievements');
if (oldAchievements && !localStorage.getItem('s3_cache_achievements/all')) {
    localStorage.setItem('s3_cache_achievements/all', oldAchievements);
    console.log('✓ Achievements migrated');
}

// Migrate profile
const oldProfile = localStorage.getItem('s3_cache_cv-profile');
if (oldProfile && !localStorage.getItem('s3_cache_cv/profile')) {
    localStorage.setItem('s3_cache_cv/profile', oldProfile);
    console.log('✓ Profile migrated');
}

console.log('✅ Migration complete! Refresh the page.');
```

4. **Refresh the page** (F5 or Ctrl+R)

---

### Option 3: Debug Endpoint

Visit this endpoint to get migration instructions:
```
http://localhost:3000/api/storage-debug
```

---

## Why This Happened

The storage system was updated to use **centralized storage keys** to fix duplicate storage issues. The new system:

- **Old way:** Each component used raw strings (`'activities'`, `'cv-profile'`)
- **New way:** All components use `STORAGE_KEYS.ACTIVITIES`, `STORAGE_KEYS.CV_PROFILE`

This prevents duplicate storage and makes the codebase more maintainable.

---

## Data Safety

✅ **Your data is completely safe**
- It's still in your browser's localStorage
- Migration only **copies** data, never deletes
- Old keys remain untouched as backup

---

## Production Deployment (S3 Storage)

When deployed to production with S3 credentials:
- Data is in S3 bucket (from GitHub secrets)
- localStorage is just a cache
- Migration happens automatically via the hook

The migration page also works in production if needed.

---

## Need Help?

1. **Check what's in localStorage:**
   ```javascript
   // In browser console
   Object.keys(localStorage).filter(k => k.includes('s3_cache'))
   ```

2. **Clear everything and start fresh:**
   ```javascript
   // WARNING: This deletes all local data
   localStorage.clear();
   // Then refresh and re-enter your activities
   ```

3. **Export your data first:**
   ```javascript
   // Save your data to a file before clearing
   const backup = {};
   Object.keys(localStorage).forEach(key => {
     if (key.includes('s3_cache')) {
       backup[key] = localStorage.getItem(key);
     }
   });
   console.log(JSON.stringify(backup));
   // Copy this output to a text file
   ```

---

## Files Added

- `/migrate-storage` - Migration page UI
- `/api/storage-debug` - Debug endpoint
- `MigrationBanner.tsx` - Warning banner component

---

**Status:** ✅ Migration system deployed
**Action:** Visit `/migrate-storage` to recover your data
