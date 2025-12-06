// lib/debug.ts

/**
 * Debug flag for analytics-related UIs.
 *
 * Usage:
 *   - Add NEXT_PUBLIC_ANALYTICS_DEBUG=1 to .env.local
 *   - Rebuild / restart dev server
 *   - Pages that import this can conditionally render debug info
 */
export const ENABLE_ANALYTICS_DEBUG =
  process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === '1';
