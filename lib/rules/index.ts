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
    findings.push(...attachTokenFindings(requests, token));
  }

  return dedupeFindings(findings);
}

function attachTokenFindings(
  requests: HarRequest[],
  token: TokenInfo
): Finding[] {
  const tokenFindings = detectTokenIssues(token);
  if (tokenFindings.length === 0) return [];

  const authRequests = requests.filter(
    (r) => Boolean(r.headers['authorization'])
  );
  if (authRequests.length === 0) return [];

  return authRequests.flatMap((req) =>
    tokenFindings.map((f) => ({
      ...f,
      relatedRequestId: req.id,
    }))
  );
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
