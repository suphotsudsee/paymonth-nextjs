"""pstack cross-model review gate: ให้ Codex (OpenAI) ตรวจงานที่ Claude ทำ

exit 0 = APPROVED, exit 1 = มีข้อแก้ไข หรือผู้ตรวจใช้งานไม่ได้ (ถือว่าไม่ผ่าน)
รันเองได้: python scripts/cross_review.py
คนเท่านั้น (ต้องพิมพ์ยืนยันใน terminal): python scripts/cross_review.py --rebaseline
เทสต์: python scripts/test_cross_review.py

เทียบกับอะไร: "สภาพไฟล์ที่ Codex ตรวจผ่านล่าสุด" (baseline) ไม่ใช่ HEAD
  - ทุกครั้งที่ APPROVED จะ snapshot ไฟล์ทั้งหมด (รวมไฟล์ใหม่ที่ยังไม่ add) เป็น git tree
    แล้วเก็บไว้ที่ ref refs/pstack/reviewed-<id> ใน git dir (ไม่ใช่ branch, git push ปกติไม่ส่งไป)
  - รอบถัดไปตรวจ diff ระหว่าง baseline กับสภาพปัจจุบัน ดังนั้นการ commit ก่อน hook ทำงาน
    ไม่ทำให้โค้ดหลบการตรวจได้ (โค้ดที่ commit แล้วยังต่างจาก baseline)
  - ยังไม่มี baseline (ใช้ครั้งแรก) -> เทียบกับ HEAD แล้วตั้ง baseline เมื่อผ่าน
  - สลับ branch / pull งานคนอื่น จน diff ใหญ่เกิน -> คนตรวจเองแล้วรัน --rebaseline (ตั้ง baseline = HEAD)

ไฟล์ binary / ไม่ใช่ UTF-8: Codex อ่านเนื้อหาไม่ได้ จึงไม่ผ่าน ยกเว้นไฟล์ที่ระบุ path + sha256
ของเนื้อหาใหม่ไว้ใน ALLOWLIST (รูปแบบเดียวกับ sha256sum) และ checksum ตรงกัน ไฟล์ allowlist เป็นข้อความ
จึงถูก Codex ตรวจทุกครั้งที่มีการเพิ่ม/แก้รายการ
"""
import hashlib
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# ~60k ตัวอักษร ≈ 15k tokens: ใหญ่พอสำหรับงานหนึ่งโมดูล และยังตรวจได้แม่น
# ถ้าเกินให้ไม่ผ่าน (ไม่ตัดทิ้ง) เพราะส่วนที่ถูกตัดจะผ่านด่านโดยไม่มีใครตรวจ ให้แบ่งงานให้เล็กลง
MAX_DIFF = 60_000
# Codex ตรวจ diff ขนาดกลางใช้ราว 1-4 นาที; 540 วิ ให้จบก่อน hook timeout 600 วิ (.claude/settings.json)
TIMEOUT = 540
# ไฟล์ใหม่ (untracked) ที่ใหญ่กว่านี้ตรวจไม่ได้ (มักเป็น lock/build output) -> ไม่ผ่าน เว้นแต่อยู่ใน ALLOWLIST
# ตรวจก่อน snapshot เพื่อไม่ให้ไฟล์ใหญ่ถูกเขียนลง .git โดยไม่จำเป็น
MAX_UNTRACKED_FILE = 200_000
# โมเดลผู้ตรวจ: config.toml ของ Codex app ตั้ง gpt-6.2-sol ซึ่ง CLI + บัญชี ChatGPT ใช้ไม่ได้
# (ทดสอบ 2026-11-23 ได้ error model_not_found) จึงระบุเอง เปลี่ยนได้ด้วย env CODEX_MODEL
CODEX_MODEL = os.environ.get("CODEX_MODEL", "gpt-6.1-sol")

