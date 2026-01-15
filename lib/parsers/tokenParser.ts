import { TokenInfo } from "@/types";

function base64UrlDecode(str: string): string {
  // Replace URL-safe chars and pad with '='
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - (str.length % 4)) % 4, '=');
  const decoded = atob(padded);
  return decoded;
}

export function decodeJwt(token: string): TokenInfo {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return {
      token,
      header: {},
      payload: {},
      error: 'Token must have 3 parts.',
    };
  }

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));

    const now = Math.floor(Date.now() / 1000);
    const exp = payload.exp ?? null;
    const nbf = payload.nbf ?? null;

    return {
      token,
      header,
      payload,
      expiresAt: exp ? exp * 1000 : undefined,
      isExpired: exp !== null && now > exp,
      error: nbf !== null && now < nbf ? 'Token is not active yet.' : undefined,
    };
  } catch {
    return {
      token,
      header: {},
      payload: {},
      error: 'Token could not be parsed.',
    };
  }
}
