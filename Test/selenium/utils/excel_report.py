"""Sinh báo cáo Excel từ junit.xml: 1 sheet "Tổng hợp" + 1 sheet cho mỗi chức năng.

Mỗi dòng của sheet chức năng là 1 Test Case trong tài liệu KBKTCN (Mục đích / Các bước / Kết quả mong
muốn lấy từ file KBKTCN). Một TC có nhiều case con (parametrize) -> gộp lại: chỉ cần 1 case con fail là F.
TC có trong tài liệu nhưng chưa có test tự động -> "Chưa tự động".

Tự chạy cuối mỗi lần pytest (conftest.py). Chạy tay:
    python -m utils.excel_report [reports/junit.xml] [-o reports/report.xlsx]
"""
from __future__ import annotations

import argparse
import os
import re
import xml.etree.ElementTree as ET
from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_KBKTCN = ROOT_DIR.parent / "KBKTCN_ATS_WEB_v1.0.xlsx"
KBKTCN_SHEETS = ["Đăng nhập, Đăng ký"]
# Dòng tiêu đề trong sheet KBKTCN đánh dấu bắt đầu 1 chức năng -> tên sheet báo cáo
FUNCTION_HEADINGS = {"Đăng nhập": "Đăng nhập", "Đăng ký": "Đăng ký"}
# Chức năng theo file test (dùng khi mã TC không có trong KBKTCN)
FUNCTION_BY_MODULE = {"login": "Đăng nhập", "register": "Đăng ký"}

STATUS_P, STATUS_F, STATUS_MANUAL, STATUS_SKIP, STATUS_NONE = "P", "F", "Manual", "Skip", "Chưa tự động"

TC_ID_RE = re.compile(r"Login_\d+")


# ---------------------------------------------------------------- đọc tài liệu KBKTCN
@dataclass
class TcInfo:
    tc_id: str
    function: str
    role: str = ""
    category: str = ""
    group: str = ""
    purpose: str = ""
    steps: str = ""
    expected: str = ""


def _clean(v) -> str:
    return "" if v is None else str(v).strip()


def load_kbktcn(path: Path, sheets=KBKTCN_SHEETS) -> "OrderedDict[str, TcInfo]":
    """Đọc mã TC + mục đích/bước/kết quả mong muốn, kèm chức năng/vai trò/nhóm theo các dòng tiêu đề."""
    result: OrderedDict[str, TcInfo] = OrderedDict()
    if not path.exists():
        return result
    wb = load_workbook(path, read_only=True, data_only=True)
    for sheet in sheets:
        if sheet not in wb.sheetnames:
            continue
        function = role = category = group = purpose = ""
        for row in wb[sheet].iter_rows(values_only=True):
            cells = [_clean(c) for c in row[:4]]
            if TC_ID_RE.fullmatch(cells[0]):
                purpose = cells[1] or purpose  # ô Mục đích gộp (merge) cho nhiều TC liên tiếp
                result[cells[0]] = TcInfo(cells[0], function or sheet, role, category, group,
                                          purpose, cells[2], cells[3])
                continue
            heading = next((c for c in row if _clean(c)), None)
            heading = _clean(heading)
            if not heading or any(_clean(c) for c in row if _clean(c) != heading):
                continue  # không phải dòng tiêu đề (có nhiều ô dữ liệu)
            if heading in FUNCTION_HEADINGS:
                function, role, category, group, purpose = FUNCTION_HEADINGS[heading], "", "", "", ""
            elif heading.startswith("Đăng ký tài khoản"):
                role, category, group = heading.replace("Đăng ký tài khoản", "").strip(), "", ""
            elif heading.startswith("Giao diện (") or heading.startswith("Chức năng ("):
                category, group = heading.split(" (")[0], ""
            elif function:
                group, purpose = heading, ""
    wb.close()
    return result


# ---------------------------------------------------------------- đọc kết quả junit
@dataclass
class CaseResult:
    nodeid: str
    module: str
    outcome: str  # passed | failed | error | skipped
    duration: float
    message: str = ""
    tc_ids: list[str] = field(default_factory=list)
    screenshots: list[str] = field(default_factory=list)


