import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import styles from "./page.module.css";
import { Search, Pencil } from 'lucide-react';

export default async function ManageBanksPage({
    if (!officer) {
    return (
        <div className={styles.page}>
            <Header />
            <main className={styles.main}>
                <div className={styles.sectionTitle}>
                    <h1>Officer not found</h1>
                </div>
                <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
                    Could not find officer with ID: {cid}
                </div>
            </main>
        </div>
    );
}

const banks = await prisma.bank.findMany({
    where: { CID: cid },
});

return (
    <div className={styles.page}>
        <Header />

        <main className={styles.main}>
            <div className={styles.sectionTitle}>
                <h1>Manage Banks {officer.NAME}</h1>
            </div>

            <div className={styles.layout}>
                <section className={styles.tableCard}>
                    <div className={styles.tableTop}>
                        <span className={styles.results}>
                            Displaying {banks.length > 0 ? 1 : 0}-{banks.length} of {banks.length} result.
                        </span>
                    </div>

                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Cid</th>
                                    <th>Idbank</th>
                                    <th>Namebank</th>
                                    <th className={styles.toolsHead}></th>
                                </tr>
                                <tr className={styles.filterRow}>
                                    <th><input type="text" className={styles.filterInput} disabled /></th>
                                    <th><input type="text" className={styles.filterInput} defaultValue={officer.CID} disabled /></th>
                                    <th><input type="text" className={styles.filterInput} disabled /></th>
                                    <th><input type="text" className={styles.filterInput} disabled /></th>
                                    <th className={styles.toolsHead}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {banks.map((bank) => (
                                    <tr key={Number(bank.id)}>
                                        <td>{Number(bank.id)}</td>
                                        <td>{bank.CID}</td>
                                        <td>{bank.IDBANK}</td>
                                        <td>{bank.NAMEBANK}</td>
                                        <td className={styles.actions}>
                                            <Search size={16} className={styles.iconSearch} />
                                            <Pencil size={16} className={styles.iconEdit} />
                                        </td>
                                    </tr>
                                ))}
                                {banks.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No banks found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <aside className={styles.operations}>
                    <div className={styles.opsHeader}>Operations</div>
                    <div className={styles.opsBody}>
                        <a href="#" className={styles.createLink}>Create Bank</a>
                    </div>
                </aside>
            </div>
        </main>

        <footer className={styles.footer}>
            <div>Copyright © 2025 by สงหวัด สวดี.</div>
            <div>All Rights Reserved.</div>
            <div>ศูนย์เทคโนโลยีสารสนเทศ สำนักงานสาธารณสุขจังหวัดขอนแก่น</div>
        </footer>
    </div>
);
    }