ROOT = Path(__file__).resolve().parent.parent
# รายการยกเว้นไฟล์ binary/ไม่ใช่ UTF-8 (path จาก root คั่นด้วย /) ไม่มีไฟล์ = ไม่ยกเว้นอะไรเลย
ALLOWLIST = "scripts/pstack_allowlist.sha256"
# sha1 ของ tree ว่าง (ค่าคงที่ของ git) ใช้เป็น baseline เมื่อ repo ยังไม่มี commit
EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
ZERO_OID = "0" * 40
# mode ของ git ที่เป็นเนื้อหาไฟล์ (ไฟล์ปกติ, ไฟล์ executable, symlink); 160000 = submodule ไม่มีเนื้อหา
BLOB_MODES = ("100644", "100755", "120000")
# ปิดค่า config ของผู้ใช้ที่เปลี่ยนรูปแบบ output: quotepath ทำชื่อไทยเป็น \xxx, prefix/สี ทำให้ parse ผิด
GIT_CFG = ["-c", "core.quotepath=false", "-c", "diff.noprefix=false", "-c", "diff.mnemonicPrefix=false",
           "-c", "color.ui=false", "-c", "core.fsmonitor=false"]  # fsmonitor อาจรายงานไฟล์ที่แก้ไม่ครบ
# --ignore-submodules=none: กัน config diff.ignoreSubmodules ซ่อนการเปลี่ยน pointer ของ submodule
DIFF_OPTS = ["--no-renames", "--no-ext-diff", "--no-textconv", "--ignore-submodules=none",
             "--src-prefix=a/", "--dst-prefix=b/"]


class ReviewError(Exception):
    """เก็บ diff ไม่ครบ -> ต้องไม่ผ่านด่าน (ห้ามกลายเป็น APPROVED เงียบๆ)"""


def git_env(**extra: str) -> dict:
    # ตัดตัวแปรที่ทำให้ git ไปใช้ repo/index อื่นที่ไม่ใช่ ROOT
    env = {k: v for k, v in os.environ.items()
           if k not in ("GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_EXTERNAL_DIFF")}
    env.update(extra)
    return env


def git_bytes(*args: str, env: dict | None = None, allow_fail: bool = False,
              stdin: bytes | None = None) -> bytes:
    r = subprocess.run(["git", *GIT_CFG, *args], cwd=ROOT, capture_output=True,
                       env=env or git_env(), input=stdin)
    if r.returncode != 0:
        if allow_fail:
            return b""
        err = r.stderr.decode("utf-8", errors="replace").strip()
        raise ReviewError(f"git {' '.join(args)} failed ({r.returncode}): {err}")
    return r.stdout


def git(*args: str, **kw) -> str:
    # output ควบคุม (sha, path) ต้องเป็น UTF-8 จริง ไม่แทนตัวอักษรเงียบๆ
    try:
        return git_bytes(*args, **kw).decode("utf-8")
    except UnicodeDecodeError:
        raise ReviewError(f"git {' '.join(args)} returned non-UTF-8 output") from None


# ---------- baseline ----------

def baseline_ref() -> str:
    # แยกต่อ worktree (git dir ต่างกัน) เพราะแต่ละ worktree อยู่คนละ branch
    git_dir = git("rev-parse", "--absolute-git-dir").strip()
    key = hashlib.sha256(os.path.normcase(git_dir).encode("utf-8")).hexdigest()[:12]
    return f"refs/pstack/reviewed-{key}"


def head_tree() -> str:
    # repo ที่ยังไม่มี commit แรก HEAD ไม่มีได้ตามปกติ -> tree ว่าง
    t = git("rev-parse", "--verify", "--quiet", "HEAD^{tree}", allow_fail=True).strip()
    return t or EMPTY_TREE


def read_baseline(ref: str) -> tuple[str | None, str]:
    """(commit ที่ ref ชี้ หรือ None, tree ที่ใช้เป็น baseline)"""
    commit = git("rev-parse", "--verify", "--quiet", ref + "^{commit}", allow_fail=True).strip()
    if not commit:
        return None, head_tree()
    return commit, git("rev-parse", "--verify", commit + "^{tree}").strip()


