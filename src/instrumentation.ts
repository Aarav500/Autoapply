export async function register() {
  // Only run in production runtime, not during build
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_PHASE !== 'phase-production-build') {
    const { initializeScheduler } = await import('./services/scheduler/init');
    initializeScheduler();
  }
}
