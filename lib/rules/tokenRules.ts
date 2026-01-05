import { Finding, TokenInfo } from '@/types';

export function detectTokenExpiry(token: TokenInfo): Finding[] {
  // 1) Token could not be decoded / parsed
  if (!token.valid) {
    return [
      {
        type: 'other',
        description: 'The provided token could not be parsed or is not a valid JWT.',
        severity: 'critical',
        suggestedAction: 'Ensure a valid JWT is provided by the client or authentication service.',
      },
    ];
  }

  const findings: Finding[] = [];

  // 2) Token is expired
  if (token.expired) {
    findings.push({
      type: 'token_expired',
      description: 'The token has expired.',
      severity: 'warning',
      suggestedAction: 'Renew the token or re-authenticate the user.',
    });
  }

  // 3) Future checks, i.e:
  // - invalid audience
  // - missing scope
  // - issuer mismatch

  return findings;
}
