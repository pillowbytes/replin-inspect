// lib/utils/har.ts

import { HarTimings } from '@/types';

/**
 * HAR timings can be -1 or undefined.
 * Normalize everything to >= 0 numbers.
 */
export function normalizeTimings(
  timings?: Partial<HarTimings>
): HarTimings | undefined {
  if (!timings) return undefined;

  return {
    blocked: safeMs(timings.blocked),
    dns: safeMs(timings.dns),
    connect: safeMs(timings.connect),
    ssl: safeMs(timings.ssl),
    send: safeMs(timings.send),
    wait: safeMs(timings.wait),
    receive: safeMs(timings.receive),
  };
}

/**
 * Ensures milliseconds are integers >= 0
 */
export function safeMs(value?: number): number {
  if (typeof value !== 'number' || value < 0) return 0;
  return Math.round(value);
}

/**
 * Sum all timing phases into a total duration
 */
export function sumTimings(timings?: HarTimings): number {
  if (!timings) return 0;

  return (
    (timings.blocked ?? 0) +
    (timings.dns ?? 0) +
    (timings.connect ?? 0) +
    (timings.ssl ?? 0) +
    (timings.send ?? 0) +
    (timings.wait ?? 0) +
    (timings.receive ?? 0)
  );
}


/**
 * Parse URL safely and extract components
 */
export function parseUrlParts(url: string): {
  protocol?: string;
  domain?: string;
  path?: string;
  query?: string;
} {
  try {
    const u = new URL(url);
    return {
      protocol: u.protocol.replace(':', ''),
      domain: u.hostname,
      path: u.pathname,
      query: u.search ? u.search.slice(1) : undefined,
    };
  } catch {
    return {};
  }
}