def load_junit(path: Path) -> tuple[list[CaseResult], dict]:
    root = ET.parse(path).getroot()
    suite = root.find("testsuite") if root.tag == "testsuites" else root
    meta = dict(suite.attrib) if suite is not None else {}
    cases: list[CaseResult] = []
    for tc in root.iter("testcase"):
        props = [(p.get("name"), p.get("value")) for p in tc.iter("property")]
        name, classname = tc.get("name", ""), tc.get("classname", "")
        outcome, message = "passed", ""
        for tag in ("failure", "error", "skipped"):
            el = tc.find(tag)
            if el is not None:
                outcome = {"failure": "failed", "error": "error", "skipped": "skipped"}[tag]
                message = el.get("message") or (el.text or "")
                break
        ids = [v for k, v in props if k == "testcase_id"]
        if not ids:  # test không parametrize: mã TC nằm trong tên hàm (test_login_9_...) hoặc tham số
            ids = TC_ID_RE.findall(name) or [f"Login_{m}" for m in re.findall(r"^test_login_(\d+)_", name)]
        cases.append(CaseResult(
            nodeid=f"{classname}::{name}",
            module=classname.rsplit(".", 1)[-1],
            outcome=outcome,
            duration=float(tc.get("time") or 0),
            message=_short_message(message),
            tc_ids=list(dict.fromkeys(ids)),
            screenshots=[v for k, v in props if k == "screenshot"],
        ))
    return cases, meta


def _short_message(msg: str, limit: int = 600) -> str:
    msg = (msg or "").strip()
    msg = re.sub(r"^Skipped:\s*", "", msg)
    msg = re.split(r"\n(?:Stacktrace:|Backtrace:)", msg)[0]  # bỏ stacktrace dài của WebDriver, giữ ý chính
    return msg if len(msg) <= limit else msg[:limit] + "…"


def _function_of_module(module: str) -> str:
    for key, fn in FUNCTION_BY_MODULE.items():
        if key in module:
            return fn
    return module


# ---------------------------------------------------------------- gộp theo TC
@dataclass
class TcRow:
    info: TcInfo
    cases: list[CaseResult] = field(default_factory=list)

    @property
    def status(self) -> str:
        if not self.cases:
            return STATUS_NONE
        outcomes = {c.outcome for c in self.cases}
        if outcomes & {"failed", "error"}:
            return STATUS_F
        if outcomes == {"skipped"}:
            return STATUS_MANUAL if all(c.message.startswith("MANUAL") for c in self.cases) else STATUS_SKIP
        return STATUS_P

    def detail(self) -> str:
        bad = [c for c in self.cases if c.outcome in ("failed", "error")]
        if bad:
            lines = []
            for c in bad:
                sub = re.search(r"\[(.*)\]$", c.nodeid)
                prefix = f"[{sub.group(1)}] " if sub and len(bad) > 1 else ""
                lines.append(prefix + c.message)
            return "\n".join(lines)
        if self.status in (STATUS_MANUAL, STATUS_SKIP):
            return self.cases[0].message
        return ""


def group_results(kbktcn: "OrderedDict[str, TcInfo]", cases: list[CaseResult]) -> "OrderedDict[str, list[TcRow]]":
    rows: OrderedDict[str, TcRow] = OrderedDict()
    for case in cases:
        for tc_id in case.tc_ids:
            if tc_id not in rows:
                info = kbktcn.get(tc_id) or TcInfo(tc_id, _function_of_module(case.module))
                rows[tc_id] = TcRow(info)
            rows[tc_id].cases.append(case)

    tested_functions = {r.info.function for r in rows.values()}
    # Giữ thứ tự theo tài liệu; thêm TC chưa tự động thuộc các chức năng đã chạy
    ordered: OrderedDict[str, list[TcRow]] = OrderedDict()
    for tc_id, info in kbktcn.items():
        if info.function in tested_functions:
            ordered.setdefault(info.function, []).append(rows.pop(tc_id, None) or TcRow(info))
    for row in rows.values():  # TC không có trong tài liệu
        ordered.setdefault(row.info.function, []).append(row)
    return ordered


# ---------------------------------------------------------------- ghi Excel
HEADER_FILL = PatternFill("solid", fgColor="1F4E78")
HEADER_FONT = Font(bold=True, color="FFFFFF")
STATUS_FILL = {
    STATUS_P: PatternFill("solid", fgColor="C6EFCE"),
    STATUS_F: PatternFill("solid", fgColor="FFC7CE"),
    STATUS_MANUAL: PatternFill("solid", fgColor="FFEB9C"),
    STATUS_SKIP: PatternFill("solid", fgColor="FFEB9C"),
    STATUS_NONE: PatternFill("solid", fgColor="D9D9D9"),
}
THIN = Side(style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical="top")
CENTER = Alignment(horizontal="center", vertical="top", wrap_text=True)

DETAIL_COLUMNS = [
    ("STT", 6), ("Mã TC", 11), ("Vai trò", 14), ("Loại", 11), ("Nhóm kiểm thử", 20), ("Mục đích", 30),
    ("Các bước thực hiện", 40), ("Kết quả mong muốn", 45), ("Kết quả", 11), ("Số case con", 9),
    ("Thời gian (s)", 10), ("Chi tiết lỗi / Ghi chú", 60), ("Screenshot", 30), ("Test function", 55),
]


