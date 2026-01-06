import { Finding, TokenInfo } from '@/types';

export function detectTokenIssues(token: TokenInfo): Finding[] {
  const findings: Finding[] = [];

  if (token.error) {
    return [
      {
        type: 'other',
        description: 'The provided token could not be parsed or is not a valid JWT.',
        severity: 'critical',
        suggestedAction:
          'Ensure a valid JWT is provided by the client or authentication service.',
      },
    ];
  }

  if (token.isExpired) {
    findings.push({
      type: 'token_expired',
      description: 'The token has expired.',
      severity: 'warning',
      suggestedAction: 'Renew the token or re-authenticate the user.',
    });
  }

  if (!token.payload.aud) {
    findings.push({
      type: 'token_invalid_audience',
      description: 'The token does not specify an audience.',
      severity: 'warning',
      suggestedAction:
        'Ensure the token is issued for the correct API audience.',
    });
  }

  const scope = token.payload.scope ?? token.payload.scp;

  if (!scope) {
    findings.push({
      type: 'token_invalid_scope',
      description: 'The token does not include any scopes.',
      severity: 'warning',
      suggestedAction:
        'Ensure the token includes required scopes.',
    });
  }

  return findings;
}
