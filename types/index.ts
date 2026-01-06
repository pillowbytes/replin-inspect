// types/index.ts

/* =========================
   HAR / Network Inspection
   ========================= */

export interface HarRequest {
  /** Stable unique identifier for the request */
  id: string;

  /** HTTP method (GET, POST, etc.) */
  method: string;

  /** Full request URL */
  url: string;

  /** HTTP status code */
  status: number;

  /** Status text (if present in HAR) */
  statusText?: string;

  /** Epoch timestamp (ms) when request started */
  startTime: number;

  /** Epoch timestamp (ms) when request finished */
  endTime: number;

  /** Total duration in milliseconds */
  duration: number;

  /** Request headers (normalized to lowercase keys) */
  headers: Record<string, string>;

  /** Response headers (normalized to lowercase keys) */
  responseHeaders: Record<string, string>;

  /** Size of request payload in bytes (if available) */
  requestSize?: number;

  /** Size of response payload in bytes (if available) */
  responseSize?: number;

  /** Normalized resource type (xhr, fetch, document, script, image, etc.) */
  resourceType?: string;

  /** Optional detailed timing breakdown (HAR timings) */
  timings?: {
    blocked?: number;
    dns?: number;
    connect?: number;
    ssl?: number;
    send?: number;
    wait?: number;
    receive?: number;
  };
}

/* =========================
   Token Inspection
   ========================= */

export interface TokenInfo {
  /** Raw JWT string */
  raw: string;

  /** Decoded JWT header */
  header: Record<string, unknown>;

  /** Decoded JWT payload */
  payload: {
    exp?: number;
    nbf?: number;
    iss?: string;
    aud?: string | string[];
    scope?: string | string[];
    [key: string]: unknown;
  };

  /** Whether the token could be parsed as a valid JWT */
  valid: boolean;

  /** Whether the token is expired based on `exp` */
  expired: boolean;
}

/* =========================
   Rule Engine / Findings
   ========================= */

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
  /** Machine-readable finding type */
  type: FindingType;

  /** Human-readable description */
  description: string;

  /** Severity level */
  severity: 'info' | 'warning' | 'critical';

  /** Related request ID (if applicable) */
  relatedRequestId?: string;

  /** Actionable suggestion for support / engineers */
  suggestedAction: string;
}