def save_baseline(ref: str, tree: str, old_commit: str | None) -> None:
    # ref ต้องชี้ commit (ไม่ใช่ tree ตรงๆ) เพื่อให้ git gc เก็บไว้และ git log --all ไม่ error
    ident = {"GIT_AUTHOR_NAME": "pstack", "GIT_AUTHOR_EMAIL": "pstack@localhost",
             "GIT_COMMITTER_NAME": "pstack", "GIT_COMMITTER_EMAIL": "pstack@localhost"}
    commit = git("commit-tree", tree, "-m",
                 "pstack: snapshot reviewed by Codex (not a branch; used by scripts/cross_review.py)",
                 env=git_env(**ident)).strip()
    # ระบุค่าเดิม = compare-and-swap: ถ้าอีก session อัปเดต baseline ไปก่อน ให้ล้มแทนการทับ
    git("update-ref", "-m", "pstack review approved", ref, commit, old_commit or ZERO_OID)


# ---------- snapshot ----------

def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):  # อ่านทีละ 1 MiB ไม่โหลดไฟล์ใหญ่ทั้งก้อน
            h.update(chunk)
    return h.hexdigest()


def check_untracked(allow: dict[str, str]) -> None:
    others = git_bytes("ls-files", "-z", "--others", "--exclude-standard")
    for raw in others.split(b"\0"):
        if not raw:
            continue
        name = raw.decode("utf-8", errors="replace")
        if name.endswith("/"):
            # git ไม่ลงไปใน repo ซ้อน (มี .git ข้างใน) แสดงเป็นโฟลเดอร์ และ git add เก็บแค่ commit id
            raise ReviewError(f"embedded git repository cannot be reviewed: {name}")
        p = ROOT / name
        try:
            st = p.lstat()
        except OSError as e:
            raise ReviewError(f"new file cannot be read: {name} ({e})") from None
        if p.is_symlink() or st.st_size <= MAX_UNTRACKED_FILE:
            continue
        if name not in allow:
            raise ReviewError(f"new file too large to review ({st.st_size} bytes > {MAX_UNTRACKED_FILE}): "
                              f"{name} - add it to .gitignore or list its sha256 in {ALLOWLIST}")
        # ยกเว้นขนาดได้ต่อเมื่อ checksum ตรงเท่านั้น (ไฟล์ข้อความใหญ่อาจผ่านด่าน binary ได้โดยไม่ถูกเช็ก)
        digest = sha256_file(p)
        if digest != allow[name]:
            raise ReviewError(f"new file too large and sha256 does not match {ALLOWLIST}: {name} "
                              f"(sha256={digest}, listed as {allow[name]})")


def clear_index_flags(env: dict) -> None:
    """index ที่คัดลอกมาอาจมี assume-unchanged / skip-worktree ซึ่งทำให้ git add -A ข้ามไฟล์ที่แก้แล้ว
    ล้าง flag ใน index ชั่วคราว (ไม่แตะ index จริง) -> ไฟล์ที่ถูกลบจะถูกนับเป็นการลบด้วย
    ยกเว้นเดียว: repo ที่เปิด sparse checkout ไฟล์ skip-worktree ที่ไม่มีบนดิสก์คือไฟล์ที่ไม่ได้ checkout
    (ไม่ใช่การลบ) จึงคง flag ไว้ และ snapshot ใช้เนื้อหาใน index ตามเดิม"""
    sparse = git("config", "--bool", "core.sparseCheckout", allow_fail=True).strip() == "true"
    assume, skip = [], []
    for rec in git_bytes("ls-files", "-z", "-v", env=env).split(b"\0"):
        if len(rec) < 3:
            continue
        tag, path = rec[:1], rec[2:]
        if tag.islower():  # ls-files -v: ตัวพิมพ์เล็ก = assume-unchanged
            assume.append(path)
        if tag.upper() == b"S":  # S = skip-worktree
            on_disk = os.path.lexists(ROOT / path.decode("utf-8", errors="replace"))
            if on_disk or not sparse:
                skip.append(path)
    for flag, paths in (("--no-assume-unchanged", assume), ("--no-skip-worktree", skip)):
        if paths:
            git_bytes("update-index", flag, "-z", "--stdin", env=env, stdin=b"\0".join(paths) + b"\0")


