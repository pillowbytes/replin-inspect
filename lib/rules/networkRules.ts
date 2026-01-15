import { Finding, HarRequest } from '../../types';

/* =========================
   Thresholds (tunable later)
   ========================= */

export const SLOW_REQUEST_MS = 2000;
export const VERY_SLOW_REQUEST_MS = 5000;

const LARGE_REQUEST_BYTES = 500 * 1024;        // 500 KB
const LARGE_RESPONSE_BYTES = 1 * 1024 * 1024;  // 1 MB

const HIGH_DNS_MS = 200;
const HIGH_SSL_MS = 500;

const RESOURCE_THRESHOLDS: Record<
  string,
  {
    requestBytes?: number;
    responseBytes?: number;
    slowMs?: number;
    verySlowMs?: number;
  }
> = {
  image: { responseBytes: 2 * 1024 * 1024, slowMs: 3000, verySlowMs: 7000 },
  media: { responseBytes: 5 * 1024 * 1024, slowMs: 5000, verySlowMs: 10000 },
  font: { responseBytes: 1.5 * 1024 * 1024, slowMs: 3000, verySlowMs: 7000 },
  script: { responseBytes: 1.5 * 1024 * 1024, slowMs: 2500, verySlowMs: 6000 },
  stylesheet: { responseBytes: 1.5 * 1024 * 1024, slowMs: 2500, verySlowMs: 6000 },
  xhr: { responseBytes: 1 * 1024 * 1024, slowMs: 2000, verySlowMs: 5000 },
  fetch: { responseBytes: 1 * 1024 * 1024, slowMs: 2000, verySlowMs: 5000 },
  document: { responseBytes: 1 * 1024 * 1024, slowMs: 2000, verySlowMs: 5000 },
};

/* =========================
   Failed Requests
   ========================= */

export function detectFailedRequests(requests: HarRequest[]): Finding[] {
  return requests
    .filter(req => req.status >= 400)
    .map(req => ({
      type: 'failed_request',
      description: `Request to ${req.url} failed with status ${req.status}`,
      severity: req.status >= 500 ? 'critical' : 'warning',
      context: 'response',
      relatedRequestId: req.id,
      suggestedAction: 'Check the backend service or endpoint for errors.',
    }));
}

/* =========================
   Redirect Loops
   ========================= */

export function detectRedirectLoops(requests: HarRequest[]): Finding[] {
  const loops: Finding[] = [];
  const redirectCounts: Record<string, number> = {};

  requests.forEach(req => {
    if (req.status >= 300 && req.status < 400) {
      redirectCounts[req.url] = (redirectCounts[req.url] || 0) + 1;
      if (redirectCounts[req.url] > 3) {
        loops.push({
          type: 'redirect_loop',
          description: `Possible redirect loop detected for ${req.url}`,
          severity: 'warning',
          context: 'response',
          relatedRequestId: req.id,
          suggestedAction: 'Check redirect configuration or authentication flows.',
        });
      }
    }
  });

  return loops;
}

/* =========================
   Missing Headers
   ========================= */

export function detectMissingHeaders(
  requests: HarRequest[],
  headerName: string
): Finding[] {
  const lower = headerName.toLowerCase();
  const authRequired = buildAuthRequiredIndex(requests, lower);

  return requests
    .filter(req => shouldCheckAuthHeader(req, lower))
    .map(req => {
      if (req.headers[lower]) return null;

      if (lower !== 'authorization') {
        return {
          type: 'missing_header',
          description: `Missing ${headerName} header on request to ${req.url}`,
          severity: 'info',
          context: 'request',
          relatedRequestId: req.id,
          suggestedAction: `Ensure the ${headerName} header is set on the client.`,
        } as Finding;
      }

      const confidence = authRequired[req.id];
      if (!confidence) return null;

      const prefix =
        confidence === 'high'
          ? 'Missing auth header on a protected request'
          : confidence === 'medium'
          ? 'Likely missing auth header'
          : 'Possible missing auth header';

      return {
        type: 'missing_header',
        description: `${prefix} for ${req.url}`,
        severity: confidence === 'high' ? 'warning' : 'info',
        confidence,
        context: 'request',
        relatedRequestId: req.id,
        suggestedAction: `Ensure the ${headerName} header is set on the client.`,
      } as Finding;
    })
    .filter((f): f is Finding => Boolean(f));
}

