"""Đối chiếu độ phủ: TC trong KBKTCN chưa có test tự động nào tham chiếu.

Nguồn mã TC đã tự động hóa:
  - id của case con khi collect (parametrize theo mã TC, vd. test_widget[chromium-Profile_41])
  - mã TC viết trong source test (@pytest.mark.testcase("..."), record_testcase("..."), tham số "...")

Chạy: python -m utils.coverage [--sheet "Nhà tuyển dụng"]
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from collections import OrderedDict
from pathlib import Path

from utils import kbktcn

ROOT = Path(__file__).resolve().parent.parent


def referenced_ids() -> set[str]:
    ids: set[str] = set()
    out = subprocess.run([sys.executable, "-m", "pytest", "--collect-only", "-q", "-p", "no:cacheprovider",
                          "--junitxml=", "--html=", "-o", "addopts="],
                         cwd=ROOT, capture_output=True, text=True, encoding="utf-8").stdout
    ids |= set(kbktcn.TC_ID_RE.findall(out))
    for path in (ROOT / "tests").rglob("test_*.py"):
        ids |= set(kbktcn.TC_ID_RE.findall(path.read_text(encoding="utf-8")))
    return ids


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sheet", action="append", help="Chỉ xét sheet này (lặp lại được)")
    args = parser.parse_args()
    done = referenced_ids()
    missing: OrderedDict[str, list[str]] = OrderedDict()
    total = 0
    for tc in kbktcn.load().values():
        if args.sheet and tc.sheet not in args.sheet:
            continue
        total += 1
        if tc.id not in done:
            missing.setdefault(f"{tc.sheet} / {tc.function}", []).append(tc.id)
    covered = total - sum(len(v) for v in missing.values())
    print(f"Đã có test: {covered}/{total} TC")
    for key, items in missing.items():
        print(f"- {key}: {', '.join(items)}")


if __name__ == "__main__":
    main()
