import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';
import { roleOf } from '@/lib/permissions';

const PROTECTED_PATHS = ['/deegars', '/cheques', '/regisdeegars', '/salaries', '/paydirect', '/regisdeegar', '/officers'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = pathname === '/' || PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (!isProtected) {
    return NextResponse.next();
  }

  // Single source of truth for auth: the signed "session" JWT cookie.
  const token = req.cookies.get('session')?.value;
  const session = await verifySession(token, { skipNextAuth: true });

  if (session) {
    // เกณฑ์เดียวกับ API (roleOf): status ว่าง/ไม่รู้จัก = ผู้ใช้สิทธิ์จำกัด
    const isLimitedUser = roleOf(session) === 'USER';
    const userCid = session.cid;

    if (isLimitedUser) {
      // Least privilege: users are confined to their own pay pages and selection screen.
      const personalRoot = userCid ? `/officers/${userCid}` : '/officers/paydirect';
      const personalPaydirectBase = userCid ? `${personalRoot}/paydirect` : '/officers/paydirect';
      const personalPaypersonBase = userCid ? `${personalRoot}/payperson` : '/officers/payperson';

      const isPersonalRoot = pathname === personalRoot;
      const isOwnPaydirectList = pathname === personalPaydirectBase;
      const isOwnPaydirectNested = pathname.startsWith(`${personalPaydirectBase}/`);
      const isPaydirectSlip = pathname.startsWith('/officers/paydirect/');
      const isPaydirectRoot = pathname === '/officers/paydirect';

      const isOwnPaypersonList = pathname === personalPaypersonBase;
      const isOwnPaypersonNested = pathname.startsWith(`${personalPaypersonBase}/`);
      const isPaypersonSlip = userCid
        ? pathname.startsWith(`/officers/payperson/${userCid}/`)
        : pathname.startsWith('/officers/payperson/');

      const allowed =
        isPersonalRoot ||
        isOwnPaydirectList ||
        isOwnPaydirectNested ||
        isPaydirectSlip ||
        isPaydirectRoot ||
        isOwnPaypersonList ||
        isOwnPaypersonNested ||
        isPaypersonSlip;

      if (!allowed) {
        const targetUrl = req.nextUrl.clone();
        targetUrl.pathname = personalRoot;
        targetUrl.search = '';
        return NextResponse.redirect(targetUrl);
      }
    }
    return NextResponse.next();
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