def _repo_git(repo: Path, label: str, *args: str) -> bytes:
    r = subprocess.run(["git", "-C", str(repo), *GIT_CFG, *args], capture_output=True, env=git_env())
    if r.returncode != 0:
        raise ReviewError(f"cannot inspect submodule {label}: {r.stderr.decode('utf-8', 'replace')}")
    return r.stdout


def check_submodules(tree: str, repo: Path = ROOT, prefix: str = "") -> None:
    """submodule ตรวจด้วยด่านนี้ไม่ได้ (diff มีแค่ commit id) จึงยอมเฉพาะเมื่อ submodule ตรงกับ
    pointer ใน snapshot ไม่มีงานค้าง ไม่มี index flag และ submodule ซ้อนข้างในก็ผ่านเงื่อนไขเดียวกัน
    (ตรวจแบบ recursive); ไม่อย่างนั้นไม่ผ่าน (fail closed)"""
    for rec in _repo_git(repo, prefix or ".", "ls-tree", "-r", "-z", tree).split(b"\0"):
        if not rec.startswith(b"160000 "):
            continue
        meta, path_b = rec.split(b"\t", 1)
        oid, path = meta.split()[2].decode("ascii"), prefix + path_b.decode("utf-8", errors="replace")
        sub = repo / path_b.decode("utf-8", errors="replace")
        if not (sub / ".git").exists():
            continue  # submodule ที่ไม่ได้ checkout ไม่มีเนื้อหาบนดิสก์

        def sub_git(*args: str) -> bytes:
            return _repo_git(sub, path, *args)

        # HEAD ต่างจาก pointer = ถูก config ignore ไม่ให้ git add เห็น -> ไม่ผ่าน
        if sub_git("rev-parse", "HEAD").decode("ascii").strip() != oid:
            raise ReviewError(f"submodule HEAD differs from recorded pointer, cannot be reviewed: {path}")
        # flag ใน index ของ submodule ทำให้ status มองไม่เห็นไฟล์ที่แก้ -> ไม่ยอมรับเลย
        if any(rec[:1].islower() or rec[:1].upper() == b"S"
               for rec in sub_git("ls-files", "-z", "-v").split(b"\0") if rec):
            raise ReviewError(f"submodule has assume-unchanged/skip-worktree files, cannot be verified: {path}")
        if sub_git("status", "--porcelain", "--untracked-files=all", "--ignore-submodules=none").strip():
            raise ReviewError(f"submodule has uncommitted changes that cannot be reviewed: {path}")
        check_submodules(oid, sub, path + "/")  # submodule ซ้อน: status ของชั้นนอกมองไม่เห็น flag ข้างใน


def snapshot_tree() -> str:
    """เขียนสภาพไฟล์ปัจจุบัน (tracked + untracked ที่ไม่ถูก ignore) เป็น git tree โดยไม่แตะ index จริง"""
    index = git("rev-parse", "--git-path", "index").strip()
    index_path = Path(index) if Path(index).is_absolute() else ROOT / index
    with tempfile.TemporaryDirectory() as tmp:
        tmp_index = Path(tmp) / "index"
        if index_path.exists():
            # ใช้ stat cache ของ index จริง ไม่ต้อง hash ใหม่ทุกไฟล์; copy2 คงเวลาแก้ไขของไฟล์ index ไว้
            # เพราะ git ใช้เวลานี้ตรวจ "racily clean" (ไฟล์ที่แก้ในวินาทีเดียวกับที่ index ถูกเขียน)
            shutil.copy2(index_path, tmp_index)
        env = git_env(GIT_INDEX_FILE=str(tmp_index))
        clear_index_flags(env)
        # symlink ถูกเก็บเป็น path ปลายทาง (ไม่ตาม link) จึงไม่ส่งไฟล์นอก repo ให้ผู้ตรวจ
        git("add", "-A", "--", ":/", env=env)
        return git("write-tree", env=env).strip()


