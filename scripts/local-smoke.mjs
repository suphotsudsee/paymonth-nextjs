// Smoke test แอปที่รันบนเครื่อง (npm run dev) กับฐานข้อมูล local ใน Docker
// ใช้บัญชีทดสอบใน .env.db.local (สร้างเฉพาะใน DB local ไม่มีบน server จริง)
// รัน:  node scripts/local-smoke.mjs  [base url, ค่าเริ่มต้น http://localhost:9102]
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:9102'; // 9102 = พอร์ตใน package.json "dev"
const env = Object.fromEntries(
  readFileSync(new URL('../.env.db.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const host = new URL(BASE).hostname;
if (!['localhost', '127.0.0.1'].includes(host)) throw new Error('local only');

let failed = 0;
function check(name, ok, info = '') {
  if (!ok) failed += 1;
  console.log(`${ok ? '✔' : '✖'} ${name}${info ? ` — ${info}` : ''}`);
}

async function login(username, password) {
  // redirect: 'error' — ห้ามตาม redirect ระหว่าง login ไม่ให้รหัสผ่านถูกส่งออกนอก localhost
  const cap = await fetch(`${BASE}/api/auth/captcha`, { redirect: 'error' });
  const svg = await cap.text();
  const code = svg.match(/>\s*([A-Z0-9]{6})\s*</)?.[1]; // 6 = CAPTCHA_LENGTH ใน src/lib/auth.ts
  const sig = cap.headers.getSetCookie().find((c) => c.startsWith('captcha_sig='))?.split(';')[0];
  if (cap.status !== 200 || !code || !sig) throw new Error(`captcha ใช้ไม่ได้ (status ${cap.status})`);
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    redirect: 'error',
    headers: { 'content-type': 'application/json', cookie: sig },
    body: JSON.stringify({ username, password, captcha: code }),
  });
  const body = await res.json().catch(() => ({}));
  const session = res.headers.getSetCookie().find((c) => c.startsWith('session='))?.split(';')[0];
  return { status: res.status, error: body.error, cookie: session };
}

async function get(path, cookie) {
  const t0 = performance.now();
  const res = await fetch(`${BASE}${path}`, { headers: cookie ? { cookie } : {}, redirect: 'manual' });
  const body = await res.text();
  return { status: res.status, body, ms: Math.round(performance.now() - t0) };
}

const ucid = env.LOCAL_TEST_USER_CID;
const otherCid = '9999999999901'; // CID ของบัญชี localadmin = ไม่ใช่ของ localuser
// งวดที่ localuser มีข้อมูลเงินเดือนใน DB local (YYYY/MM พ.ศ.) — ตั้งคู่กับ LOCAL_TEST_USER_CID ใน .env.db.local
const period = env.LOCAL_TEST_USER_PERIOD;
if (!ucid || !/^\d{4}\/\d{2}$/.test(period || '')) {
  throw new Error('ตั้ง LOCAL_TEST_USER_CID และ LOCAL_TEST_USER_PERIOD=YYYY/MM ใน .env.db.local (ดู docs/LOCAL_DEV.md)');
}

const bad = await login(env.LOCAL_TEST_USER, 'wrong-password');
check(
  'รหัสผิด -> 401 Invalid credentials ไม่มี session',
  bad.status === 401 && bad.error === 'Invalid credentials' && !bad.cookie,
  `status ${bad.status}, error "${bad.error}"`,
);

const admin = await login(env.LOCAL_TEST_ADMIN, env.LOCAL_TEST_ADMIN_PASSWORD);
check('admin login -> 200 + session cookie', admin.status === 200 && !!admin.cookie, `status ${admin.status}`);
const user = await login(env.LOCAL_TEST_USER, env.LOCAL_TEST_USER_PASSWORD);
check('user login -> 200 + session cookie', user.status === 200 && !!user.cookie, `status ${user.status}`);

const anon = await get(`/api/officers/${ucid}/payperson`);
check('ไม่ login เรียกข้อมูลรายคน -> 401', anon.status === 401, `status ${anon.status}`);

const me = await get('/api/auth/me', user.cookie);
check('user /api/auth/me -> 200', me.status === 200, `status ${me.status}`);

const own = await get(`/api/officers/${ucid}/payperson`, user.cookie);
check('user ดูข้อมูลตัวเอง -> 200', own.status === 200, `status ${own.status}, ${own.ms}ms, ${own.body.length} bytes`);
const ownSlip = await get(`/api/officers/${ucid}/payperson/${period}`, user.cookie);
check(`user ดูสลิปตัวเอง ${period} -> 200`, ownSlip.status === 200, `status ${ownSlip.status}, ${ownSlip.ms}ms`);

const idor = await get(`/api/officers/${otherCid}/payperson`, user.cookie);
check('user ดูข้อมูลคนอื่น -> 403 (กัน IDOR)', idor.status === 403, `status ${idor.status}`);
const userUsers = await get('/api/users', user.cookie);
check('user เรียก /api/users -> 403', userUsers.status === 403, `status ${userUsers.status}`);
const userCheques = await get('/api/cheques', user.cookie);
check('user เรียก /api/cheques (งานคลัง) -> 403', userCheques.status === 403, `status ${userCheques.status}`);

const adminOther = await get(`/api/officers/${ucid}/payperson`, admin.cookie);
check('admin ดูข้อมูลคนอื่น -> 200', adminOther.status === 200, `status ${adminOther.status}, ${adminOther.ms}ms`);
const adminUsers = await get('/api/users', admin.cookie);
check('admin /api/users -> 200', adminUsers.status === 200, `status ${adminUsers.status}, ${adminUsers.ms}ms`);
check('admin /api/users ไม่ส่ง hash รหัสผ่าน', !/"password"/.test(adminUsers.body));
const adminCheques = await get('/api/cheques', admin.cookie);
check('admin /api/cheques -> 200', adminCheques.status === 200, `status ${adminCheques.status}, ${adminCheques.ms}ms`);

for (const page of ['/', '/login']) {
  const r = await get(page, user.cookie);
  check(`หน้า ${page} -> 200/3xx`, r.status < 400, `status ${r.status}, ${r.ms}ms`);
}

console.log(failed ? `\nFAILED ${failed}` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
