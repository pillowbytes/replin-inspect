import { HarRequest, TokenInfo, Finding } from '@/types';
import {
  detectFailedRequests,
  detectRedirectLoops,
  detectMissingHeaders,
  // add other network rule imports here
} from './networkRules';
import {
  detectTokenExpiry,
  // add other token rule imports here
} from './tokenRules';

/**
 * Run all defined rule functions against the HAR requests and token info.
 *
 * @param requests An array of parsed HAR entries.
 * @param token    Decoded token information (may be null if no token provided).
 * @param headerToCheck Which request header to consider "required" (e.g. Authorization).
 * @returns A flattened array of all findings.
 */
export function runAllRules(
  requests: HarRequest[],
  token: TokenInfo | null,
  headerToCheck: string = 'Authorization'
): Finding[] {
  const findings: Finding[] = [];

  // Network-related detections
  findings.push(...detectFailedRequests(requests));
  findings.push(...detectRedirectLoops(requests));
  findings.push(...detectMissingHeaders(requests, headerToCheck));
  // TODO: call other network rule functions here as you implement them

  // Token-related detections
  if (token) {
    findings.push(...detectTokenExpiry(token));
    // TODO: call other token rule functions here as you implement them
  }

  return findings;
}
