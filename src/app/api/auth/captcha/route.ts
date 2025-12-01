import { NextRequest, NextResponse } from 'next/server';
import { generateCaptchaCode, signCaptcha } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const code = generateCaptchaCode();
  const sig = await signCaptcha(code);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="70">
      <rect width="160" height="70" rx="4" ry="4" fill="#f4f4f4" stroke="#d2d2d2" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="Arial, sans-serif" font-size="32" font-weight="800" fill="#2f51c0">
        ${code}
      </text>
    </svg>
  `;

  const res = new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store',
    },
  });

  res.cookies.set('captcha_sig', sig, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 5, // 5 minutes
  });

  return res;
}
