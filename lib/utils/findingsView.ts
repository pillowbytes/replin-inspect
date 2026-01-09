import { Finding, FindingType, HarRequest } from '@/types';

export type FindingsSeverity = Finding['severity'];

export interface TopCause {
  type: FindingType;
  title: string;
  severity: FindingsSeverity;
  count: number;
  confidence?: Finding['confidence'];
  summary: string;
  evidence: string[];
  sampleRequestId?: string;
}

export interface AffectedRequest {
  requestId: string;
  method: string;
  url: string;
  path?: string;
  severity: FindingsSeverity;
  causeTitle: string;
  evidence: string[];
}

const SEVERITY_RANK: Record<FindingsSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

const TYPE_PRIORITY: FindingType[] = [
  'failed_request',
  'auth_request_failed',
  'auth_forbidden',
  'cors_preflight_failed',
  'cors_issue',
  'token_expired',
  'token_invalid_scope',
  'token_invalid_audience',
  'slow_request',
  'dns_slow',
  'ssl_slow',
  'large_payload',
  'missing_header',
  'redirect_loop',
  'other',
];

export function buildFindingsViewModel(
  findings: Finding[],
  requests: HarRequest[]
): {
  topCauses: TopCause[];
  affectedRequests: AffectedRequest[];
} {
  const reqById = new Map(requests.map((r) => [r.id, r]));
  const grouped = new Map<FindingType, Finding[]>();

  findings.forEach((f) => {
    const list = grouped.get(f.type) ?? [];
    list.push(f);
    grouped.set(f.type, list);
  });

  const topCauses = Array.from(grouped.entries()).map(([type, items]) => {
    const sample = items[0];
    const req = sample.relatedRequestId
      ? reqById.get(sample.relatedRequestId)
      : undefined;

    return {
      type,
      title: titleForFinding(type),
      severity: highestSeverity(items),
      confidence: sample.confidence,
      count: items.length,
      summary: summaryForFinding(type, req, sample),
      evidence: evidenceForFinding(type, req, sample),
      sampleRequestId: sample.relatedRequestId,
    };
  });

  topCauses.sort((a, b) => {
    const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sev !== 0) return sev;
    return b.count - a.count;
  });

  const affectedRequests: AffectedRequest[] = [];
  const findingsByRequest = new Map<string, Finding[]>();

  findings.forEach((f) => {
    if (!f.relatedRequestId) return;
    const list = findingsByRequest.get(f.relatedRequestId) ?? [];
    list.push(f);
    findingsByRequest.set(f.relatedRequestId, list);
  });

  findingsByRequest.forEach((list, requestId) => {
    const req = reqById.get(requestId);
    if (!req) return;
    const dominant = pickDominantFinding(list);
    affectedRequests.push({
      requestId,
      method: req.method,
      url: req.url,
      path: req.path,
      severity: dominant.severity,
      causeTitle: titleForFinding(dominant.type),
      evidence: evidenceForFinding(dominant.type, req, dominant),
    });
  });

  affectedRequests.sort((a, b) => {
    const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sev !== 0) return sev;
    return a.url.localeCompare(b.url);
  });

  return { topCauses, affectedRequests };
}

function highestSeverity(findings: Finding[]): FindingsSeverity {
  return findings.reduce((acc, f) => {
    return SEVERITY_RANK[f.severity] > SEVERITY_RANK[acc] ? f.severity : acc;
  }, 'info' as FindingsSeverity);
}

function pickDominantFinding(findings: Finding[]): Finding {
  return findings
    .slice()
    .sort((a, b) => {
      const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (sev !== 0) return sev;
      return (
        TYPE_PRIORITY.indexOf(a.type) - TYPE_PRIORITY.indexOf(b.type)
      );
    })[0];
}

function titleForFinding(type: FindingType) {
  const titles: Record<FindingType, string> = {
    failed_request: 'Request failed',
    redirect_loop: 'Redirect loop',
    slow_request: 'Slow request',
    large_payload: 'Large payload',
    missing_header: 'Missing header',
    cors_error: 'CORS error',
    cors_issue: 'CORS headers missing',
    cors_preflight_failed: 'CORS preflight failed',
    auth_request_failed: 'Unauthorized with credentials',
    auth_forbidden: 'Forbidden with credentials',
    token_expired: 'Token expired',
    token_invalid_scope: 'Token missing scope',
    token_invalid_audience: 'Token audience mismatch',
    dns_slow: 'DNS slow',
    ssl_slow: 'TLS handshake slow',
    other: 'Other issue',
  };

  return titles[type];
}

function summaryForFinding(
  type: FindingType,
  req?: HarRequest,
  finding?: Finding
) {
  if (!req) return finding?.description ?? '';

  switch (type) {
    case 'failed_request':
      return `Status ${req.status}`;
    case 'slow_request':
      return `Duration ${Math.round(req.duration)} ms`;
    case 'large_payload':
      return `Response ${formatBytes(
        req.responseSize ?? req.sizes?.responseTotal ?? 0
      )}`;
    case 'token_expired':
      return 'Token expired before request';
    case 'cors_preflight_failed':
      return `OPTIONS ${req.status}`;
    case 'auth_request_failed':
    case 'auth_forbidden':
      return `Status ${req.status}`;
    default:
      return finding?.description ?? '';
  }
}

function evidenceForFinding(
  type: FindingType,
  req?: HarRequest,
  finding?: Finding
) {
  if (!req) return finding?.description ? [finding.description] : [];

  switch (type) {
    case 'large_payload': {
      const requestSize = formatBytes(
        req.requestSize ?? req.sizes?.requestTotal ?? 0
      );
      const responseSize = formatBytes(
        req.responseSize ?? req.sizes?.responseTotal ?? 0
      );
      return [`Request ${requestSize}`, `Response ${responseSize}`];
    }
    case 'slow_request':
      return [`Duration ${Math.round(req.duration)} ms`];
    case 'dns_slow':
      return [`DNS ${Math.round(req.timings?.dns ?? 0)} ms`];
    case 'ssl_slow':
      return [`SSL ${Math.round(req.timings?.ssl ?? 0)} ms`];
    case 'cors_issue':
    case 'cors_preflight_failed': {
      const allowOrigin =
        req.responseHeaders['access-control-allow-origin'] ?? 'missing';
      return [`Allow-Origin ${allowOrigin}`];
    }
    case 'auth_request_failed':
    case 'auth_forbidden':
      return [`Status ${req.status}`];
    case 'token_expired':
      return ['Token expired before request time'];
    default:
      return finding?.description ? [finding.description] : [];
  }
}

function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return '—';
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
