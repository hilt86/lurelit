type CookieRequest = Pick<Request, 'headers' | 'url'>;

export const CONFIGURED_COOKIE = 'smish_configured';
export const CONFIGURED_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5;

export function configuredCookieOptions() {
  return {
    httpOnly: false,
    // This marker is not a secret; it only tells middleware to continue to login.
    // Keep it non-secure so plain-HTTP Docker installs do not get stuck in setup.
    secure: false,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: CONFIGURED_COOKIE_MAX_AGE,
  };
}

function booleanEnv(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  if (['1', 'true', 'yes', 'on'].includes(value.toLowerCase())) return true;
  if (['0', 'false', 'no', 'off'].includes(value.toLowerCase())) return false;
  return undefined;
}

function forwardedProto(headers: Headers): string | null {
  const direct = headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (direct) return direct;

  const forwarded = headers.get('forwarded');
  const match = forwarded?.match(/(?:^|[;,])\s*proto="?([^";,]+)"?/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function shouldUseSecureCookies(request?: CookieRequest): boolean {
  const override = booleanEnv(process.env.LURELIT_SECURE_COOKIES);
  if (override !== undefined) return override;

  if (request) {
    const proto = forwardedProto(request.headers);
    if (proto) return proto === 'https';

    try {
      return new URL(request.url).protocol === 'https:';
    } catch {
      // Fall back to the deployment default below.
    }
  }

  return process.env.NODE_ENV === 'production';
}
