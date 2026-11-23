"""Claude Code Stop hook: บังคับให้งานผ่าน Codex review ก่อน Claude จบ turn

exit 0 = ปล่อยให้หยุด, exit 2 = ส่ง stderr กลับไปให้ Claude แก้ต่อ
ทั้ง "review ไม่ผ่าน" และ "สคริปต์ crash" นับรอบร่วมกัน: บล็อกได้ไม่เกิน MAX_ROUNDS
แล้วหยุดให้คนตัดสินใจ (systemMessage) แทนการปล่อยผ่านเงียบๆ หรือวนไม่รู้จบ
"""
import json
import subprocess
import sys
from pathlib import Path

# กฎ Attack the Premise: แก้เกิน 2 รอบไม่ผ่าน ให้หยุดและกลับไปถามคน แทนการวนไม่รู้จบ
MAX_ROUNDS = 2

ROOT = Path(__file__).resolve().parent.parent
GIT = ROOT / ".git"


def rounds_file() -> Path:
    # เก็บตัวนับใน git dir จริง (รองรับ worktree ที่ .git เป็นไฟล์) เพื่อไม่ให้โผล่ใน diff
    r = subprocess.run(["git", "rev-parse", "--absolute-git-dir"], cwd=ROOT,
                       capture_output=True, text=True)
    if r.returncode != 0 or not r.stdout.strip():
        raise RuntimeError("cannot resolve git dir: " + (r.stderr or "").strip())
    return Path(r.stdout.strip()) / "pstack_rounds"


ROUNDS_FILE: Path = GIT / "pstack_rounds"  # ตั้งค่าจริงใน main()


def clear_rounds() -> None:
    try:
        ROUNDS_FILE.unlink(missing_ok=True)
    except OSError:
        pass  # ลบไม่ได้ = รอบถัดไปนับต่อ ซึ่งเข้มขึ้น ไม่ใช่หลวมลง


def run_review() -> tuple[bool, str]:
    r = subprocess.run([sys.executable, str(ROOT / "scripts" / "cross_review.py")],
                       cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode == 0, r.stdout or r.stderr


def read_rounds() -> int | None:
    """0 ถ้ายังไม่มีไฟล์; None ถ้าอ่านไม่ได้/ค่าเพี้ยน (ผู้เรียกต้อง escalate)"""
    try:
        n = int(ROUNDS_FILE.read_text().strip())
    except FileNotFoundError:
        return 0
    except (OSError, ValueError):
        return None
    return n if n >= 0 else None


def escalate(reason: str, report: str) -> int:
    """ปล่อยให้หยุด แต่แจ้งคนผ่าน systemMessage ว่างานยังไม่ผ่านด่าน"""
    clear_rounds()
    print(json.dumps({"systemMessage": f"pstack: {reason} หยุดให้คนตัดสินใจ (Attack the Premise)\n"
                      + report[-3000:]}, ensure_ascii=False))
    return 0


def decide(passed: bool, report: str, rounds: int | None) -> int:
    if passed:
        clear_rounds()
        return 0
    if rounds is None:
        return escalate("อ่านตัวนับรอบไม่ได้", report)
    if rounds >= MAX_ROUNDS:
        return escalate(f"ยังไม่ผ่านด่าน Codex หลัง {MAX_ROUNDS} รอบ", report)
    try:
        ROUNDS_FILE.write_text(str(rounds + 1))
    except OSError as e:
        # นับรอบไม่ได้ = บล็อกต่ออาจวนไม่รู้จบ จึงส่งให้คนตัดสินใจทันที
        return escalate(f"บันทึกตัวนับรอบไม่ได้ ({e})", report)
    print("Cross-model review (Codex) ไม่ผ่าน แก้ตามนี้แล้วจบงานใหม่ "
          f"(รอบ {rounds + 1}/{MAX_ROUNDS}):\n" + report[-6000:], file=sys.stderr)
    return 2


def main() -> int:
    global ROUNDS_FILE
    try:
        data = json.load(sys.stdin)
    except ValueError:
        data = {}
    if not GIT.exists():  # ไม่ใช่ git repo -> ไม่มีอะไรให้ตรวจ
        return 0
    try:
        ROUNDS_FILE = rounds_file()
        if not data.get("stop_hook_active"):
            clear_rounds()  # turn ใหม่ เริ่มนับรอบใหม่
        rounds = read_rounds()
        passed, report = run_review()
    except Exception as e:  # noqa: BLE001 - crash ต้องไม่ทำให้ด่านถูกข้ามเงียบๆ
        rounds = read_rounds()
        passed, report = False, f"pstack stop_gate crashed: {type(e).__name__}: {e}"
    return decide(passed, report, rounds)


if __name__ == "__main__":
    sys.stderr.reconfigure(encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    try:
        sys.exit(main())
    except Exception as e:  # noqa: BLE001 - ด่านสุดท้าย: crash ที่หลุดมาถึงนี่ต้องบล็อก ไม่ใช่ exit 1
        print(f"pstack stop_gate crashed: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(2)
