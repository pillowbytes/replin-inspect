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
  const requestsById = new Map(requests.map((r) => [r.id, r]));

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

  const normalized = findings.map((f) =>
    normalizeSeverity(f, requestsById.get(f.relatedRequestId ?? ''))
  );

  return dedupeFindings(normalized);
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

  const tokenValue = getTokenValue(token);

  return authRequests.flatMap((req) => {
    const authHeader = req.headers['authorization'] ?? '';
    const headerToken = extractBearerToken(authHeader);

    if (tokenValue && headerToken && headerToken !== tokenValue) {
      return [];
    }

    return tokenFindings
      .map((f) => {
        if (f.type === 'token_expired') {
          const exp = token.payload?.exp;
          if (exp && req.startTime) {
            const requestSec = Math.floor(req.startTime / 1000);
            if (requestSec <= exp) return null;
            return { ...f, relatedRequestId: req.id, confidence: 'high' } as Finding;
          }
        }

        return { ...f, relatedRequestId: req.id };
      })
      .filter((f): f is Finding => Boolean(f));
  });
}

function normalizeSeverity(finding: Finding, req?: HarRequest): Finding {
  if (!req) return finding;
  if (req.status >= 500 && finding.severity === 'warning') {
    return { ...finding, severity: 'critical' };
  }
  if (req.status >= 400 && finding.severity === 'info') {
    return { ...finding, severity: 'warning' };
  }
  return finding;
}

function extractBearerToken(header: string) {
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function getTokenValue(token: TokenInfo) {
  return (token as any).token ?? (token as any).raw ?? '';
}

/* =========================
   Deduplication
   ========================= */

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();

  return findings.filter(f => {
    const key = `${f.dedupeKey ?? f.type}|${f.relatedRequestId ?? 'global'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
