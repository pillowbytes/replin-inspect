/* =========================
   HAR / Network Inspection
   ========================= */

export interface HarTimings {
  blocked?: number;
  dns?: number;
  connect?: number;
  ssl?: number;
  send?: number;
  wait?: number;
  receive?: number;
}

export interface HarBody {
  /** Raw body text (may be undefined or base64 encoded) */
  text?: string;

  /** MIME type (application/json, text/html, etc.) */
  mimeType?: string;

  /** Size in bytes */
  size?: number;

  /** Encoding (e.g. "base64") */
  encoding?: string;
}

export interface HarSizes {
  requestHeaders?: number;
  requestBody?: number;
  requestTotal?: number;

  responseHeaders?: number;
  responseBody?: number;
  responseTotal?: number;
}

export interface HarRequest {
  /** Stable unique identifier */
  id: string;

  /** HTTP method */
  method: string;

  /** Full URL */
  url: string;

  /** Parsed URL components */
  protocol?: string;
  domain?: string;
  path?: string;
  query?: string;

  /** HTTP status */
  status: number;
  statusText?: string;

  /** Timing */
  startTime: number;
  endTime: number;
  duration: number;

  /** Headers */
  headers: Record<string, string>;
  responseHeaders: Record<string, string>;

  /** Query params */
  requestQuery?: Record<string, string>;

  /** Bodies */
  requestBody?: HarBody;
  responseBody?: HarBody;

  /** Size breakdown */
  sizes?: HarSizes;

  /** Convenience sizes */
  requestSize?: number;
  responseSize?: number;

  /** Metadata */
  resourceType?: string;
  serverIp?: string;
  fromCache?: boolean;

  /** HAR timing breakdown */
  timings?: HarTimings;
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
  type: FindingType;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  relatedRequestId?: string;
  suggestedAction: string;
}

/* =========================
   Token / JWT Inspection
   ========================= */

export interface TokenInfo {
  /** Raw token */
  token: string;

  /** Header (decoded) */
  header: Record<string, any>;

  /** Payload / claims */
  payload: {
    iss?: string;
    sub?: string;
    aud?: string | string[];
    exp?: number;
    iat?: number;
    nbf?: number;
    scope?: string;
    scp?: string | string[];
    azp?: string;
    client_id?: string;

    /** Allow arbitrary custom claims */
    [key: string]: any;
  };

  /** Expiry helpers */
  expiresAt?: number;
  isExpired?: boolean;

  /** Parsing / validation errors */
  error?: string;
}
