import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/setup', '/api/auth/login', '/api/auth/me', '/api/setup'];

function hasEnvConfig(): boolean {
  return Boolean(process.env.KIBANA_URL && process.env.WORKFLOW_ID);
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
  const setupComplete = request.cookies.get('smish_configured')?.value === '1';

  if (!envConfigured && !setupComplete) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not configured', needsSetup: true }, { status: 503 });
    }
    return NextResponse.redirect(new URL('/setup', request.url));
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
