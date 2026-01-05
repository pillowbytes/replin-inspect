// types/index.ts

export interface HarRequest {
  id: string;
  method: string;
  url: string;
  status: number;
  statusText?: string;
  startTime: number;
  endTime: number;
  duration: number;
  headers: Record<string, string>;
  responseHeaders: Record<string, string>;
}

export interface TokenInfo {
  raw: string;
  header: Record<string, unknown>;
  payload: {
    exp?: number;
    nbf?: number;
    iss?: string;
    aud?: string | string[];
    scope?: string | string[];
    [key: string]: unknown;
  };
  valid: boolean;
  expired: boolean;
}

export type FindingType =
  | 'failed_request'
  | 'redirect_loop'
  | 'missing_header'
  | 'cors_error'
  | 'token_expired'
  | 'token_invalid_scope'
  | 'token_invalid_audience'
  | 'other';

export interface Finding {
  type: FindingType;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  relatedRequestId?: string;
  suggestedAction: string;
}
