// รายงาน: ทำให้เร็วขึ้นโดยผลไม่เปลี่ยน (TASK_BOARD #10)
// - join ฝั่งที่ถูกค้นด้วย index ต้องไม่ครอบ TRIM() แต่ฝั่งนอกยัง TRIM เหมือนเดิม
// - route ที่เขียน salary/regisdeegar ต้อง trim PNUMBER/NODEEGAR ก่อนบันทึก (เงื่อนไขที่ทำให้ผลเท่าเดิม)
// - BIGINT ส่งเป็น JSON ได้โดยไม่ปัดเศษ
// - ถ้าต่อ DB ได้ (DATABASE_URL ใน .env) เทียบผล join แบบเก่า/ใหม่กับข้อมูลที่มีช่องว่างหลายแบบในตารางชั่วคราว
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { bigintToJson } from "../src/lib/json.ts";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const sqlOnly = (src) => src.replace(/--.*$/gm, "");

test("bigintToJson keeps exact values", () => {
  assert.equal(bigintToJson(1n), 1);
  assert.equal(bigintToJson(564977n), 564977);
  assert.equal(bigintToJson(9007199254740991n), 9007199254740991); // Number.MAX_SAFE_INTEGER
  assert.equal(bigintToJson(9007199254740993n), "9007199254740993"); // เกินช่วง → string ไม่ปัด
  assert.equal(bigintToJson(-9007199254740993n), "-9007199254740993");
  assert.equal(bigintToJson(42), 42);
  assert.equal(bigintToJson(null), null);
  assert.equal(bigintToJson(undefined), null);
  assert.equal(JSON.stringify({ ID: bigintToJson(9007199254740993n) }), '{"ID":"9007199254740993"}');
});

test("paydirect report serializes ID through bigintToJson", () => {
  const src = read("src/app/api/paydirect/report/route.ts");
  assert.match(src, /ID: bigintToJson\(r\.ID\)/);
  assert.doesNotMatch(src, /return NextResponse\.json\(\{ items: rows \}\)/);
});

const LATEST_SALARY = [
  "src/app/api/reports/ktbcheque/route.ts",
  "src/app/api/reports/ktbcheque/export/route.ts",
  "src/app/api/salaries/deegars/route.ts",
];

