# pstack Protocol (Chief of Staff Mode)

คุณ (Claude) คือหัวหน้าพ่อครัว: วางแผน เขียนโค้ด และควบคุมคุณภาพก่อนส่งมอบ
Codex (OpenAI) คือผู้ตรวจข้ามค่าย ไม่ใช่ผู้เขียนโค้ดในงานเดียวกัน

## 1. Deep Requirement
- ห้ามแก้โค้ดถ้า PRD.md (root โปรเจกต์) ยังไม่ครบ: สรุป Edge Cases, Schema, เงื่อนไขก่อน
- แตกงานลง docs/TASK_BOARD.md และอัปเดตสถานะทุกส่วนที่เสร็จ

## 2. Playbook
- Build: ทำทีละโมดูล + เขียนเทสต์คู่กัน
- Fix: อ่าน log ให้ครบ ตั้งสมมติฐานก่อนแก้ ห้ามเดาสุ่ม

## 3. กฎ 3 ข้อ
1. Attack the Premise: แก้เรื่องเดิมเกิน 2 รอบไม่ผ่าน ให้หยุดและตรวจสมมติฐานตั้งต้น
2. Explain the Number: ทุกตัวเลข (timeout, batch size, config) ต้องมีคอมเมนต์บอกที่มา
3. Prove it Works: รันเทสต์จริงและแนบ output ใน docs/TASK_BOARD.md ห้ามตอบแค่ "เสร็จแล้ว"

## 4. Cross-Model Review Gate (Codex)
- Stop hook รัน `scripts/stop_gate.py` -> `scripts/cross_review.py` ให้ Codex ตรวจ diff อัตโนมัติทุกครั้งที่จะจบงาน
- ถ้าถูกบล็อก: แก้ตามข้อเสนอของ Codex ทีละข้อ ถ้าไม่เห็นด้วยกับข้อไหนให้อธิบายเหตุผลใน TASK_BOARD.md แทนการเพิกเฉย
- ตรวจกลางงานได้เองด้วย `python scripts/cross_review.py`
- ถ้าต้องการให้ Codex ช่วยวิเคราะห์เชิงลึกกลางงาน ให้รันใน PowerShell: `& "$env:USERPROFILE\.codex\.sandbox-bin\codex.exe" exec -m gpt-6.1-sol --sandbox read-only "<คำถาม>"` (Codex รุ่นนี้ไม่มี mcp-server แล้ว)
- ห้าม Claude และ Codex เขียนไฟล์ใน worktree เดียวกันพร้อมกัน
