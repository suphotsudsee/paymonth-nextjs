import Link from "next/link";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";

type PageProps = {
  params: Promise<{
    cid?: string;
  }>;
};

export default async function OfficerSlipChooser({ params }: PageProps) {
  const resolved = await params;
  const cid = resolved?.cid ?? "";
  const hasCid = Boolean(cid);

  return (
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/officers" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <section className="card shadow p-4 p-md-5 mx-auto col-12 col-lg-10 gap-4">
          <div className="text-center vstack gap-2">
            <h1 className="h3 fw-bold mb-0">เลือกประเภทสลิป</h1>
            <p className="text-secondary mb-0">
              เลือกสลิปที่ต้องการดาวน์โหลด
            </p>
          </div>

          <div className="row row-cols-1 row-cols-md-2 g-4 justify-content-center">
            <Link
              href={hasCid ? `/officers/${cid}/payperson` : "#"}
              className={`btn btn-lg btn-primary rounded-pill py-4 fs-4 fw-bold ${!hasCid ? "disabled" : ""}`}
              aria-disabled={!hasCid}
            >
              สลิปเงินโอน
            </Link>
            <Link
              href={hasCid ? `/officers/${cid}/paydirect` : "#"}
              className={`btn btn-lg btn-primary rounded-pill py-4 fs-4 fw-bold ${!hasCid ? "disabled" : ""}`}
              aria-disabled={!hasCid}
            >
              สลิปเงินเดือน
            </Link>
          </div>

          {!hasCid && (
            <p className="text-danger text-center fw-semibold mb-0">ไม่พบรหัสผู้ใช้สำหรับสร้างลิงก์</p>
          )}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
