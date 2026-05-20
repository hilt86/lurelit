type CookieRequest = Pick<Request, 'headers' | 'url'>;

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