def _header(ws, columns, row=1):
    for i, (title, width) in enumerate(columns, start=1):
        cell = ws.cell(row=row, column=i, value=title)
        cell.fill, cell.font, cell.border, cell.alignment = HEADER_FILL, HEADER_FONT, BORDER, CENTER
        ws.column_dimensions[get_column_letter(i)].width = width


def _count(rows: list[TcRow]) -> dict:
    stats = {s: 0 for s in (STATUS_P, STATUS_F, STATUS_MANUAL, STATUS_SKIP, STATUS_NONE)}
    for r in rows:
        stats[r.status] += 1
    return stats


def _sheet_title(name: str) -> str:
    return re.sub(r"[\[\]\*\?/\\:]", "-", name)[:31]


SCREENSHOT_COL = 13
THUMB_W, THUMB_MAX_H = 330, 250  # px; ảnh chụp full page rất dài -> lấy phần đầu trang (form + thông báo)
LINK_H = 20  # px chừa cho dòng link "Mở ảnh gốc" phía trên ảnh


def _thumbnail(path: Path):
    """Ảnh thu nhỏ (openpyxl Image) của screenshot; None nếu thiếu Pillow hoặc không đọc được file."""
    try:
        from io import BytesIO

        from openpyxl.drawing.image import Image as XLImage
        from PIL import Image as PILImage
    except ImportError:
        return None
    try:
        with PILImage.open(path) as im:
            ratio = THUMB_W / im.width
            im = im.resize((THUMB_W, max(1, int(im.height * ratio))))
            im = im.crop((0, 0, THUMB_W, min(im.height, THUMB_MAX_H)))
            buf = BytesIO()
            im.convert("RGB").save(buf, format="PNG")
    except OSError:
        return None
    buf.seek(0)
    img = XLImage(buf)
    img.width, img.height = im.width, im.height
    return img


def _embed_screenshot(ws, row: int, rel_paths: list[str], out_dir: Path) -> None:
    """Chèn ảnh thu nhỏ của screenshot đầu tiên vào ô + hyperlink mở ảnh gốc."""
    from openpyxl.drawing.spreadsheet_drawing import AnchorMarker, OneCellAnchor
    from openpyxl.drawing.xdr import XDRPositiveSize2D
    from openpyxl.utils.units import pixels_to_EMU

    first = ROOT_DIR / rel_paths[0]
    cell = ws.cell(row=row, column=SCREENSHOT_COL)
    extra = f" (+{len(rel_paths) - 1} ảnh, xem thư mục screenshots)" if len(rel_paths) > 1 else ""
    cell.value = ("Mở ảnh gốc" if first.exists() else f"Không tìm thấy {rel_paths[0]}") + extra
    if not first.exists():
        return
    cell.hyperlink = Path(os.path.relpath(first, out_dir)).as_posix()
    cell.font = Font(color="0563C1", underline="single")

    img = _thumbnail(first)
    if img is None:
        return
    marker = AnchorMarker(col=SCREENSHOT_COL - 1, colOff=pixels_to_EMU(4), row=row - 1, rowOff=pixels_to_EMU(LINK_H))
    img.anchor = OneCellAnchor(_from=marker, ext=XDRPositiveSize2D(pixels_to_EMU(img.width), pixels_to_EMU(img.height)))
    ws.add_image(img)
    # chiều cao dòng tính bằng point (1px = 0.75pt)
    ws.row_dimensions[row].height = max(ws.row_dimensions[row].height or 0, (img.height + LINK_H + 8) * 0.75)


def write_function_sheet(wb: Workbook, function: str, rows: list[TcRow], out_dir: Path) -> None:
    ws = wb.create_sheet(_sheet_title(function))
    _header(ws, DETAIL_COLUMNS)
    ws.column_dimensions[get_column_letter(SCREENSHOT_COL)].width = THUMB_W / 7 + 2  # ~7px / đơn vị độ rộng
    for idx, r in enumerate(rows, start=1):
        status = r.status
        shots = list(dict.fromkeys(s for c in r.cases for s in c.screenshots))
        values = [
            idx, r.info.tc_id, r.info.role, r.info.category, r.info.group, r.info.purpose, r.info.steps,
            r.info.expected, status, len(r.cases) or "", round(sum(c.duration for c in r.cases), 2) or "",
            r.detail(), "",
            "\n".join(dict.fromkeys(c.nodeid.split("::", 1)[-1] for c in r.cases)),
        ]
        for col, value in enumerate(values, start=1):
            cell = ws.cell(row=idx + 1, column=col, value=value)
            cell.border = BORDER
            cell.alignment = CENTER if col in (1, 2, 9, 10, 11) else WRAP
        ws.cell(row=idx + 1, column=9).fill = STATUS_FILL[status]
        ws.cell(row=idx + 1, column=9).font = Font(bold=True)
        if shots:
            _embed_screenshot(ws, idx + 1, shots, out_dir)
    ws.freeze_panes = "C2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(DETAIL_COLUMNS))}{len(rows) + 1}"