# ---------- allowlist ----------

_ALLOW_LINE = re.compile(r"^([0-9a-fA-F]{64}) [ *](.+)$")


def parse_allowlist(data: bytes) -> dict[str, str]:
    """รูปแบบ sha256sum: '<sha256>  <path>' ต่อบรรทัด, '#' = คอมเมนต์ (ใส่เหตุผลของแต่ละรายการ)"""
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        raise ReviewError(f"{ALLOWLIST} is not UTF-8") from None
    allow: dict[str, str] = {}
    for n, line in enumerate(text.splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = _ALLOW_LINE.match(line)
        if not m:
            raise ReviewError(f"{ALLOWLIST}:{n}: expected '<sha256>  <path>'")
        allow[m.group(2).strip()] = m.group(1).lower()
    return allow


def allowlist_from_worktree() -> dict[str, str]:
    p = ROOT / ALLOWLIST
    return parse_allowlist(p.read_bytes()) if p.is_file() else {}


def allowlist_from_tree(tree: str) -> dict[str, str]:
    exists = git("ls-tree", "--name-only", tree, "--", ALLOWLIST).strip()
    return parse_allowlist(git_bytes("cat-file", "blob", f"{tree}:{ALLOWLIST}")) if exists else {}


# ---------- diff ----------

def cat_blobs(oids: list[str]) -> dict[str, bytes]:
    """อ่าน blob หลายตัวด้วย git process เดียว (cat-file --batch)"""
    oids = sorted(set(oids))
    if not oids:
        return {}
    out = git_bytes("cat-file", "--batch", stdin=("\n".join(oids) + "\n").encode("ascii"))
    blobs, pos = {}, 0
    for oid in oids:
        nl = out.index(b"\n", pos)
        header = out[pos:nl].split()
        if len(header) != 3 or header[1] != b"blob":
            raise ReviewError(f"cannot read blob {oid}: {out[pos:nl]!r}")
        size = int(header[2])
        blobs[oid] = out[nl + 1:nl + 1 + size]
        pos = nl + 1 + size + 1  # +1 = newline ที่ cat-file --batch ปิดท้ายแต่ละ object
    return blobs


def is_text(data: bytes) -> bool:
    # git ดู NUL แค่ 8000 ไบต์แรก (xdiff-interface.c) เราดูทั้งไฟล์ และต้องถอด UTF-8 ได้ทั้งไฟล์
    if b"\0" in data:
        return False
    try:
        data.decode("utf-8")
    except UnicodeDecodeError:
        return False
    return True


def changed_entries(base: str, cur: str) -> list[tuple[str, str, str, str, str, str]]:
    """[(old_mode, new_mode, old_oid, new_oid, status, path)] แยกด้วย NUL (-z) รองรับชื่อไทย/ขึ้นบรรทัด"""
    raw = git_bytes("diff", "--raw", "-z", "--no-abbrev", *DIFF_OPTS, base, cur).split(b"\0")
    entries = []
    for i in range(0, len(raw) - 1, 2):
        meta = raw[i].decode("ascii").lstrip(":").split()
        try:
            path = raw[i + 1].decode("utf-8")
        except UnicodeDecodeError:
            raise ReviewError(f"file name is not UTF-8: {raw[i + 1]!r}") from None
        entries.append((meta[0], meta[1], meta[2], meta[3], meta[4], path))
    return entries


def git_binary_paths(base: str, cur: str) -> set[str]:
    # numstat "-\t-" = git แสดงเป็น "Binary files differ" (รวมที่ .gitattributes ตั้ง -diff) ไม่มีเนื้อหาใน diff
    out = set()
    for rec in git_bytes("diff", "--numstat", "-z", *DIFF_OPTS, base, cur).split(b"\0"):
        if rec.startswith(b"-\t-\t"):
            out.add(rec[4:].decode("utf-8", errors="replace"))
    return out


def filtered_paths(paths: list[str]) -> set[str]:
    """path ที่มี attribute filter (clean/smudge เช่น Git LFS) -> เนื้อหาใน git ไม่ใช่ไบต์บนดิสก์"""
    if not paths:
        return set()
    out = git_bytes("check-attr", "-z", "--stdin", "filter",
                    stdin=b"".join(p.encode("utf-8") + b"\0" for p in paths)).split(b"\0")
    found = set()
    for i in range(0, len(out) - 2, 3):  # -z: path NUL attr NUL value NUL
        if out[i + 2] not in (b"unspecified", b"unset"):
            found.add(out[i].decode("utf-8", errors="replace"))
    return found


def collect_diff(base: str, cur: str, allow: dict[str, str]) -> str:
    entries = changed_entries(base, cur)
    git_binary = git_binary_paths(base, cur)
    filtered = filtered_paths([e[5] for e in entries])
    blobs = cat_blobs([oid for e in entries for mode, oid in ((e[0], e[2]), (e[1], e[3]))
                       if oid != ZERO_OID and mode in BLOB_MODES])

    excluded, notes, errors, extra = [], [], [], ""
    for old_mode, new_mode, old_oid, new_oid, status, path in entries:
        if "160000" in (old_mode, new_mode):
            # submodule / repo ซ้อนที่ถูก add: diff มีแค่ commit id ผู้ตรวจไม่เห็นโค้ด -> ไม่ผ่าน
            errors.append(f"{path}: submodule/embedded repository change cannot be reviewed "
                          "(review it in its own repository; a human may then run --rebaseline)")
            continue
        old = blobs.get(old_oid) if old_mode in BLOB_MODES else None
        new = blobs.get(new_oid) if new_mode in BLOB_MODES else None
        if path in filtered and new is not None:
            # clean filter (เช่น Git LFS) ทำให้ blob เป็น pointer ไม่ใช่เนื้อหาจริง -> ตรวจ checksum
            # ของไฟล์บนดิสก์ (ไบต์จริงก่อนผ่าน filter) กับ allowlist แทน
            excluded.append(path)
            p = ROOT / path
            digest = sha256_file(p) if p.is_file() else "(missing)"
            if allow.get(path) == digest:
                notes.append(f"  {status} {path} sha256={digest} (filtered file; matches {ALLOWLIST})")
            else:
                errors.append(f"{path}: file uses a git clean filter, content cannot be reviewed "
                              f"(worktree sha256={digest}, not matching {ALLOWLIST})")
            continue
        old_ok = old is None or is_text(old)
        new_ok = new is None or is_text(new)
        if path in git_binary:  # .gitattributes บังคับ binary -> เนื้อหาไม่ถูกแสดง ถือว่าตรวจไม่ได้
            old_ok, new_ok = old is None, new is None
        if old_ok and new_ok:
            continue
        excluded.append(path)
        if new is None:
            notes.append(f"  {status} {path} (deleted; old binary/non-UTF-8 content not shown)")
        elif new_ok and path not in git_binary:
            # เดิมอ่านไม่ได้ (เช่น TIS-620) แต่ใหม่เป็น UTF-8: แสดงเนื้อหาใหม่ทั้งไฟล์ให้ตรวจแทน
            body = "".join("+" + line + "\n" for line in new.decode("utf-8").splitlines())
            extra += (f"diff --git a/{path} b/{path}\n"
                      "# pstack: previous content was binary/non-UTF-8 (not shown); full new content follows\n"
                      f"--- a/{path}\n+++ b/{path}\n{body}")
            notes.append(f"  {status} {path} (old binary/non-UTF-8 content not shown; full new text included)")
        else:
            digest = hashlib.sha256(new).hexdigest()
            if allow.get(path) == digest:
                notes.append(f"  {status} {path} sha256={digest} (content not shown; matches {ALLOWLIST})")
            else:
                why = "not listed" if path not in allow else f"listed as {allow[path]}"
                errors.append(f"{path}: binary/non-UTF-8 content cannot be reviewed "
                              f"(sha256={digest}, {why} in {ALLOWLIST})")
    if errors:
        raise ReviewError("unreviewable changes:\n  " + "\n  ".join(errors))

    spec = ["--", ":/", *(f":(top,literal,exclude){p}" for p in excluded)]
    try:
        diff = git_bytes("diff", "-p", *DIFF_OPTS, base, cur, *spec).decode("utf-8")
    except UnicodeDecodeError:
        raise ReviewError("diff still contains non-UTF-8 bytes after exclusions") from None
    diff += extra
    if notes:
        diff += "\n# pstack: files whose old/new content is not shown to the reviewer:\n" + "\n".join(notes) + "\n"
    return diff


# ---------- codex ----------

def find_codex() -> str | None:
    if os.environ.get("CODEX_BIN"):
        return os.environ["CODEX_BIN"]
    found = shutil.which("codex")
    if found:
        return found
    # Codex desktop app (Windows) วาง CLI ไว้ที่นี่ แต่ไม่ใส่ใน PATH
    # ถ้าแอปอัปเดตแล้วย้ายไฟล์ ให้ลองอีกตำแหน่งที่แอปใช้
    for bundled in (Path.home() / ".codex" / ".sandbox-bin" / "codex.exe",
                    Path.home() / ".codex" / "plugins" / ".plugin-appserver" / "codex.exe"):
        if bundled.exists():
            return str(bundled)
    return None


PROMPT = """You are a strict senior code reviewer acting as a cross-model gate for work done by another AI (Claude).
Review the git diff provided in <stdin>. Check for:
1. Logic bugs, unhandled edge cases, security flaws.
2. Magic numbers / config values with no explanation of where they come from.
3. Claims of "done" without tests (if docs/TASK_BOARD.md is in the diff, check that test output is attached).
Do NOT modify any files. Do NOT comment on style nits.
The FIRST line of your reply must be exactly APPROVED or CHANGES_REQUESTED.
If CHANGES_REQUESTED, list each actionable issue as: - file:line - problem - suggested fix."""


def run_codex(codex: str, diff: str) -> tuple[int, str, str]:
    """(exit code, คำตอบ, stderr); prompt เป็น argument และ diff ส่งทาง stdin
    (ทดสอบแล้ว: token ที่ส่งทาง stdin ถึง Codex จริง ดู docs/TASK_BOARD.md ของ ncd-connect)"""
    with tempfile.TemporaryDirectory() as tmp:
        out_file = Path(tmp) / "review.txt"
        cmd = [codex, "exec", "-m", CODEX_MODEL, "--sandbox", "read-only", "--ephemeral",
               "--skip-git-repo-check", "-C", str(ROOT), "-o", str(out_file), PROMPT]
        r = subprocess.run(cmd, input=diff.encode("utf-8"), capture_output=True, timeout=TIMEOUT)
        out = out_file.read_text("utf-8", errors="replace").strip() if out_file.exists() else ""
        return r.returncode, out, r.stderr.decode("utf-8", errors="replace")


def review() -> int:
    ref = baseline_ref()
    old_commit, base = read_baseline(ref)
    if old_commit is None:
        print(f"note: no reviewed baseline yet ({ref}); comparing against HEAD")
    check_untracked(allowlist_from_worktree())
    cur = snapshot_tree()
    check_submodules(cur)
    if cur == base:
        if old_commit is None:
            # ครั้งแรกและไม่มีงานค้าง: ตั้ง baseline = HEAD ทันที ไม่อย่างนั้น commit ถัดไป
            # จะถูกเทียบกับ HEAD ใหม่ (ซึ่งรวม commit นั้นแล้ว) และหลบการตรวจได้
            save_baseline(ref, cur, None)
        print("APPROVED: no changes since last review")
        return 0
    # checksum ตรวจกับ allowlist ที่อยู่ใน snapshot เดียวกับที่ Codex เห็น
    diff = collect_diff(base, cur, allowlist_from_tree(cur))
    if len(diff) > MAX_DIFF:
        print(f"REVIEW_FAILED: diff since last review is {len(diff)} chars (> {MAX_DIFF}); split the work. "
              "If it comes from switching branch / pulling code already reviewed, a human can check it and "
              "run: python scripts/cross_review.py --rebaseline")
        return 1
    codex = find_codex()
    if not codex:
        print("REVIEW_FAILED: codex not found. Set CODEX_BIN or add codex to PATH.")
        return 1
    try:
        rc, out, err = run_codex(codex, diff)
    except subprocess.TimeoutExpired:
        print(f"REVIEW_FAILED: codex timed out after {TIMEOUT}s")
        return 1
    except OSError as e:
        print(f"REVIEW_FAILED: cannot start codex ({e})")
        return 1
    if rc != 0 or not out:
        print(f"REVIEW_FAILED: codex exit {rc}\n{err[-2000:]}")
        return 1
    print(out)
    # ต้องตรงตัว: กันคำตอบอย่าง APPROVED_WITH_CONCERNS หลุดผ่าน
    if out.splitlines()[0].strip() != "APPROVED":
        return 1
    # Codex ใช้เวลาหลายนาที ถ้ามีไฟล์เปลี่ยนระหว่างนั้น สิ่งที่ผ่านไม่ใช่สภาพปัจจุบัน -> ไม่ผ่าน ให้รันใหม่
    after = snapshot_tree()
    check_submodules(after)
    if after != cur:
        print("REVIEW_FAILED: files changed while Codex was reviewing; run the review again")
        return 1
    try:
        save_baseline(ref, cur, old_commit)
    except ReviewError as e:
        print(f"REVIEW_FAILED: approved but cannot record baseline: {e}")
        return 1
    return 0


def rebaseline() -> int:
    """คนยืนยันว่าตรวจโค้ดใน HEAD แล้ว (เช่นหลังสลับ branch) -> baseline = HEAD
    บังคับ terminal จริงเพื่อกันการสั่งโดยไม่ตั้งใจ ไม่ใช่กลไกความปลอดภัย: AI ที่จงใจข้ามด่านทำได้อยู่แล้ว
    (แก้สคริปต์นี้ หรือ git update-ref เอง) ด่านนี้กันการหลุดตรวจโดยไม่ตั้งใจ ส่วนการจงใจข้ามให้คนดูจาก git log/diff
    งานที่ยังไม่ commit ยังต้องผ่าน Codex เพราะ baseline = HEAD เท่านั้น"""
    if not sys.stdin.isatty():
        print("REFUSED: --rebaseline must be confirmed by a human in an interactive terminal")
        return 1
    ref = baseline_ref()
    old_commit, base = read_baseline(ref)
    target = head_tree()
    print(f"baseline {base} -> HEAD tree {target}\n" + git("diff", "--stat", *DIFF_OPTS, base, target))
    if input("Type 'yes' if a human has reviewed these changes: ").strip() != "yes":
        print("cancelled")
        return 1
    save_baseline(ref, target, old_commit)
    print("baseline updated")
    return 0


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    try:
        if argv == ["--rebaseline"]:
            return rebaseline()
        if argv:
            print("usage: cross_review.py [--rebaseline]")
            return 2
        return review()
    except (ReviewError, OSError) as e:
        print(f"REVIEW_FAILED: {e}")
        return 1


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
