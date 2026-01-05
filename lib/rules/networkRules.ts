import { HarRequest, Finding } from '../../types';

/**
 * Detect requests with non-2xx statuses.
 */
export function detectFailedRequests(requests: HarRequest[]): Finding[] {
  return requests
    .filter(req => req.status >= 400)
    .map(req => ({
      type: 'failed_request',
      description: `Request to ${req.url} failed with status ${req.status}`,
      severity: req.status >= 500 ? 'critical' : 'warning',
      relatedRequestId: req.id,
      suggestedAction: 'Check the backend service or endpoint for errors.',
    }));
}

/**
 * Detect simple redirect loops (same URL requested repeatedly with 3xx status).
 */
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
          relatedRequestId: req.id,
          suggestedAction: 'Check redirect configuration or authentication flows.',
        });
      }
    }
  });

  return loops;
}

/**
 * Detect missing or inconsistent headers (e.g. Authorization).
 */
export function detectMissingHeaders(requests: HarRequest[], headerName: string): Finding[] {
  const lower = headerName.toLowerCase();
  return requests
    .filter(req => !req.headers[lower])
    .map(req => ({
      type: 'missing_header',
      description: `Missing ${headerName} header on request to ${req.url}`,
      severity: 'info',
      relatedRequestId: req.id,
      suggestedAction: `Ensure the ${headerName} header is set on the client.`,
    }));
}
