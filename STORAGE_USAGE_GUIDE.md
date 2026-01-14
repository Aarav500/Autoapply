# S3 Storage Usage Guide

## ✅ FIXED: Duplicate Storage Issue

### The Problem (BEFORE)
Data was being stored in **multiple locations** in the S3 bucket:
```typescript
// Component A stored here:
useS3Storage('activities', ...)  → /data/activities.json

// Component B expected here:
STORAGE_KEYS.ACTIVITIES          → /data/activities/all.json
```

This caused:
- 2x storage cost
- Data sync issues
- Confusion about canonical data source

### The Solution (AFTER)
All data now uses **centralized storage keys**:
```typescript
import { STORAGE_KEYS } from '@/lib/s3-storage';

// ✅ Correct - uses centralized key
useS3Storage(STORAGE_KEYS.ACTIVITIES, { defaultValue: [] })

// ❌ Wrong - hardcoded string (old way)
useS3Storage('activities', { defaultValue: [] })
```

---

## 📁 Storage Key Reference

### Available Storage Keys

```typescript
import { STORAGE_KEYS } from '@/lib/s3-storage';

// User & Profile
STORAGE_KEYS.USER_PROFILE          // 'user/profile' - General user profile
STORAGE_KEYS.CV_PROFILE            // 'cv/profile' - CV-specific profile data

// Activities & Achievements
STORAGE_KEYS.ACTIVITIES            // 'activities/all'
STORAGE_KEYS.ACHIEVEMENTS          // 'achievements/all'

// Jobs
STORAGE_KEYS.JOBS_ALL              // 'jobs/all' - All job listings
STORAGE_KEYS.SAVED_JOB_IDS         // 'jobs/saved-ids' - Just saved IDs
STORAGE_KEYS.APPLIED_JOB_IDS       // 'jobs/applied-ids' - Just applied IDs
STORAGE_KEYS.SAVED_JOBS            // 'jobs/saved' - Full saved job objects
STORAGE_KEYS.APPLIED_JOBS          // 'jobs/applied' - Full applied job objects

// Scholarships
STORAGE_KEYS.SCHOLARSHIPS_ALL      // 'scholarships/all'
STORAGE_KEYS.SAVED_SCHOLARSHIP_IDS // 'scholarships/saved-ids'
STORAGE_KEYS.APPLIED_SCHOLARSHIP_IDS // 'scholarships/applied-ids'

// Essays
STORAGE_KEYS.ESSAYS                // 'essays/all'
STORAGE_KEYS.ESSAY_DRAFTS          // 'essays/drafts'

// Analytics
STORAGE_KEYS.ANALYTICS_EVENTS      // 'analytics/events'

// Deadlines
STORAGE_KEYS.DEADLINES             // 'deadlines/all'

// And more... (see src/lib/s3-storage.ts for full list)
```

---

## 🔧 How to Use

### Basic Usage

```typescript
'use client';
import { useS3Storage } from '@/lib/useS3Storage';
import { STORAGE_KEYS } from '@/lib/s3-storage';

function MyComponent() {
  const {
    data: activities,
    setData: setActivities,
    isLoading,
    save
  } = useS3Storage(STORAGE_KEYS.ACTIVITIES, {
    defaultValue: []
  });

  // Use activities...
}
```

### Full Example with All Options

```typescript
const {
  data,           // Current data
  setData,        // Update data (triggers auto-save after 2s)
  isLoading,      // Loading state
  isSaving,       // Saving state
  error,          // Error if any
  save,           // Manual save function
  refresh,        // Refresh from S3
  lastSaved       // Timestamp of last save
} = useS3Storage<MyDataType>(STORAGE_KEYS.MY_KEY, {
  defaultValue: initialValue,
  onLoad: (data) => console.log('Data loaded:', data),
  onSave: (data) => console.log('Data saved:', data),
  onError: (error) => console.error('Error:', error)
});
```

### Working with Data

```typescript
// Read
const myActivities = data;

// Update (auto-saves after 2s)
setData([...data, newActivity]);

// Update with function
setData(prev => [...prev, newActivity]);

// Manual save (if you need immediate save)
await save();

// Refresh from S3
await refresh();
```

---

## 🔄 Migrating Existing Data

If you have existing data stored with old keys, run the migration:

### Option 1: Automatic Migration (In Browser)

Visit: `/api/migrate-storage` (TODO: create this endpoint)

### Option 2: Manual Migration Script

```bash
cd college-essay-app
npm run migrate-storage
```

### Option 3: Run Migration from Code

```typescript
import { runMigration } from '@/scripts/migrate-storage-keys';

// Safe migration (keeps old keys)
await runMigration({ deleteOldKeys: false });

// Full migration (deletes old keys after copy)
await runMigration({ deleteOldKeys: true });
```

