import { Finding, HarRequest, TokenInfo } from '@/types';
import {
  detectFailedRequests,
  detectRedirectLoops,
  detectMissingHeaders,
  detectSlowRequests,
  detectLargePayloads,
  detectAuthRequestFailures,
  detectCorsIssues,
  detectTimingAnomalies,
} from './networkRules';
import { detectTokenIssues } from './tokenRules';

export interface RuleContext {
  requiredAuthHeader?: string;
}

export function runAllRules(
  requests: HarRequest[],
  token: TokenInfo | null,
  context: RuleContext = { requiredAuthHeader: 'Authorization' }
): Finding[] {
  const requiredHeader = context.requiredAuthHeader ?? 'Authorization';

  const findings: Finding[] = [
    ...detectFailedRequests(requests),
    ...detectRedirectLoops(requests),
    ...detectMissingHeaders(requests, requiredHeader),
    ...detectSlowRequests(requests),
    ...detectLargePayloads(requests),
    ...detectAuthRequestFailures(requests),
    ...detectCorsIssues(requests),
    ...detectTimingAnomalies(requests),
  ];

  if (token) {
    findings.push(...detectTokenIssues(token));
  }

  return dedupeFindings(findings);
}

/* =========================
   Deduplication
   ========================= */

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();

  return findings.filter(f => {
    const key = `${f.type}|${f.relatedRequestId ?? 'global'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
