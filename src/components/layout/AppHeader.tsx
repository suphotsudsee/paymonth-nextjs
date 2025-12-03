'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./HeaderFooter.module.css";

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
   
    ],
  },
];

export function AppHeader({ activePath }: { activePath?: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userCid, setUserCid] = useState<string | null>(null);
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

  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>Salary Web Application</div>
      <nav className={styles.nav}>
        {(userStatus === "user" ? [] : navItems).map((item) =>
          item.submenu ? (
            <div key={item.label} className={styles.navItemDropdown}>
              <Link
                href={item.href}
                className={`${styles.navItem} ${isActive(item) || item.submenu?.some((sub) => isSubActive(sub.href)) ? styles.active : ""
                  }`}
              >
                {item.label}
              </Link>
              <div className={styles.dropdownMenu}>
                {item.submenu.map((sub) => (
                  <Link
                    key={`${sub.href}-${sub.label}`}
                    href={sub.href}
                    className={`${styles.menuItem} ${isSubActive(sub.href) ? styles.menuItemActive : ""}`}
                  >
                    {sub.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className={`${styles.navItem} ${isActive(item) ? styles.active : ""}`}
            >
              {item.label}
            </Link>
          ),
        )}
      </nav>
      <button className={styles.logout} onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? "Logging out..." : `Logout${userLabel ? ` (${userLabel})` : ""}`}
      </button>
    </header>
  );
}
