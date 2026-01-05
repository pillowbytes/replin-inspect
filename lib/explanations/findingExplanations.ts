import { FindingType } from '@/types';

const EXPLANATIONS: Record<FindingType, string> = {
  failed_request: 'A network request returned an error status code.',
  redirect_loop: 'Multiple consecutive redirects were detected, indicating a possible loop.',
  missing_header: 'A required header was missing from the request.',
  cors_error: 'The response suggests a CORS or preflight issue.',
  token_expired: 'The provided authentication token has expired.',
  token_invalid_scope: 'The token does not contain the required scope.',
  token_invalid_audience: 'The token was issued for a different audience.',
  other: 'An unspecified issue was detected.',
};

export function getExplanation(type: FindingType): string {
  return EXPLANATIONS[type];
}
