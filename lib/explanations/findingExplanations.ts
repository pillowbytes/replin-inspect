import { FindingType } from '@/types';

const EXPLANATIONS: Record<FindingType, string> = {
  failed_request: 'A network request returned an error status code.',
  redirect_loop: 'Multiple consecutive redirects were detected.',
  slow_request: 'The request took longer than expected.',
  large_payload: 'The request or response payload is unusually large.',
  missing_header: 'A required header was missing from the request.',

  cors_error: 'The response suggests a CORS error.',
  cors_issue: 'The response is missing required CORS headers.',
  cors_preflight_failed: 'The CORS preflight request failed.',

  auth_request_failed:
    'The request was unauthorized despite sending credentials.',
  auth_forbidden:
    'The request was forbidden despite sending credentials.',

  token_expired: 'The authentication token has expired.',
  token_invalid_scope: 'The token does not include required scopes.',
  token_invalid_audience: 'The token was issued for a different audience.',

  dns_slow: 'DNS resolution took longer than expected.',
  ssl_slow: 'SSL/TLS handshake took longer than expected.',

  other: 'An unspecified issue was detected.',
};

export function getExplanation(type: FindingType): string {
  return EXPLANATIONS[type];
}
