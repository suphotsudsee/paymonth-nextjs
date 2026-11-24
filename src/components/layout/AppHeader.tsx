'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NavItem = {
  label: string;
  href: string;
  submenu?: { label: string; href: string }[];
};

const navItems: NavItem[] = [
  { label: "รายชื่อจนท.", href: "/officers" },
  {
    label: "ทะเบียนคุมงบ",
    href: "#",
    submenu: [
      { label: "ทะเบียนฎีกา", href: "/deegars" },
      { label: "ทะเบียนเช็ค", href: "/cheques" },
      { label: "ทะเบียนคุมเบิกจ่ายฎีกา", href: "/regisdeegars" },
    ],
  },
  {
    label: "ทะเบียนรหัส",
    href: "#",
    submenu: [
      { label: "รหัสสถานที่ปฏิบัติงาน", href: "/stations" },
      { label: "รหัสรายรับ-รายจ่าย", href: "/cpays" },
    ],
  },
  {
    label: "รายงาน",
    href: "/reports",
    submenu: [
      { label: "ทั้งหมด", href: "/reports" },
      { label: "ค้นหาฎีกา", href: "/reports/deegars" },
      { label: "ค้นหาเช็ค", href: "/reports/cheques" },
      { label: "ส่งกรุงไทย(ฎีกา)", href: "/reports/ktbdeegar" },
      { label: "ส่งกรุงไทย(เช็ค)", href: "/reports/ktbcheque" },
      { label: "สรุปฎีกา", href: "/reports/summarydeegar" },
      { label: "สรุปตามวันที่", href: "/reports/bydate" },
      { label: "สรุปภาษี(ฝ่าย)", href: "/reports/taxdept" },
      { label: "สรุปภาษี(ตำแหน่ง)", href: "/reports/taxtitle" },
      { label: "สรุปภาษี(กลุ่ม)", href: "/reports/taxtmonth" },
      { label: "ทะเบียนคุมใบสำคัญจ่ายฯ", href: "/reports/payvouchers" },
    ],
  },
  {
    label: "กราฟ", href: "#"
    ,
    submenu: [
      { label: "รายรับรายจ่าย", href: "/charts/inout" },

    ],
  },
  {
    label: "เครื่องมือ",
    href: "#",
    submenu: [
      { label: "จัดการผู้ใช้", href: "/tools/users" },
      { label: "นำเข้าข้อมูลเงินเดือน", href: "/tools/import-paydirect" },
      { label: "รายงานการใช้งาน useronline", href: "/tools/useronline" },
   
    ],
  },
];

export function AppHeader({ activePath }: { activePath?: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userCid, setUserCid] = useState<string | null>(null);
  // Bootstrap navbar/dropdown คุมด้วย state (ไม่โหลด JS ของ Bootstrap — PRD ข้อ 11)
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const isActive = (item: NavItem) => {
    if (!activePath || item.href === "#") return false;
    return activePath === item.href || activePath.startsWith(`${item.href}/`);
  };
  const isSubActive = (href: string) => {
    if (!activePath) return false;
    return activePath === href || activePath === `${href}/`;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedName = window.localStorage.getItem("userName");
    const storedStatus = window.localStorage.getItem("userStatus");
    const storedCid = window.localStorage.getItem("userCid");
    if (storedName) {
      setUserLabel(storedName);
    } else {
      // Fallback: fetch from API if not in localStorage
      fetch("/api/auth/me")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Unauthorized");
        })
        .then((data) => {
          const name = [data.user.fname, data.user.lname].filter(Boolean).join(" ").trim();
          const label = name || data.user.cid || "User";
          setUserLabel(label);
          window.localStorage.setItem("userName", label);
          if (data.user?.status) {
            const statusLower = String(data.user.status).toLowerCase();
            setUserStatus(statusLower);
            window.localStorage.setItem("userStatus", statusLower);
          }
          if (data.user?.cid) {
            setUserCid(data.user.cid);
            window.localStorage.setItem("userCid", data.user.cid);
          }
        })
        .catch(() => {
          // ignore errors
        });
    }

    if (storedStatus) {
      setUserStatus(storedStatus);
    }
    if (storedCid) {
      setUserCid(storedCid);
    }
  }, []);

  // คลิกนอกเมนู หรือกด Esc → ปิด dropdown
  useEffect(() => {
    if (!openDropdown) return;
    const onPointer = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenDropdown(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdown(null);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openDropdown]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("userName");
      }
    } catch (err) {
      // ignore errors, still redirect
    } finally {
      router.push("/login");
    }
  };

  const items = userStatus === "user" ? [] : navItems;

  return (
    <header className="d-print-none">
      <nav ref={navRef} className="navbar navbar-expand-lg bg-primary shadow-sm" data-bs-theme="dark">
        <div className="container-fluid">
          <span className="navbar-brand fw-bold">Salary Web Application</span>
          {items.length > 0 && (
            <button
              className="navbar-toggler"
              type="button"
              aria-controls="app-navbar"
              aria-expanded={menuOpen}
              aria-label="เปิด/ปิดเมนู"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="navbar-toggler-icon" />
            </button>
          )}
          <div id="app-navbar" className={`collapse navbar-collapse${menuOpen ? " show" : ""}`}>
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              {items.map((item) =>
                item.submenu ? (
                  <li key={item.label} className="nav-item dropdown">
                    <button
                      type="button"
                      className={`nav-link dropdown-toggle${
                        isActive(item) || item.submenu?.some((sub) => isSubActive(sub.href)) ? " active fw-semibold" : ""
                      }${openDropdown === item.label ? " show" : ""}`}
                      aria-expanded={openDropdown === item.label}
                      onClick={() => setOpenDropdown((cur) => (cur === item.label ? null : item.label))}
                    >
                      {item.label}
                    </button>
                    <ul className={`dropdown-menu${openDropdown === item.label ? " show" : ""}`} data-bs-theme="light">
                      {item.submenu.map((sub) => (
                        <li key={`${sub.href}-${sub.label}`}>
                          <Link
                            href={sub.href}
                            className={`dropdown-item${isSubActive(sub.href) ? " active" : ""}`}
                            onClick={() => {
                              setOpenDropdown(null);
                              setMenuOpen(false);
                            }}
                          >
                            {sub.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : (
                  <li key={item.label} className="nav-item">
                    <Link
                      href={item.href}
                      className={`nav-link${isActive(item) ? " active fw-semibold" : ""}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>
          <button
            className={`btn btn-sm btn-outline-light${items.length > 0 ? " ms-lg-3 mt-2 mt-lg-0" : " ms-auto"}`}
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Logging out..." : `Logout${userLabel ? ` (${userLabel})` : ""}`}
          </button>
        </div>
      </nav>
    </header>
  );
}
