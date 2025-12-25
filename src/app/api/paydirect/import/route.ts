import { NextRequest, NextResponse } from "next/server";
import iconv from "iconv-lite";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

const columns = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "SALARY",
  "O",
  "SALPOS",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "NOCLINIC",
  "Y",
  "SUBJECT",
  "AA",
  "AB",
  "AC",
  "AD",
  "AE",
  "AF",
  "AG",
  "AH",
  "AI",
  "AJ",
  "AK",
  "AL",
  "AM",
  "AN",
  "AO",
  "AP",
  "TOTALINCOME",
  "TAX",
  "ASS",
  "COOP",
  "AU",
  "RETIRE",
  "RETIRE2",
  "GHBANK",
  "AY",
  "AZ",
  "BA",
  "BB",
  "BC",
  "BD",
  "BE",
  "INSURE",
  "BG",
  "BH",
  "OTH",
  "BJ",
  "OTH1",
  "BL",
  "BM",
  "BN",
  "BO",
  "BP",
  "BQ",
  "BR",
  "BS",
  "BT",
  "BU",
  "BV",
  "BW",
  "BX",
  "TOTALOUTCOME",
  "BALANCE",
  "CA",
];

const insertSql = `INSERT IGNORE INTO paydirect (${columns.join(",")}) VALUES (${columns
  .map(() => "?")
  .join(",")})`;

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const UTF16LE_BOM = Buffer.from([0xff, 0xfe]);
const UTF16BE_BOM = Buffer.from([0xfe, 0xff]);

function decodePaydirectFile(buffer: Buffer) {
  if (buffer.subarray(0, 3).equals(UTF8_BOM)) {
    return { text: buffer.subarray(3).toString("utf8"), encoding: "utf-8-bom" };
  }
  if (buffer.subarray(0, 2).equals(UTF16LE_BOM)) {
    return { text: iconv.decode(buffer.subarray(2), "utf16le"), encoding: "utf-16le" };
  }
  if (buffer.subarray(0, 2).equals(UTF16BE_BOM)) {
    return { text: iconv.decode(buffer.subarray(2), "utf16be"), encoding: "utf-16be" };
  }

  const utf8Text = buffer.toString("utf8");
  if (utf8Text.includes("\uFFFD")) {
    return { text: iconv.decode(buffer, "tis-620"), encoding: "tis-620" };
  }

  return { text: utf8Text, encoding: "utf-8" };
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "กรุณาเลือกไฟล์เพื่ออัปโหลด" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text, encoding } = decodePaydirectFile(buffer);
    const lines = text.split(/\r?\n/);

    let inserted = 0;
    let skipped = 0;
    const skippedRows: Array<{ line: number; A: string; B: string; C: string }> = [];

    for (let index = 0; index < lines.length; index += 1) {
      const rawLine = lines[index];
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      const parts = line.replace(/\r/g, "").split("$");
      const values = columns.map((_, idx) => (parts[idx] ?? "").trim());
      const hasContent = values.some((v) => v !== "");
      if (!hasContent) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const result = await prisma.$executeRawUnsafe(insertSql, ...values);
      if (typeof result === "number" && result > 0) {
        inserted += 1;
      } else {
        skipped += 1;
        skippedRows.push({
          line: index + 1,
          A: values[0] ?? "",
          B: values[1] ?? "",
          C: values[2] ?? "",
        });
      }
    }

    return NextResponse.json({
      file: {
        name: file.name,
        type: file.type,
        sizeKB: +(file.size / 1024).toFixed(2),
      },
      inserted,
      skipped,
      totalLines: lines.length,
      skippedRows,
      encoding,
      message: `นำเข้าข้อมูลสำเร็จ ${inserted} แถว (ข้ามซ้ำ ${skipped})`,
    });
  } catch (err: unknown) {
    console.error("paydirect import error", err);
    const detail = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: "ไม่สามารถนำเข้าข้อมูลได้", detail }, { status: 500 });
  }
}
