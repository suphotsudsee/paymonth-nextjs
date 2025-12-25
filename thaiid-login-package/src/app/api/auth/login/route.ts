import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { signSession, verifyCaptcha } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password, captcha } = await req.json().catch(() => ({}));

    if (!username || !password) {
      return NextResponse.json({ error: 'username and password required' }, { status: 400 });
    }

    const captchaSig = req.cookies.get('captcha_sig')?.value;
    if (!(await verifyCaptcha(String(captcha || '').toUpperCase(), captchaSig))) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 });
    }

    const sha1 = crypto.createHash('sha1').update(String(password).trim()).digest('hex');

    const rows = await prisma.$queryRawUnsafe<
      { id: number; cid: string; accessLevel: number; fname: string; lname: string; status: string | null }[]
    >(
      'SELECT id, cid, accessLevel, fname, lname, status FROM user WHERE username = ? AND password = ? LIMIT 1',
      String(username).trim(),
      sha1,
    );

    const user = rows[0];

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await signSession({
      id: user.id,
      cid: user.cid,
      accessLevel: user.accessLevel,
      fname: user.fname,
      lname: user.lname,
      status: user.status ?? undefined,
    });

    const res = NextResponse.json({
      user,
      message: 'Login successful.',
    });

    res.cookies.set('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return res;
  } catch (error: any) {
    console.error('Login error', error);
    return NextResponse.json({ error: 'Login failed', detail: String(error?.message || error) }, { status: 500 });
  }
}
