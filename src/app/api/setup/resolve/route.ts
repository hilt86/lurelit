import { NextRequest, NextResponse } from 'next/server';
import { loadGlobalConfig } from '@/lib/config';
import { CONFIGURED_COOKIE, configuredCookieOptions } from '@/lib/cookies';

function safeNextUrl(request: NextRequest): URL {
  const next = request.nextUrl.searchParams.get('next') || '/login';

  if (!next.startsWith('/') || next.startsWith('//')) {
    return new URL('/login', request.url);
  }

  const url = new URL(next, request.url);
  if (url.pathname === '/api/setup/resolve') {
    return new URL('/login', request.url);
  }

  return url;
}

export async function GET(request: NextRequest) {
  const config = await loadGlobalConfig();

  if (!config) {
    const response = NextResponse.redirect(new URL('/setup', request.url));
    response.cookies.set(CONFIGURED_COOKIE, '', { maxAge: 0, path: '/' });
    return response;
  }

  const response = NextResponse.redirect(safeNextUrl(request));
  response.cookies.set(CONFIGURED_COOKIE, '1', configuredCookieOptions());
  return response;
}