def write_summary_sheet(ws, grouped: "OrderedDict[str, list[TcRow]]", meta: dict, env: dict) -> None:
    ws.title = "Tổng hợp"
    ws["A1"] = "BÁO CÁO KẾT QUẢ KIỂM THỬ TỰ ĐỘNG"
    ws["A1"].font = Font(bold=True, size=14, color="1F4E78")
    info = [
        ("Thời điểm chạy", meta.get("timestamp", "")[:19].replace("T", " ")),
        ("Tổng thời gian (s)", meta.get("time", "")),
        *env.items(),
        ("Ghi chú", "P = Đạt, F = Không đạt, Manual = cần kiểm thử tay, "
                    "Chưa tự động = có trong tài liệu nhưng chưa có script"),
    ]
    for i, (k, v) in enumerate(info, start=3):
        ws.cell(row=i, column=1, value=k).font = Font(bold=True)
        ws.cell(row=i, column=2, value=v)

    start = len(info) + 5
    columns = [("Chức năng", 22), ("Tổng TC", 14), ("P", 10), ("F", 10), ("Manual", 10), ("Skip", 10),
               ("Chưa tự động", 14), ("Tỷ lệ đạt (P/(P+F))", 20)]
    _header(ws, columns, row=start)
    totals = {s: 0 for s in (STATUS_P, STATUS_F, STATUS_MANUAL, STATUS_SKIP, STATUS_NONE)}
    r = start
    for r, (function, rows) in enumerate(grouped.items(), start=start + 1):
        stats = _count(rows)
        for k in totals:
            totals[k] += stats[k]
        _summary_row(ws, r, function, len(rows), stats)
        ws.cell(row=r, column=1).hyperlink = f"#'{_sheet_title(function)}'!A1"
        ws.cell(row=r, column=1).font = Font(color="0563C1", underline="single")
    _summary_row(ws, r + 1, "Tổng cộng", sum(len(v) for v in grouped.values()), totals, bold=True)
    ws.column_dimensions["A"].width = 22
    ws.column_dimensions["B"].width = 60 if ws.column_dimensions["B"].width < 60 else ws.column_dimensions["B"].width


def _summary_row(ws, row, name, total, stats, bold=False):
    executed = stats[STATUS_P] + stats[STATUS_F]
    rate = f"{stats[STATUS_P] / executed:.1%}" if executed else "-"
    values = [name, total, stats[STATUS_P], stats[STATUS_F], stats[STATUS_MANUAL], stats[STATUS_SKIP],
              stats[STATUS_NONE], rate]
    for col, v in enumerate(values, start=1):
        cell = ws.cell(row=row, column=col, value=v)
        cell.border = BORDER
        cell.alignment = CENTER if col > 1 else WRAP
        if bold:
            cell.font = Font(bold=True)
    ws.cell(row=row, column=3).fill = STATUS_FILL[STATUS_P]
    ws.cell(row=row, column=4).fill = STATUS_FILL[STATUS_F]


def build_report(junit: Path, out: Path, kbktcn: Path = DEFAULT_KBKTCN, env: dict | None = None) -> Path:
    cases, meta = load_junit(junit)
    grouped = group_results(load_kbktcn(kbktcn), cases)
    wb = Workbook()
    write_summary_sheet(wb.active, grouped, meta, env or {})
    for function, rows in grouped.items():
        write_function_sheet(wb, function, rows, out.parent.resolve())
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        wb.save(out)
    except PermissionError:  # file đang mở trong Excel -> ghi sang file mới, không làm mất kết quả
        out = out.with_name(f"{out.stem}_{datetime.now():%Y%m%d_%H%M%S}{out.suffix}")
        wb.save(out)
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("junit", nargs="?", default=str(ROOT_DIR / "reports" / "junit.xml"))
    ap.add_argument("-o", "--output", default=str(ROOT_DIR / "reports" / "report.xlsx"))
    ap.add_argument("--kbktcn", default=str(DEFAULT_KBKTCN))
    args = ap.parse_args()
    path = build_report(Path(args.junit), Path(args.output), Path(args.kbktcn),
                        {"Nguồn kết quả": args.junit, "Tạo lúc": f"{datetime.now():%Y-%m-%d %H:%M:%S}"})
    print(f"Đã tạo báo cáo Excel: {path}")


if __name__ == "__main__":
    main()
