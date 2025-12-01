import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';

const PROTECTED_PATHS = ['/deegars', '/cheques', '/regisdeegars', '/salaries', '/paydirect', '/regisdeegar', '/officers'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = pathname === '/' || PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = req.cookies.get('session')?.value;
  const session = await verifySession(token);

  if (!session) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Optionally attach session to request headers for handlers (not used yet)
  const res = NextResponse.next();
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
