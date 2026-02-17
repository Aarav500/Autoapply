export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeScheduler } = await import('./services/scheduler/init');
    initializeScheduler();
  }
}
