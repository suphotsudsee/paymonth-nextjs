import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { verifySession } from '@/lib/auth';

const PROTECTED_PATHS = ['/deegars', '/cheques', '/regisdeegars', '/salaries', '/paydirect', '/regisdeegar', '/officers'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = pathname === '/' || PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = req.cookies.get('session')?.value;
  const session = await verifySession(token, { skipNextAuth: true });

  if (session) {
    const status = typeof session.status === 'string' ? session.status.toLowerCase() : '';
    const isLimitedUser = status === 'user';
    const userCid = session.cid;

    if (isLimitedUser) {
      const personalPaydirectBase = userCid ? `/officers/${userCid}/paydirect` : '/officers/paydirect';
      const isOwnPaydirectList = pathname === personalPaydirectBase;
      const isOwnPaydirectNested = pathname.startsWith(`${personalPaydirectBase}/`);
      const isSlipPage = pathname.startsWith('/officers/paydirect/');
      const isPaydirectRoot = pathname === '/officers/paydirect';

      if (!(isOwnPaydirectList || isOwnPaydirectNested || isSlipPage || isPaydirectRoot)) {
        const targetUrl = req.nextUrl.clone();
        targetUrl.pathname = personalPaydirectBase;
        targetUrl.search = '';
        return NextResponse.redirect(targetUrl);
      }
    }
    return NextResponse.next();
  }

  const nextAuthToken = await getToken({
    req,
    secureCookie: process.env.NODE_ENV === 'production',
    secret: process.env.AUTH_SECRET,
  });

  if (!nextAuthToken) {
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
