/**
 * Safely decode a JWT token payload without verifying signature.
 * Replaces unsafe atob() usage throughout the app.
 */
export function getTokenPayload(token: string): { id: string; [key: string]: unknown } | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(
      typeof window !== 'undefined'
        ? decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
        : Buffer.from(base64, 'base64').toString('utf-8')
    );
    return payload;
  } catch {
    return null;
  }
}

export function getUserIdFromToken(token: string): string | null {
  const payload = getTokenPayload(token);
  return payload?.id ? String(payload.id) : null;
}
