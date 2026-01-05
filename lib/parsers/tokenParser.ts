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
    return { raw: token, header: {}, payload: {}, valid: false, expired: false };
  }

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));

    const now = Math.floor(Date.now() / 1000);
    const exp = payload.exp ?? null;
    const nbf = payload.nbf ?? null;

    const validTime =
      (nbf === null || now >= nbf) &&
      (exp === null || now <= exp);

    return {
      raw: token,
      header,
      payload,
      valid: validTime,
      expired: exp !== null && now > exp,
    };
  } catch {
    return { raw: token, header: {}, payload: {}, valid: false, expired: false };
  }
}