function shouldCheckAuthHeader(req: HarRequest, lowerHeader: string) {
  if (lowerHeader !== 'authorization') return true;
  const resource = (req.resourceType ?? '').toLowerCase();
  if (['image', 'font', 'stylesheet', 'script', 'media'].includes(resource)) {
    return false;
  }
  return true;
}

function buildAuthRequiredIndex(
  requests: HarRequest[],
  lowerHeader: string
): Record<string, 'high' | 'medium' | 'low' | undefined> {
  if (lowerHeader !== 'authorization') return {};

  const authPaths = new Set<string>();
  const map: Record<string, 'high' | 'medium' | 'low' | undefined> = {};

  requests.forEach(req => {
    if (req.headers[lowerHeader]) {
      authPaths.add(authKey(req));
    }
  });

  requests.forEach(req => {
    const responseAuth =
      req.status === 401 ||
      req.status === 403 ||
      Boolean(req.responseHeaders['www-authenticate']);

    if (responseAuth) {
      map[req.id] = 'high';
      return;
    }

    if (authPaths.has(authKey(req))) {
      map[req.id] = 'medium';
      return;
    }

    if (isLikelyProtectedPath(req.path)) {
      map[req.id] = 'low';
    }
  });

  return map;
}

function authKey(req: HarRequest) {
  return `${req.domain ?? ''}${req.path ?? ''}`;
}

function isLikelyProtectedPath(path?: string) {
  if (!path) return false;
  return (
    path.startsWith('/api') ||
    path.startsWith('/user') ||
    path.startsWith('/account') ||
    path.startsWith('/profile') ||
    path.startsWith('/admin')
  );
}

/* =========================
   Slow Requests
   ========================= */

export function detectSlowRequests(requests: HarRequest[]): Finding[] {
  return requests
    .filter(req => {
      const { slowMs } = getThresholds(req.resourceType);
      return req.duration >= slowMs;
    })
    .map(req => ({
      type: 'slow_request',
      description: `Request to ${req.url} took ${req.duration} ms to complete`,
      severity:
        req.duration >= getThresholds(req.resourceType).verySlowMs
          ? 'critical'
          : 'warning',
      context: 'timing',
      relatedRequestId: req.id,
      suggestedAction:
        'Investigate backend performance, network latency, or blocking dependencies.',
    }));
}

/* =========================
   Large Payloads
   ========================= */

export function detectLargePayloads(requests: HarRequest[]): Finding[] {
  const findings: Finding[] = [];

  requests.forEach(req => {
    const requestSize =
      req.requestSize ??
      req.sizes?.requestTotal ??
      req.requestBody?.size ??
      0;

    const responseSize =
      req.responseSize ??
      req.sizes?.responseTotal ??
      req.responseBody?.size ??
      0;

    if (requestSize >= getThresholds(req.resourceType).requestBytes) {
      findings.push({
        type: 'large_payload',
        description: `Large request payload (${Math.round(
          requestSize / 1024
        )} KB) sent to ${req.url}`,
        severity: 'warning',
        context: 'request',
        relatedRequestId: req.id,
        dedupeKey: 'large_payload:request',
        suggestedAction:
          'Reduce payload size or use pagination / batching.',
      });
    }

    if (responseSize >= getThresholds(req.resourceType).responseBytes) {
      findings.push({
        type: 'large_payload',
        description: `Large response payload (${Math.round(
          responseSize / 1024
        )} KB) received from ${req.url}`,
        severity: 'warning',
        context: 'response',
        relatedRequestId: req.id,
        dedupeKey: 'large_payload:response',
        suggestedAction:
          'Use pagination, field filtering, or compression.',
      });
    }
  });

  return findings;
}