test("latest-salary/regisdeegar joins go through keyJoin with a runtime data check", () => {
  for (const f of LATEST_SALARY) {
    const src = read(f);
    const sql = sqlOnly(src);
    assert.doesNotMatch(sql, /TRIM\(s2\./, `${f}: no hard-coded join`);
    assert.doesNotMatch(sql, /s2\.PNUMBER = /, `${f}: no hard-coded join`);
    assert.match(src, /WHERE \$\{latestSalaryMatch\(keysTrimmed, "s2", "deegar"\)\}/, f);
    const guard = src.indexOf("isStaff(session)");
    const check = src.indexOf("const keysTrimmed = await salaryKeysAreTrimmed();");
    assert.ok(guard !== -1 && check > guard && check < src.indexOf("prisma.$queryRawUnsafe("), `${f}: data check after auth, before queries`);
  }
  const deegars = read("src/app/api/salaries/deegars/route.ts");
  assert.equal((deegars.match(/LEFT JOIN regisdeegar ON \$\{regisdeegarMatch\(keysTrimmed, "regisdeegar", "deegar"\)\}/g) ?? []).length, 2);
});

test("keyJoin: fast form only when keys are trimmed, otherwise the original TRIM-both-sides form", async () => {
  const { latestSalaryMatch, regisdeegarMatch, LEADING_SPACE_KEYS_SQL } = await import("../src/lib/keyJoin.ts");
  assert.equal(latestSalaryMatch(true, "s2", "deegar"), "s2.PNUMBER = TRIM(deegar.PNUMBER) AND s2.NODEEGAR = TRIM(deegar.NODEEGAR)");
  assert.equal(latestSalaryMatch(false, "s2", "deegar"), "TRIM(s2.PNUMBER) = TRIM(deegar.PNUMBER) AND TRIM(s2.NODEEGAR) = TRIM(deegar.NODEEGAR)");
  assert.equal(regisdeegarMatch(true, "regisdeegar", "deegar"), "regisdeegar.PNUMBER = TRIM(deegar.PNUMBER)");
  assert.equal(regisdeegarMatch(false, "regisdeegar", "deegar"), "TRIM(regisdeegar.PNUMBER) = TRIM(deegar.PNUMBER)");
  assert.match(LEADING_SPACE_KEYS_SQL, /FROM salary WHERE PNUMBER LIKE ' %' OR NODEEGAR LIKE ' %'/);
  assert.match(LEADING_SPACE_KEYS_SQL, /FROM regisdeegar WHERE PNUMBER LIKE ' %'/);
  // cache สั้นพอ และ fail closed (อ่านค่าไม่ได้ = ถือว่าไม่ผ่าน → ใช้แบบเดิม)
  const hyg = read("src/lib/keyHygiene.ts");
  assert.match(hyg, /const CACHE_MS = 5 \* 60 \* 1000;/);
  assert.match(hyg, /Number\(rows\?\.\[0\]\?\.n \?\? 1\) === 0/);
});

test("every writer of salary/regisdeegar trims PNUMBER (and NODEEGAR) before saving", () => {
  const writers = {
    "src/app/api/salaries/route.ts": [/const pnumber = \(body\?\.pnumber \? String\(body\.pnumber\)\.trim\(\)/, /const nodeegar = \(body\?\.nodeegar \? String\(body\.nodeegar\)\.trim\(\)/],
    "src/app/api/salaries/[id]/route.ts": [/const pnumber = \(body\?\.pnumber \? String\(body\.pnumber\)\.trim\(\)/, /const nodeegar = \(body\?\.nodeegar \? String\(body\.nodeegar\)\.trim\(\)/],
    "src/app/api/regisdeegar/route.ts": [/const pnumber = String\(PNUMBER \?\? ''\)\.trim\(\)/],
    "src/app/api/regisdeegars/route.ts": [/const pnumber = String\(body\?\.pnumber \|\| ""\)\.trim\(\)/],
    "src/app/api/regisdeegars/[pnumber]/route.ts": [/const newP = String\(body\?\.pnumber \|\| ""\)\.trim\(\)/],
  };
  for (const [f, patterns] of Object.entries(writers)) {
    const src = read(f);
    for (const re of patterns) assert.match(src, re, f);
  }
});

test("index script only checks data (no writes) and creates the report indexes", () => {
  const sql = sqlOnly(read("prisma/sql/2026-11-24_report_indexes.sql"));
  for (const idx of ["idx_salary_pnumber_nodeegar", "idx_salary_year_month", "idx_deegar_cheque", "idx_cheque_paydate"]) {
    assert.match(sql, new RegExp(`CREATE INDEX IF NOT EXISTS ${idx} ON`), idx);
  }
  assert.match(sql, /idx_salary_pnumber_nodeegar ON salary \(PNUMBER, NODEEGAR, DUPDATE, ID\)/);
  // ไม่แก้ข้อมูลเลย: ตรวจช่องว่างนำหน้าในทุกคอลัมน์ key ของทุกตารางที่ join กัน แล้วให้คนหยุดถ้าไม่ใช่ 0
  assert.doesNotMatch(sql, /(UPDATE|DELETE)/i);
  assert.doesNotMatch(sql, /INSERT INTO (salary|deegar|regisdeegar|cheque|bank)/i);
  // pre-check ต้องหยุด script เอง: ใส่จำนวนลงตารางชั่วคราวที่มี CHECK (= 0) ก่อน CREATE INDEX ตัวแรก
  const check = sql.indexOf("CHECK (leading_space_keys = 0)");
  const insert = sql.indexOf("INSERT INTO report_index_precheck");
  assert.ok(check !== -1 && insert > check && insert < sql.indexOf("CREATE INDEX"), "precheck must abort before indexes");
  assert.match(sql, /FROM salary WHERE PNUMBER LIKE ' %' OR NODEEGAR LIKE ' %'\) \+ \(SELECT COUNT\(\*\) FROM regisdeegar WHERE PNUMBER LIKE ' %'\)/);
});

test("tax reports default to the latest numeric year (junk YEARTHAI='YEAR' row)", () => {
  for (const f of ["taxdept", "taxtitle", "taxtmonth"]) {
    const src = read(`src/app/api/reports/${f}/route.ts`);
    assert.match(src, /SELECT MAX\(YEARTHAI\) as latest FROM salary WHERE YEARTHAI REGEXP '\^\[0-9\]\{4\}\$'/, f);
  }
});

// เทียบกับ DB จริงด้วยตารางชั่วคราว (หายเองเมื่อปิด connection) — ข้ามถ้าไม่มี .env หรือต่อไม่ได้
test("old vs new join give the same matches for whitespace variants (live DB, temporary tables)", async (t) => {
  const envPath = new URL("../.env", import.meta.url);
  if (!existsSync(envPath)) return t.skip("no .env");
  const require = createRequire(import.meta.url);
  require("dotenv").config({ path: envPath });
  const { PrismaClient } = require("@prisma/client");
  const p = new PrismaClient();
  try {
    await p.$connect();
  } catch {
    return t.skip("database not reachable");
  }
  try {
    // ใช้ connection เดียวตลอด (temporary table มองเห็นเฉพาะ connection ที่สร้าง)
    await p.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("CREATE TEMPORARY TABLE t_salary (ID INT, PNUMBER CHAR(10), NODEEGAR VARCHAR(4)) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci");
      await tx.$executeRawUnsafe("CREATE TEMPORARY TABLE t_deegar (ID INT, PNUMBER VARCHAR(10), NODEEGAR VARCHAR(4)) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci");
      // salary เป็นฝั่งที่ถูก normalize แล้ว (ตามที่ route เขียนและ SQL ล้างข้อมูลรับประกัน) ยกเว้นช่องว่างท้าย ซึ่งยังเหลือได้
      await tx.$executeRawUnsafe("INSERT INTO t_salary VALUES (1,'P1','1'),(2,'P2','1 '),(3,'P3','2')");
      // deegar มีได้ทุกแบบ: ปกติ, ช่องว่างนำหน้า, ช่องว่างท้าย, ทั้งสองด้าน, ไม่มีคู่
      await tx.$executeRawUnsafe("INSERT INTO t_deegar VALUES (10,'P1','1'),(11,' P1','1'),(12,'P1 ',' 1'),(13,' P2 ','1'),(14,'P3','  2  '),(15,'P9','1')");
      const q = (cond) =>
        tx.$queryRawUnsafe(`SELECT d.ID did, (SELECT s.ID FROM t_salary s WHERE ${cond} ORDER BY s.ID DESC LIMIT 1) sid FROM t_deegar d ORDER BY d.ID`);
      const oldRows = await q("TRIM(s.PNUMBER) = TRIM(d.PNUMBER) AND TRIM(s.NODEEGAR) = TRIM(d.NODEEGAR)");
      const newRows = await q("s.PNUMBER = TRIM(d.PNUMBER) AND s.NODEEGAR = TRIM(d.NODEEGAR)");
      const norm = (rows) => rows.map((r) => `${r.did}->${r.sid ?? "none"}`);
      assert.deepEqual(norm(newRows), norm(oldRows));
      assert.deepEqual(norm(oldRows), ["10->1", "11->1", "12->1", "13->2", "14->3", "15->none"]);

      // ข้อมูลเก่าที่มีช่องว่างนำหน้าทั้งสองฝั่ง: join เก่าจับคู่ได้ แต่ join ใหม่ไม่ได้
      // → นี่คือเหตุที่ script ต้องตรวจช่องว่างนำหน้าก่อน และต้องเป็น 0 (เงื่อนไขนี้ต้องจับกรณีนี้ได้)
      await tx.$executeRawUnsafe("INSERT INTO t_salary VALUES (4,' P4','1')");
      await tx.$executeRawUnsafe("INSERT INTO t_deegar VALUES (16,' P4','1')");
      const legacyOld = await q("TRIM(s.PNUMBER) = TRIM(d.PNUMBER) AND TRIM(s.NODEEGAR) = TRIM(d.NODEEGAR)");
      const legacyNew = await q("s.PNUMBER = TRIM(d.PNUMBER) AND s.NODEEGAR = TRIM(d.NODEEGAR)");
      assert.equal(norm(legacyOld).at(-1), "16->4");
      assert.equal(norm(legacyNew).at(-1), "16->none");
      const [flag] = await tx.$queryRawUnsafe("SELECT COUNT(*) n FROM t_salary WHERE PNUMBER LIKE ' %' OR NODEEGAR LIKE ' %'");
      assert.equal(Number(flag.n), 1, "the leading-space check must flag legacy keys");
      // และเมื่อตรวจพบ โค้ดจะใช้ join แบบเดิม (keysTrimmed = false) ซึ่งจับคู่ได้ถูก
      const { latestSalaryMatch } = await import("../src/lib/keyJoin.ts");
      const fallback = await q(latestSalaryMatch(false, "s", "d"));
      assert.deepEqual(norm(fallback), norm(legacyOld));
      // CHECK constraint ใน script หยุดได้จริง
      await tx.$executeRawUnsafe("CREATE TEMPORARY TABLE t_precheck (leading_space_keys INT NOT NULL, CHECK (leading_space_keys = 0))");
      await assert.rejects(tx.$executeRawUnsafe("INSERT INTO t_precheck SELECT COUNT(*) FROM t_salary WHERE PNUMBER LIKE ' %'"), /CONSTRAINT|check/i);
    });
  } finally {
    await p.$disconnect();
  }
});

// ---- reports/all: แบ่งหน้าตามงวด ----
import { pickPeriodsForPage } from "../src/lib/reportPaging.ts";

test("pickPeriodsForPage picks exactly the periods covering the page", () => {
  const P = [
    { year: "2569", month: "10", count: 2 },
    { year: "2569", month: "06", count: 1 },
    { year: "2569", month: "05", count: 236 },
    { year: "2569", month: "04", count: 0 },
    { year: "2569", month: "03", count: 5 },
  ];
  const keys = (r) => r.periods.map((p) => p.month).join(",") + "@" + r.offsetWithin;
  assert.equal(keys(pickPeriodsForPage(P, 0, 10)), "10,06,05@0"); // หน้าแรกข้าม 3 งวด
  assert.equal(keys(pickPeriodsForPage(P, 2, 1)), "06@0"); // แถวเดียวพอดีงวด
  assert.equal(keys(pickPeriodsForPage(P, 3, 10)), "05@0");
  assert.equal(keys(pickPeriodsForPage(P, 10, 10)), "05@7");
  assert.equal(keys(pickPeriodsForPage(P, 235, 10)), "05,03@232"); // ข้ามงวดที่ไม่มีแถว
  assert.equal(keys(pickPeriodsForPage(P, 244, 10)), "@0"); // เกินจำนวนทั้งหมด
  assert.equal(keys(pickPeriodsForPage([], 0, 10)), "@0");
});

test("reports/all: new per-period paging returns the same rows as the old global sort (live DB)", async (t) => {
  const envPath = new URL("../.env", import.meta.url);
  if (!existsSync(envPath)) return t.skip("no .env");
  const require = createRequire(import.meta.url);
  require("dotenv").config({ path: envPath });
  const { PrismaClient } = require("@prisma/client");
  const p = new PrismaClient();
  try { await p.$connect(); } catch { return t.skip("database not reachable"); }
  try {
    for (const [label, where, params] of [
      ["no filter", "WHERE s.IDPAY <> '20004'", []],
      ["name filter", "WHERE s.IDPAY <> '20004' AND o.NAME LIKE ?", ["%สม%"]],
      ["year filter", "WHERE s.IDPAY <> '20004' AND s.YEARTHAI = ?", ["2568"]],
    ]) {
      const periods = (await p.$queryRawUnsafe(
        `SELECT s.YEARTHAI y, s.MONTHTHAI m, COUNT(DISTINCT s.CID) n FROM salary s JOIN officer o ON o.CID = s.CID ${where} GROUP BY s.YEARTHAI, s.MONTHTHAI ORDER BY s.YEARTHAI DESC, s.MONTHTHAI DESC`,
        ...params,
      )).map((r) => ({ year: r.y, month: r.m, count: Number(r.n) }));
      const total = periods.reduce((a, r) => a + r.count, 0);
      const [orig] = await p.$queryRawUnsafe(`SELECT COUNT(*) total FROM (SELECT s.CID FROM salary s JOIN officer o ON o.CID = s.CID ${where} GROUP BY s.CID, s.MONTHTHAI, s.YEARTHAI) c`, ...params);
      assert.equal(total, Number(orig.total), `${label}: total`);
      const pageSize = 10;
      const offsets = [0, 1, 5, 9, 250, Math.floor(total / 2), Math.max(0, total - 3), total + 5];
      for (const offset of offsets) {
        const sel = `SELECT s.CID, s.MONTHTHAI, s.YEARTHAI, o.NAME FROM salary s JOIN officer o ON o.CID = s.CID`;
        const old = await p.$queryRawUnsafe(`${sel} ${where} GROUP BY s.CID, s.MONTHTHAI, s.YEARTHAI ORDER BY s.YEARTHAI DESC, s.MONTHTHAI DESC, o.NAME ASC LIMIT ? OFFSET ?`, ...params, pageSize, offset);
        const pick = pickPeriodsForPage(periods, offset, pageSize);
        const neu = pick.periods.length === 0 ? [] : await p.$queryRawUnsafe(
          `${sel} ${where} AND (${pick.periods.map(() => "(s.YEARTHAI = ? AND s.MONTHTHAI = ?)").join(" OR ")}) GROUP BY s.CID, s.MONTHTHAI, s.YEARTHAI ORDER BY s.YEARTHAI DESC, s.MONTHTHAI DESC, o.NAME ASC LIMIT ? OFFSET ?`,
          ...params, ...pick.periods.flatMap((x) => [x.year, x.month]), pageSize, pick.offsetWithin,
        );
        // ลำดับ (ปี, เดือน, ชื่อ) ต้องตรงกันทุกตำแหน่ง; ชื่อซ้ำในงวดเดียวกัน DB เรียงแบบไหนก็ได้ (ทั้งเก่าและใหม่) จึงเทียบ CID แบบเรียงในกลุ่มที่ชื่อซ้ำ
        const seq = (rows) => rows.map((r) => `${r.YEARTHAI}/${r.MONTHTHAI}/${r.NAME}`);
        assert.deepEqual(seq(neu), seq(old), `${label} offset ${offset}`);
        const tiesOk = (rows) => rows.map((r) => `${r.YEARTHAI}/${r.MONTHTHAI}/${r.NAME}/${r.CID}`).sort();
        if (new Set(seq(old)).size === old.length) assert.deepEqual(tiesOk(neu), tiesOk(old), `${label} offset ${offset} CIDs`);
      }
    }
  } finally {
    await p.$disconnect();
  }
});

test("count queries started early always have a rejection handler", () => {
  for (const f of ["src/app/api/salaries/deegars/route.ts", "src/app/api/reports/summarydeegar/route.ts"]) {
    const src = read(f);
    const start = src.indexOf("const countPromise = prisma.$queryRawUnsafe(");
    const handler = src.indexOf("countPromise.catch(() => undefined);");
    const rowsAt = src.indexOf("const rows = (await prisma.$queryRawUnsafe(");
    assert.ok(start !== -1 && handler > start && handler < rowsAt, `${f}: handler must be attached before awaiting rows`);
    assert.match(src, /const countRows = await countPromise;/, f);
  }
});

test("reports/all runs totals in parallel with the per-period counts", () => {
  const src = read("src/app/api/reports/all/route.ts");
  assert.match(src, /const \[periods, totals\] = await Promise\.all\(\[/);
  assert.match(src, /pickPeriodsForPage\(/);
  assert.doesNotMatch(src, /SELECT COUNT\(\*\) AS total/);
});
