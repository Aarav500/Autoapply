// Polyfills for Node.js compatibility
// Required for certain PDF parsing libraries and Buffer operations

// Ensure Buffer is available globally (needed for some libraries)
if (typeof globalThis.Buffer === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (globalThis as Record<string, unknown>).Buffer = require('buffer').Buffer;
}

// Export empty to make this a module
export {};