function getThresholds(resourceType?: string) {
  const key = (resourceType ?? '').toLowerCase();
  const overrides = RESOURCE_THRESHOLDS[key] ?? {};
  return {
    requestBytes: overrides.requestBytes ?? LARGE_REQUEST_BYTES,
    responseBytes: overrides.responseBytes ?? LARGE_RESPONSE_BYTES,
    slowMs: overrides.slowMs ?? SLOW_REQUEST_MS,
    verySlowMs: overrides.verySlowMs ?? VERY_SLOW_REQUEST_MS,
  };
}

/* =========================
   Auth Request Correlation
   ========================= */

export function detectAuthRequestFailures(requests: HarRequest[]): Finding[] {
  return requests
    .filter(
      req =>
        (req.status === 401 || req.status === 403) &&
        Boolean(req.headers['authorization'])
    )
    .map(req => ({
      type:
        req.status === 401
          ? 'auth_request_failed'
          : 'auth_forbidden',
      description:
        req.status === 401
          ? `Request to ${req.url} was unauthorized despite credentials`
          : `Request to ${req.url} was forbidden despite credentials`,
      severity: 'warning',
      context: 'response',
      relatedRequestId: req.id,
      suggestedAction:
        req.status === 401
          ? 'Verify token validity, audience, and scope.'
          : 'Verify user permissions and access control rules.',
    }));
}

/* =========================
   CORS Issues
   ========================= */

// TODO: Handle proxy/gateway origin rewrites and non-browser contexts.
export function detectCorsIssues(requests: HarRequest[]): Finding[] {
  const findings: Finding[] = [];

  requests.forEach(req => {
    const isPreflight = req.method === 'OPTIONS';
    const allowOrigin =
      req.responseHeaders['access-control-allow-origin'];
    const allowCredentials =
      req.responseHeaders['access-control-allow-credentials'];
    const origin = req.headers['origin'];
    const isCrossOrigin = origin
      ? origin !== getRequestOrigin(req.url)
      : false;

    if (isPreflight && req.status >= 400) {
      findings.push({
        type: 'cors_preflight_failed',
        description: `CORS preflight request to ${req.url} failed`,
        severity: 'critical',
        context: 'response',
        relatedRequestId: req.id,
        suggestedAction:
          'Ensure OPTIONS requests are handled and CORS headers are returned.',
      });
      return;
    }

    if (
      !isPreflight &&
      isCrossOrigin &&
      req.status >= 400 &&
      !allowOrigin
    ) {
      findings.push({
        type: 'cors_issue',
        description: `Missing CORS headers on response from ${req.url}`,
        severity: 'warning',
        context: 'response',
        relatedRequestId: req.id,
        suggestedAction:
          'Add Access-Control-Allow-Origin on the server.',
      });
    }

    if (
      isCrossOrigin &&
      req.headers['authorization'] &&
      allowOrigin &&
      allowOrigin !== '*' &&
      allowCredentials !== 'true'
    ) {
      findings.push({
        type: 'cors_issue',
        description: `CORS credentials not allowed for ${req.url}`,
        severity: 'warning',
        context: 'response',
        relatedRequestId: req.id,
        suggestedAction:
          'Set Access-Control-Allow-Credentials: true and avoid wildcard origins.',
      });
    }
  });

  return findings;
}

function getRequestOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

/* =========================
   DNS / SSL Timing Anomalies
   ========================= */

export function detectTimingAnomalies(
  requests: HarRequest[]
): Finding[] {
  const findings: Finding[] = [];

  requests.forEach(req => {
    if (req.timings?.dns && req.timings.dns > HIGH_DNS_MS) {
      findings.push({
        type: 'dns_slow',
        description: `High DNS resolution time (${req.timings.dns} ms) for ${req.domain}`,
        severity: 'warning',
        context: 'timing',
        relatedRequestId: req.id,
        suggestedAction:
          'Investigate DNS provider performance or caching.',
      });
    }

    if (req.timings?.ssl && req.timings.ssl > HIGH_SSL_MS) {
      findings.push({
        type: 'ssl_slow',
        description: `Slow SSL handshake (${req.timings.ssl} ms) for ${req.domain}`,
        severity: 'warning',
        context: 'timing',
        relatedRequestId: req.id,
        suggestedAction:
          'Check TLS configuration or certificate chain.',
      });
    }
  });

  return findings;
}
