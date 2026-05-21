import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { CONFIGURED_COOKIE } from '@/lib/cookies';

const PUBLIC_PATHS = ['/login', '/setup', '/api/auth/login', '/api/auth/me', '/api/setup'];
const SETUP_RESOLVE_PATH = '/api/setup/resolve';

function hasEnvConfig(): boolean {
  return Boolean(process.env.KIBANA_URL && process.env.WORKFLOW_ID);
}

function setupResolveUrl(request: NextRequest): URL {
  const url = new URL(SETUP_RESOLVE_PATH, request.url);
  url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return url;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const envConfigured = hasEnvConfig();
  const setupComplete = request.cookies.get(CONFIGURED_COOKIE)?.value === '1';

  if (!envConfigured && !setupComplete) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not configured', needsSetup: true }, { status: 503 });
    }
    return NextResponse.redirect(setupResolveUrl(request));
  }

  const session = request.cookies.get('smish_session');
  if (!session?.value) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
