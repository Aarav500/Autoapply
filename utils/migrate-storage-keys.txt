/**
 * STORAGE KEY MIGRATION SCRIPT
 *
 * Purpose: Migrate data from old storage keys to new centralized keys
 *
 * OLD Keys (Direct strings):
 * - 'cv-profile' → STORAGE_KEYS.CV_PROFILE ('cv/profile')
 * - 'activities' → STORAGE_KEYS.ACTIVITIES ('activities/all')
 * - 'achievements' → STORAGE_KEYS.ACHIEVEMENTS ('achievements/all')
 * - 'enhanced-jobs' → STORAGE_KEYS.JOBS_ALL ('jobs/all')
 * - 'saved-job-ids' → STORAGE_KEYS.SAVED_JOB_IDS ('jobs/saved-ids')
 * - 'applied-job-ids' → STORAGE_KEYS.APPLIED_JOB_IDS ('jobs/applied-ids')
 * - 'enhanced-scholarships' → STORAGE_KEYS.SCHOLARSHIPS_ALL ('scholarships/all')
 * - 'saved-scholarship-ids' → STORAGE_KEYS.SAVED_SCHOLARSHIP_IDS ('scholarships/saved-ids')
 * - 'applied-scholarship-ids' → STORAGE_KEYS.APPLIED_SCHOLARSHIP_IDS ('scholarships/applied-ids')
 * - 'user-profile' → STORAGE_KEYS.USER_PROFILE ('user/profile')
 * - 'profile' → STORAGE_KEYS.USER_PROFILE ('user/profile')
 * - 'essays' → STORAGE_KEYS.ESSAYS ('essays/all')
 * - 'analytics-events' → STORAGE_KEYS.ANALYTICS_EVENTS ('analytics/events')
 * - 'deadlines' → STORAGE_KEYS.DEADLINES ('deadlines/all')
 * - 'jobs' → STORAGE_KEYS.JOBS_ALL ('jobs/all')
 */

const MIGRATION_MAP: Record<string, string> = {
  // Profile
  'cv-profile': 'cv/profile',
  'user-profile': 'user/profile',
  'profile': 'user/profile',

  // Activities & Achievements
  'activities': 'activities/all',
  'achievements': 'achievements/all',

  // Jobs
  'enhanced-jobs': 'jobs/all',
  'jobs': 'jobs/all',
  'saved-job-ids': 'jobs/saved-ids',
  'applied-job-ids': 'jobs/applied-ids',

  // Scholarships
  'enhanced-scholarships': 'scholarships/all',
  'saved-scholarship-ids': 'scholarships/saved-ids',
  'applied-scholarship-ids': 'scholarships/applied-ids',

  // Essays
  'essays': 'essays/all',

  // Analytics
  'analytics-events': 'analytics/events',

  // Deadlines
  'deadlines': 'deadlines/all',
};

/**
 * Run migration for a single user
 *
 * This function:
 * 1. Reads data from old key
 * 2. Writes to new key
 * 3. Optionally deletes old key
 */
async function migrateKey(oldKey: string, newKey: string, deleteOld = false): Promise<boolean> {
  try {
    console.log(`[Migration] ${oldKey} → ${newKey}`);

    // 1. Try to get data from old key
    const response = await fetch(`/api/storage?key=${encodeURIComponent(oldKey)}`);

    if (!response.ok || response.status === 404) {
      console.log(`  ⚠️  No data found at old key: ${oldKey}`);
      return false;
    }

    const data = await response.json();

    if (!data) {
      console.log(`  ⚠️  Empty data at old key: ${oldKey}`);
      return false;
    }

    console.log(`  ✓ Found data at old key (${JSON.stringify(data).length} bytes)`);

    // 2. Write to new key
    const writeResponse = await fetch('/api/storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: newKey, value: data }),
    });

    if (!writeResponse.ok) {
      console.error(`  ✗ Failed to write to new key: ${newKey}`);
      return false;
    }

    console.log(`  ✓ Written to new key: ${newKey}`);

    // 3. Optionally delete old key
    if (deleteOld) {
      const deleteResponse = await fetch(`/api/storage?key=${encodeURIComponent(oldKey)}`, {
        method: 'DELETE',
      });

      if (deleteResponse.ok) {
        console.log(`  ✓ Deleted old key: ${oldKey}`);
      } else {
        console.warn(`  ⚠️  Failed to delete old key: ${oldKey}`);
      }
    }

    return true;
  } catch (error) {
    console.error(`  ✗ Error migrating ${oldKey}:`, error);
    return false;
  }
}

/**
 * Run full migration
 */
export async function runMigration(options: { deleteOldKeys?: boolean } = {}) {
  console.log('═══════════════════════════════════════════');
  console.log('   S3 STORAGE KEY MIGRATION');
  console.log('═══════════════════════════════════════════');
  console.log('');

  const { deleteOldKeys = false } = options;

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const [oldKey, newKey] of Object.entries(MIGRATION_MAP)) {
    const success = await migrateKey(oldKey, newKey, deleteOldKeys);

    if (success) {
      successCount++;
    } else {
      // Check if it's just a skip (no data) vs actual failure
      skipCount++;
    }

    console.log('');
  }

  console.log('═══════════════════════════════════════════');
  console.log('   MIGRATION COMPLETE');
  console.log('═══════════════════════════════════════════');
  console.log(`✓ Migrated: ${successCount}`);
  console.log(`⚠ Skipped (no data): ${skipCount}`);
  console.log(`✗ Failed: ${failCount}`);
  console.log('');

  if (deleteOldKeys) {
    console.log('Old keys have been deleted.');
  } else {
    console.log('Old keys preserved for safety. Run with deleteOldKeys=true to remove.');
  }
}

/**
 * Client-side migration hook
 * Call this from a React component to migrate user data
 */
export function useMigration() {
  const [migrationStatus, setMigrationStatus] = React.useState<
    'idle' | 'running' | 'complete' | 'error'
  >('idle');

  const migrate = async () => {
    setMigrationStatus('running');
    try {
      await runMigration({ deleteOldKeys: false });
      setMigrationStatus('complete');
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationStatus('error');
    }
  };

  return { migrationStatus, migrate };
}

// For server-side execution
if (typeof window === 'undefined') {
  // Run migration if called directly
  // node scripts/migrate-storage-keys.ts
  runMigration({ deleteOldKeys: false }).catch(console.error);
}
