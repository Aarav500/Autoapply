# S3 Storage Duplication Fix Report

## Problem Identified

The application is storing data in **TWO different locations** within the S3 bucket, causing duplication and potential data inconsistency.

### Current Duplicate Storage

| Data Type | Location 1 (Direct Hook) | Location 2 (Centralized) |
|-----------|-------------------------|--------------------------|
| User Profile | `/data/cv-profile.json` | `/data/user/profile.json` |
| Activities | `/data/activities.json` | `/data/activities/all.json` |
| Achievements | `/data/achievements.json` | *(No centralized key)* |
| Jobs | `/data/enhanced-jobs.json` | `/data/jobs/saved.json` |
| Scholarships | `/data/enhanced-scholarships.json` | `/data/scholarships/saved.json` |

### Root Cause

1. **`useS3Storage` hook** accepts raw string keys like `'activities'`
2. **`s3-storage.ts`** defines structured keys like `'activities/all'`
3. Components use both approaches **inconsistently**

### Impact

- **Duplicate data** stored in bucket (2x storage cost)
- **Data sync issues** when one location updates but not the other
- **Confusion** about which data source is canonical
- **Migration complexity** when trying to consolidate

## Solution

### Phase 1: Create Unified Storage Constants ✅

File: `src/lib/storage-keys.ts`

```typescript
// Centralized storage key constants
export const STORAGE_KEYS = {
  // User & Profile
  USER_PROFILE: 'user/profile',
  CV_PROFILE: 'cv/profile',  // Separate CV-specific profile

  // Activities & Achievements
  ACTIVITIES: 'activities/all',
  ACHIEVEMENTS: 'achievements/all',

  // Jobs & Scholarships
  JOBS: 'jobs/all',
  SAVED_JOBS: 'jobs/saved-ids',
  APPLIED_JOBS: 'jobs/applied-ids',

  SCHOLARSHIPS: 'scholarships/all',
  SAVED_SCHOLARSHIPS: 'scholarships/saved-ids',
  APPLIED_SCHOLARSHIPS: 'scholarships/applied-ids',

  // Essays
  ESSAYS: 'essays/all',
  ESSAY_DRAFTS: 'essays/drafts',

  // Analytics
  ANALYTICS: 'analytics/events',

  // Deadlines
  DEADLINES: 'deadlines/all',
} as const;
```

### Phase 2: Update Hook Calls

Replace all instances of:
```typescript
useS3Storage('activities', { defaultValue: [] })
```

With:
```typescript
import { STORAGE_KEYS } from '@/lib/storage-keys';
useS3Storage(STORAGE_KEYS.ACTIVITIES, { defaultValue: [] })
```

### Phase 3: Data Migration Script

Create `/scripts/migrate-storage.ts` to move data from old keys to new keys.

## Files Requiring Updates

### High Priority (Data Storage)
- [x] `src/lib/s3-storage.ts` - Already has STORAGE_KEYS
- [ ] `src/app/cv-builder/page.tsx` - 3 storage calls
- [ ] `src/app/activities/page.tsx` - 2 storage calls
- [ ] `src/app/strength-map/page.tsx` - 3 storage calls
- [ ] `src/app/jobs/page.tsx` - 3 storage calls
- [ ] `src/app/scholarships/page.tsx` - 4 storage calls
- [ ] `src/app/cv-builder-v2/page.tsx` - 3 storage calls
- [ ] `src/app/essays/[college]/page.tsx` - 1 storage call
- [ ] `src/app/opportunity-deadlines/page.tsx` - 2 storage calls
- [ ] `src/app/page.tsx` - 4 storage calls
- [ ] `src/app/analytics/page.tsx` - 1 storage call

### Total Hook Calls to Update: 26

## Migration Strategy

### Option A: Hard Migration (Recommended)
1. Update all code to use centralized keys
2. Run migration script to move data
3. Delete old keys from S3

**Pros**: Clean, no duplication
**Cons**: Requires coordination, potential data loss if migration fails

### Option B: Soft Migration (Safer)
1. Update all code to use centralized keys
2. Keep fallback logic to read from old keys
3. Gradually phase out old keys

**Pros**: No data loss, gradual transition
**Cons**: Continued duplication during transition

## Recommended Fix (Step-by-Step)

```bash
# 1. Create unified storage keys file
# Already exists in src/lib/s3-storage.ts

# 2. Update all component imports
# Replace direct strings with STORAGE_KEYS constants

# 3. Add migration helper
# Create src/lib/storage-migration.ts

# 4. Test in development
# Verify data loads correctly

# 5. Deploy to production with migration
# Run one-time migration script
```

## Next Steps

1. **Approve this approach**
2. **Create storage-keys.ts** (or export from existing s3-storage.ts)
3. **Update all 26 hook calls** across 11 files
4. **Add migration script** to move existing data
5. **Test thoroughly** before deploying

---

**Status**: Analysis Complete ✅
**Next Action**: Implement unified storage keys and update components
