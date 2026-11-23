"""Regression tests ของ scripts/cross_review.py (stdlib unittest ล้วน ไม่ต้องติดตั้งอะไรเพิ่ม)

รัน: python scripts/test_cross_review.py -v
แต่ละเทสต์สร้าง git repo ชั่วคราว คัดลอก cross_review.py เข้าไป แล้วแทน Codex ด้วยตัวปลอม
ที่จดเนื้อหา diff ที่ได้รับ จึงไม่เรียก Codex จริงและไม่แตะ repo จริง
"""
import contextlib
import hashlib
import importlib.util
import io
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPT = HERE / "cross_review.py"
# ข้อความภาษาไทยเข้ารหัส TIS-620 = ไม่ใช่ UTF-8 (กรณีไฟล์เก่าของระบบไทย)
TIS620_BYTES = "สวัสดี".encode("tis-620")
PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + bytes(range(256))


class FakeCodex:
    def __init__(self, verdict: str = "APPROVED"):
        self.verdict = verdict
        self.diffs: list[str] = []

    def __call__(self, codex: str, diff: str):
        self.diffs.append(diff)
        return 0, self.verdict, ""


class GateTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="pstack_test_"))
        self.repo = self.tmp / "repo"
        (self.repo / "scripts").mkdir(parents=True)
        shutil.copy(SCRIPT, self.repo / "scripts" / "cross_review.py")
        self.env_patch = {"GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t", "GIT_COMMITTER_NAME": "t",
                          "GIT_COMMITTER_EMAIL": "t@t", "GIT_CONFIG_NOSYSTEM": "1",
                          "GIT_CONFIG_GLOBAL": str(self.tmp / "gitconfig")}
        self.old_env = {k: os.environ.get(k) for k in self.env_patch}
        os.environ.update(self.env_patch)
        self.git("init", "-q", "-b", "main")
        self.git("config", "core.autocrlf", "false")
        self.write("app.py", "print('hello')\n")
        self.git("add", "-A")
        self.git("commit", "-qm", "init")
        spec = importlib.util.spec_from_file_location(f"cr_{id(self)}", self.repo / "scripts" / "cross_review.py")
        self.cr = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.cr)
        self.codex = FakeCodex()
        self.cr.run_codex = self.codex
        self.cr.find_codex = lambda: "fake-codex"

    def tearDown(self):
        for k, v in self.old_env.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        shutil.rmtree(self.tmp, ignore_errors=True)

    # helpers
    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.repo, check=True, capture_output=True).stdout

    def write(self, name, data):
        p = self.repo / name
        p.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(data, str):
            p.write_text(data, encoding="utf-8", newline="")
        else:
            p.write_bytes(data)

    def commit_all(self, msg="c"):
        self.git("add", "-A")
        self.git("commit", "-qm", msg)

    def run_gate(self):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            rc = self.cr.main([])
        return rc, buf.getvalue()

    def approve_current(self):
        rc, out = self.run_gate()
        self.assertEqual(rc, 0, out)

    # (a) baseline
    def test_commit_before_hook_is_still_reviewed(self):
        self.approve_current()  # ตั้ง baseline ที่สภาพ init
        self.write("app.py", "print('sneaky change')\n")
        self.commit_all("commit before the stop hook")
        self.codex.diffs.clear()
        rc, out = self.run_gate()
        self.assertEqual(rc, 0, out)
        self.assertEqual(len(self.codex.diffs), 1, "committed change must be sent to the reviewer")
        self.assertIn("+print('sneaky change')", self.codex.diffs[0])

    def test_rejected_change_stays_in_review_after_commit(self):
        self.approve_current()
        self.codex.verdict = "CHANGES_REQUESTED\n- app.py:1 - bad"
        self.write("app.py", "print('bad')\n")
        rc, _ = self.run_gate()
        self.assertEqual(rc, 1)
        self.commit_all()
        rc, _ = self.run_gate()
        self.assertEqual(rc, 1, "committing a rejected change must not clear it")
        self.assertIn("+print('bad')", self.codex.diffs[-1])

    def test_no_changes_after_approval_skips_codex(self):
        self.write("new.txt", "x\n")
        self.approve_current()
        self.codex.diffs.clear()
        rc, out = self.run_gate()
        self.assertEqual(rc, 0)
        self.assertIn("no changes since last review", out)
        self.commit_all()  # commit สิ่งที่ตรวจแล้ว -> เนื้อหาเท่าเดิม ไม่ต้องตรวจซ้ำ
        rc, out = self.run_gate()
        self.assertEqual((rc, self.codex.diffs), (0, []), out)

    def test_first_run_without_baseline_compares_to_head(self):
        self.write("app.py", "print('x')\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 0)
        self.assertIn("no reviewed baseline yet", out)
        ref = self.cr.baseline_ref()
        self.assertTrue(ref.startswith("refs/pstack/reviewed-"))
        tree = self.git("rev-parse", ref + "^{tree}").decode().strip()
        self.assertEqual(tree, self.cr.snapshot_tree())

    def test_snapshot_does_not_touch_real_index(self):
        self.write("app.py", "print('unstaged')\n")
        self.write("untracked.txt", "u\n")
        before = self.git("status", "--porcelain")
        self.approve_current()
        self.assertEqual(self.git("status", "--porcelain"), before)

    def test_baseline_compare_and_swap(self):
        ref = self.cr.baseline_ref()
        tree = self.cr.head_tree()
        self.cr.save_baseline(ref, tree, None)
        with self.assertRaises(self.cr.ReviewError):
            self.cr.save_baseline(ref, tree, None)  # อีก session ตั้งไปแล้ว -> ห้ามทับ

    def test_rebaseline_refused_without_terminal(self):
        buf = io.StringIO()
        old = sys.stdin
        sys.stdin = io.StringIO("yes\n")  # มีคำว่า yes แต่ไม่ใช่ terminal -> ต้องปฏิเสธ
        try:
            with contextlib.redirect_stdout(buf):
                rc = self.cr.main(["--rebaseline"])
        finally:
            sys.stdin = old
        self.assertEqual(rc, 1)
        self.assertIn("REFUSED", buf.getvalue())

    # (b) binary / non-UTF-8
    def test_tracked_binary_change_rejected(self):
        self.write("logo.png", PNG_BYTES)
        self.commit_all()
        self.git("update-ref", self.cr.baseline_ref(), self.git("rev-parse", "HEAD").decode().strip())
        self.write("logo.png", PNG_BYTES + b"\x00more")
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("logo.png: binary/non-UTF-8 content cannot be reviewed", out)
        self.assertEqual(self.codex.diffs, [])

    def test_tracked_non_utf8_change_rejected(self):
        self.write("legacy.php", b"<?php echo '" + TIS620_BYTES + b"';\n")
        self.commit_all()
        self.git("update-ref", self.cr.baseline_ref(), self.git("rev-parse", "HEAD").decode().strip())
        self.write("legacy.php", b"<?php echo '" + TIS620_BYTES + TIS620_BYTES + b"';\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("legacy.php: binary/non-UTF-8", out)
        self.assertEqual(self.codex.diffs, [])

    def test_untracked_non_utf8_rejected(self):
        self.write("new.txt", TIS620_BYTES)
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("new.txt: binary/non-UTF-8", out)

    def test_allowlisted_binary_with_matching_checksum_passes(self):
        data = PNG_BYTES + b"v2"
        self.write("dist/app.exe", data)
        digest = hashlib.sha256(data).hexdigest()
        self.write("scripts/pstack_allowlist.sha256",
                   f"# release build, checksum from release.json\n{digest}  dist/app.exe\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 0, out)
        sent = self.codex.diffs[0]
        self.assertIn(f"dist/app.exe sha256={digest}", sent)
        self.assertIn("+" + digest, sent, "the allowlist entry itself must be reviewed")
        self.assertNotIn("Binary files", sent)

    def test_allowlisted_binary_with_wrong_checksum_rejected(self):
        self.write("dist/app.exe", PNG_BYTES)
        self.write("scripts/pstack_allowlist.sha256", f"{'0' * 64}  dist/app.exe\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("listed as 000", out)
        self.assertEqual(self.codex.diffs, [])

    def test_large_untracked_rejected_unless_allowlisted(self):
        big = b"a" * (self.cr.MAX_UNTRACKED_FILE + 1)
        self.write("big.txt", big)
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("new file too large", out)
        self.write("scripts/pstack_allowlist.sha256", f"{hashlib.sha256(big).hexdigest()}  big.txt\n")
        rc, out = self.run_gate()
        self.assertNotIn("new file too large", out)

    def test_gitattributes_binary_text_file_rejected(self):
        self.write(".gitattributes", "*.dat -diff\n")
        self.write("data.dat", "plain text\n")
        self.commit_all()
        self.git("update-ref", self.cr.baseline_ref(), self.git("rev-parse", "HEAD").decode().strip())
        self.write("data.dat", "changed text\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("data.dat: binary/non-UTF-8", out)

    def test_deleted_binary_allowed_with_note(self):
        self.write("logo.png", PNG_BYTES)
        self.commit_all()
        self.git("update-ref", self.cr.baseline_ref(), self.git("rev-parse", "HEAD").decode().strip())
        (self.repo / "logo.png").unlink()
        rc, out = self.run_gate()
        self.assertEqual(rc, 0, out)
        self.assertIn("D logo.png (deleted", self.codex.diffs[0])

    def test_non_utf8_converted_to_utf8_shows_full_new_text(self):
        self.write("legacy.php", b"<?php echo '" + TIS620_BYTES + b"';\n")
        self.commit_all()
        self.git("update-ref", self.cr.baseline_ref(), self.git("rev-parse", "HEAD").decode().strip())
        self.write("legacy.php", "<?php echo 'สวัสดี';\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 0, out)
        self.assertIn("+<?php echo 'สวัสดี';", self.codex.diffs[0])
        self.assertIn("full new content follows", self.codex.diffs[0])

    # อื่นๆ (6 ข้อแก้เดิมของ ncd-connect)
    def test_thai_and_newline_filenames(self):
        self.write("ทดสอบ.txt", "ข้อมูล\n")
        if os.name != "nt":
            self.write("a\nb.txt", "nl\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 0, out)
        self.assertIn("b/ทดสอบ.txt", self.codex.diffs[0])
        self.assertIn("+ข้อมูล", self.codex.diffs[0])

    def test_symlink_not_followed(self):
        secret = self.tmp / "secret.txt"
        secret.write_text("TOP_SECRET_VALUE\n")
        try:
            os.symlink(secret, self.repo / "link.txt")
        except OSError as e:
            self.skipTest(f"cannot create symlink on this account: {e}")
        rc, out = self.run_gate()
        self.assertNotIn("TOP_SECRET_VALUE", "".join(self.codex.diffs))

    def test_oversized_diff_rejected_not_truncated(self):
        self.write("big.py", "x = 1\n" * (self.cr.MAX_DIFF // 6 + 10))
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("REVIEW_FAILED: diff since last review", out)
        self.assertEqual(self.codex.diffs, [])

    def test_verdict_must_be_exact(self):
        self.codex.verdict = "APPROVED_WITH_CONCERNS"
        self.write("app.py", "print(2)\n")
        rc, _ = self.run_gate()
        self.assertEqual(rc, 1)
        rc, _ = self.run_gate()
        self.assertEqual(len(self.codex.diffs), 2, "non-approval must not record a baseline")

    def test_git_failure_blocks(self):
        (self.repo / ".git").rename(self.repo / "not_git")  # ไม่ใช่ repo แล้ว -> git rev-parse ล้ม
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("REVIEW_FAILED", out)

    def test_embedded_repo_rejected(self):
        sub = self.repo / "vendor_repo"
        sub.mkdir()
        subprocess.run(["git", "init", "-q"], cwd=sub, check=True)
        (sub / "f.txt").write_text("x")
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("embedded git repository", out)

    # index flags / submodules (Codex รอบ 1 ของงานนี้)
    def test_assume_unchanged_file_still_reviewed(self):
        self.approve_current()
        self.git("update-index", "--assume-unchanged", "app.py")
        self.write("app.py", "print('hidden by assume-unchanged')\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 0, out)
        self.assertIn("+print('hidden by assume-unchanged')", self.codex.diffs[-1])

    def test_skip_worktree_file_still_reviewed(self):
        self.approve_current()
        self.git("update-index", "--skip-worktree", "app.py")
        self.write("app.py", "print('hidden by skip-worktree')\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 0, out)
        self.assertIn("+print('hidden by skip-worktree')", self.codex.diffs[-1])

    def _make_sub(self):
        sub = self.repo / "sub"
        sub.mkdir()
        subprocess.run(["git", "init", "-q"], cwd=sub, check=True)
        (sub / "f.txt").write_text("v1\n")
        subprocess.run(["git", "add", "-A"], cwd=sub, check=True)
        subprocess.run(["git", "commit", "-qm", "s1"], cwd=sub, check=True)
        return sub

    def test_staged_embedded_repo_rejected(self):
        self.approve_current()
        self._make_sub()
        self.git("add", "sub")  # gitlink ใน index จริง -> ไม่ใช่ untracked แล้ว
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("sub: submodule/embedded repository change cannot be reviewed", out)
        self.assertEqual(self.codex.diffs, [])

    def test_submodule_pointer_change_rejected(self):
        sub = self._make_sub()
        self.commit_all("add sub")
        self.git("update-ref", self.cr.baseline_ref(), self.git("rev-parse", "HEAD").decode().strip())
        (sub / "f.txt").write_text("v2\n")
        subprocess.run(["git", "commit", "-qam", "s2"], cwd=sub, check=True)
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("submodule/embedded repository change", out)

    def test_dirty_submodule_rejected(self):
        sub = self._make_sub()
        self.commit_all("add sub")
        self.git("update-ref", self.cr.baseline_ref(), self.git("rev-parse", "HEAD").decode().strip())
        (sub / "f.txt").write_text("dirty\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("submodule has uncommitted changes", out)

    # Codex รอบ 2 ของงานนี้
    def _deleted_flagged(self, flag):
        self.approve_current()
        self.git("update-index", flag, "app.py")
        (self.repo / "app.py").unlink()
        rc, out = self.run_gate()
        self.assertEqual(rc, 0, out)
        self.assertEqual(len(self.codex.diffs), 1, f"deletion hidden by {flag}")
        self.assertIn("deleted file mode", self.codex.diffs[-1])

    def test_deleted_assume_unchanged_file_reviewed(self):
        self._deleted_flagged("--assume-unchanged")

    def test_deleted_skip_worktree_file_reviewed(self):
        self._deleted_flagged("--skip-worktree")

    def test_racy_same_size_edit_detected(self):
        self.approve_current()
        self.write("app.py", "print('AAAAA')\n")
        self.git("add", "app.py")  # index เขียนในวินาทีเดียวกับไฟล์
        self.write("app.py", "print('BBBBB')\n")  # ขนาดเท่ากัน แก้ทันที
        rc, out = self.run_gate()
        self.assertEqual(rc, 0, out)
        self.assertIn("+print('BBBBB')", self.codex.diffs[-1])

    def test_submodule_pointer_hidden_by_config_rejected(self):
        sub = self._make_sub()
        self.commit_all("add sub")
        self.git("update-ref", self.cr.baseline_ref(), self.git("rev-parse", "HEAD").decode().strip())
        self.git("config", "diff.ignoreSubmodules", "all")
        self.write(".gitmodules", '[submodule "sub"]\n\tpath = sub\n\turl = ./sub\n\tignore = all\n')
        self.git("add", ".gitmodules")
        (sub / "f.txt").write_text("v2\n")
        subprocess.run(["git", "commit", "-qam", "s2"], cwd=sub, check=True)
        rc, out = self.run_gate()
        self.assertEqual(rc, 1, out)
        self.assertIn("submodule", out)
        self.assertEqual(self.codex.diffs, [])

    def test_submodule_with_index_flags_rejected(self):
        sub = self._make_sub()
        self.commit_all("add sub")
        self.git("update-ref", self.cr.baseline_ref(), self.git("rev-parse", "HEAD").decode().strip())
        subprocess.run(["git", "update-index", "--assume-unchanged", "f.txt"], cwd=sub, check=True)
        (sub / "f.txt").write_text("hidden\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("assume-unchanged/skip-worktree", out)

    def test_change_during_review_not_approved(self):
        self.approve_current()
        self.write("app.py", "print('reviewed')\n")
        repo = self.repo

        def sneaky(codex, diff):
            (repo / "app.py").write_text("print('changed during review')\n")
            return 0, "APPROVED", ""
        self.cr.run_codex = sneaky
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("files changed while Codex was reviewing", out)
        self.cr.run_codex = self.codex
        rc, out = self.run_gate()  # baseline ไม่ถูกเลื่อน -> ต้องตรวจเนื้อหาล่าสุด
        self.assertIn("+print('changed during review')", self.codex.diffs[-1])

    # Codex รอบ 3 ของงานนี้
    def test_oversized_allowlisted_text_with_wrong_checksum_rejected(self):
        big = "ก" * (self.cr.MAX_UNTRACKED_FILE // 3 + 1)  # ตัวไทย 3 ไบต์ใน UTF-8 -> เกินขนาดแต่เป็นข้อความ
        self.write("big.txt", big)
        self.write("scripts/pstack_allowlist.sha256", f"{'a' * 64}  big.txt\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("sha256 does not match", out)
        self.assertEqual(self.codex.diffs, [])

    def test_clean_filter_change_requires_checksum(self):
        self.git("config", "filter.fake.clean", "cat")
        self.git("config", "filter.fake.smudge", "cat")
        self.write(".gitattributes", "*.bin filter=fake\n")
        self.write("asset.bin", "v1\n")
        self.commit_all()
        self.git("update-ref", self.cr.baseline_ref(), self.git("rev-parse", "HEAD").decode().strip())
        self.write("asset.bin", "v2\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("asset.bin: file uses a git clean filter", out)
        digest = hashlib.sha256(b"v2\n").hexdigest()
        self.write("scripts/pstack_allowlist.sha256", f"{digest}  asset.bin\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 0, out)
        self.assertIn(f"asset.bin sha256={digest} (filtered file", self.codex.diffs[-1])

    def test_nested_submodule_with_index_flags_rejected(self):
        sub = self._make_sub()
        inner = sub / "inner"
        inner.mkdir()
        subprocess.run(["git", "init", "-q"], cwd=inner, check=True)
        (inner / "g.txt").write_text("i1\n")
        subprocess.run(["git", "add", "-A"], cwd=inner, check=True)
        subprocess.run(["git", "commit", "-qm", "i1"], cwd=inner, check=True)
        subprocess.run(["git", "add", "-A"], cwd=sub, check=True, capture_output=True)
        subprocess.run(["git", "commit", "-qm", "add inner"], cwd=sub, check=True)
        self.commit_all("add sub")
        self.git("update-ref", self.cr.baseline_ref(), self.git("rev-parse", "HEAD").decode().strip())
        subprocess.run(["git", "update-index", "--assume-unchanged", "g.txt"], cwd=inner, check=True)
        (inner / "g.txt").write_text("hidden deep\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 1, out)
        self.assertIn("sub/inner", out)
        self.assertEqual(self.codex.diffs, [])

    def test_bad_allowlist_line_rejected(self):
        self.write("scripts/pstack_allowlist.sha256", "not-a-hash  file.bin\n")
        rc, out = self.run_gate()
        self.assertEqual(rc, 1)
        self.assertIn("expected '<sha256>  <path>'", out)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    unittest.main()