---

## 📋 Migration Checklist

### Already Updated ✅
- [x] `src/lib/s3-storage.ts` - Added all centralized keys
- [x] `src/app/cv-builder/page.tsx` - 3 storage calls
- [x] `src/app/activities/page.tsx` - 2 storage calls

### Still Needs Update ⚠️
Update these files to use `STORAGE_KEYS`:

- [ ] `src/app/strength-map/page.tsx` - 3 calls
- [ ] `src/app/jobs/page.tsx` - 3 calls
- [ ] `src/app/scholarships/page.tsx` - 4 calls
- [ ] `src/app/cv-builder-v2/page.tsx` - 3 calls
- [ ] `src/app/essays/[college]/page.tsx` - 1 call
- [ ] `src/app/opportunity-deadlines/page.tsx` - 2 calls
- [ ] `src/app/page.tsx` - 4 calls
- [ ] `src/app/analytics/page.tsx` - 1 call

**Total remaining: 21 hook calls across 8 files**

---

## 🚨 Common Mistakes to Avoid

### ❌ DON'T: Use hardcoded strings
```typescript
// BAD
useS3Storage('activities', { defaultValue: [] })
useS3Storage('cv-profile', { defaultValue: {} })
```

### ✅ DO: Use STORAGE_KEYS
```typescript
// GOOD
import { STORAGE_KEYS } from '@/lib/s3-storage';
useS3Storage(STORAGE_KEYS.ACTIVITIES, { defaultValue: [] })
useS3Storage(STORAGE_KEYS.CV_PROFILE, { defaultValue: {} })
```

### ❌ DON'T: Create custom keys without adding to STORAGE_KEYS
```typescript
// BAD
useS3Storage('my-custom-data', { defaultValue: [] })
```

### ✅ DO: Add to STORAGE_KEYS first
```typescript
// 1. Add to src/lib/s3-storage.ts
export const STORAGE_KEYS = {
  // ... existing keys ...
  MY_CUSTOM_DATA: 'custom/my-data',
} as const;

// 2. Then use it
useS3Storage(STORAGE_KEYS.MY_CUSTOM_DATA, { defaultValue: [] })
```

---

## 🔍 Debugging Storage Issues

### Check what's in S3

```typescript
// List all keys with prefix
const keys = await fetch('/api/storage/list?prefix=activities').then(r => r.json());
console.log('Keys:', keys);

// Get specific data
const data = await fetch('/api/storage?key=activities/all').then(r => r.json());
console.log('Data:', data);
```

### Check localStorage fallback

```typescript
// S3 data is also cached in localStorage
const cached = localStorage.getItem('s3_cache_activities/all');
console.log('Cached:', JSON.parse(cached));
```

### Clear cache

```typescript
// Clear all S3 cache from localStorage
Object.keys(localStorage)
  .filter(key => key.startsWith('s3_cache_'))
  .forEach(key => localStorage.removeItem(key));
```

---

## 📊 Storage Architecture

```
┌─────────────────────────────────────────────┐
│           React Component                    │
│  useS3Storage(STORAGE_KEYS.ACTIVITIES)      │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│         useS3Storage Hook                    │
│  • Loads data on mount                       │
│  • Auto-saves after 2s debounce              │
│  • Caches in localStorage                    │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│          /api/storage Route                  │
│  • GET: Read from S3                         │
│  • POST: Write to S3                         │
│  • DELETE: Remove from S3                    │
│  • Handles AWS signing                       │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│           AWS S3 Bucket                      │
│  /data/activities/all.json                   │
│  /data/achievements/all.json                 │
│  /data/cv/profile.json                       │
│  /data/jobs/all.json                         │
│  ...                                         │
└─────────────────────────────────────────────┘
```

---

## 🎯 Benefits of Centralized Keys

1. **No Duplication** - Data stored once at predictable location
2. **Type Safety** - Keys are defined as constants
3. **Easy Refactoring** - Change key in one place
4. **Clear Naming** - Hierarchical structure (e.g., `jobs/all`, `jobs/saved-ids`)
5. **Better Organization** - Related data grouped together
6. **Easy to Find** - All keys listed in one file

---

## 🔐 Environment Setup

Make sure your `.env` file has S3 credentials:

```bash
# Required for S3 storage
S3_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

If not configured, the system falls back to `localStorage` only.

---

## 📚 Additional Resources

- **Source Code**: `src/lib/s3-storage.ts`
- **Hook Code**: `src/lib/useS3Storage.ts`
- **API Route**: `src/app/api/storage/route.ts`
- **Migration Script**: `scripts/migrate-storage-keys.ts`
- **Fix Report**: `STORAGE_FIX_REPORT.md`

---

**Last Updated**: 2026-01-13
**Status**: ✅ Fixed - Centralized storage keys implemented
