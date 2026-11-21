"""Đọc tài liệu KBKTCN (FE/Test/KBKTCN_ATS_WEB_v1.0.xlsx) và phân loại kịch bản theo mẫu chung.

Các nhóm kiểm thử lặp lại trên nhiều màn hình (Textbox, Textarea, Combobox, ô số, ô tìm kiếm, Phân trang,
Popup xác nhận, Giao diện chung, Phân quyền, Trạng thái tải dữ liệu) có cùng câu chữ trong tài liệu.
Engine test chung (tests/generic) lấy mã TC trực tiếp từ tài liệu theo (chức năng, nhóm) rồi dùng
`classify()` để biết TC đó kiểm tra gì -> thêm/sửa TC trong tài liệu không phải sửa code.

Giá trị mong đợi (placeholder, câu thông báo, maxlength, min/max) cũng đọc từ cột "Kết quả mong muốn" /
"Mục đích kiểm thử" của chính TC đó.
"""
from __future__ import annotations

import re
from collections import OrderedDict
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from openpyxl import load_workbook

ROOT_DIR = Path(__file__).resolve().parent.parent
KBKTCN_PATH = ROOT_DIR.parent / "KBKTCN_ATS_WEB_v1.0.xlsx"
SHEETS = ["Đăng nhập, Đăng ký", "Trang chủ", "Hồ sơ cá nhân", "Ứng viên", "Nhà tuyển dụng", "Admin"]
TC_ID_RE = re.compile(r"(?:Login|Home|Profile|Candidate|Recruiter|Admin)_\d+")

# Dòng tiêu đề chức năng (màn hình) trong các sheet
FUNCTIONS = [
    "Đăng nhập", "Đăng ký",
    "Trang chủ", "Tìm kiếm và lọc việc làm", "Chi tiết tin tuyển dụng", "Công ty",
    "Hồ sơ cá nhân",
    "CV của tôi", "Tải lên CV", "Tạo CV", "Chấm điểm & gợi ý sửa CV", "Việc làm phù hợp", "Ứng tuyển việc làm",
    "Đơn ứng tuyển của tôi", "Thư mời ứng tuyển", "Yêu thích",
    "Dashboard nhà tuyển dụng", "Hồ sơ công ty", "Tin tuyển dụng", "Đăng tin tuyển dụng", "Ứng viên & AI sàng lọc",
    "Chi tiết hồ sơ ứng viên", "Tìm ứng viên & Thư mời", "Tài khoản nhà tuyển dụng",
    "Tổng quan hệ thống", "Quản lý người dùng", "Quản lý doanh nghiệp", "Quản lý tin tuyển dụng",
]


@dataclass(frozen=True)
class Tc:
    id: str
    sheet: str
    function: str
    group: str
    purpose: str
    steps: str
    expected: str

    @property
    def text(self) -> str:
        return f"{self.purpose}\n{self.steps}\n{self.expected}"

    @property
    def number(self) -> int:
        return int(self.id.rsplit("_", 1)[1])


def _clean(v) -> str:
    return "" if v is None else str(v).strip()


@lru_cache(maxsize=1)
def load(path: Path = KBKTCN_PATH) -> "OrderedDict[str, Tc]":
    """Toàn bộ TC của tài liệu (giữ thứ tự), kèm chức năng + nhóm theo các dòng tiêu đề."""
    result: OrderedDict[str, Tc] = OrderedDict()
    wb = load_workbook(path, read_only=True, data_only=True)
    try:
        for sheet in SHEETS:
            if sheet not in wb.sheetnames:
                continue
            function = group = purpose = ""
            for row in wb[sheet].iter_rows(min_row=12, values_only=True):
                c = [_clean(v) for v in row[:4]]
                if TC_ID_RE.fullmatch(c[0]) and (c[2] or c[3]):
                    purpose = c[1] or purpose  # ô Mục đích gộp (merge) cho nhiều TC liên tiếp
                    result[c[0]] = Tc(c[0], sheet, function, group, purpose, c[2], c[3])
                elif c[1] and not c[2] and not c[3]:
                    heading = c[1]
                    if heading.startswith(("Giao diện (", "Chức năng (")):
                        continue
                    if heading in FUNCTIONS:
                        function, group = heading, ""
                    else:
                        group = heading
                    purpose = ""
    finally:
        wb.close()
    return result


def get(tc_id: str) -> Tc:
    return load()[tc_id]


def cases(function: str, group: str | None = None) -> list[Tc]:
    """Các TC của 1 chức năng (và 1 nhóm nếu có). Báo lỗi rõ ràng nếu tên trong tài liệu bị đổi."""
    found = [t for t in load().values() if t.function == function and (group is None or t.group == group)]
    if not found:
        raise LookupError(f"KBKTCN không có nhóm '{group}' trong chức năng '{function}'")
    return found


def quoted(text: str) -> list[str]:
    """Các chuỗi trong ngoặc kép "..." / “...” của một câu (vd. câu thông báo, placeholder)."""
    return [m.strip() for m in re.findall(r'["“]([^"”]+)["”]', text)]


def number_in(text: str, pattern: str) -> int | None:
    m = re.search(pattern, text)
    return int(m.group(1)) if m else None


# ---------------------------------------------------------------- phân loại
_FORMAT_STEPS = [
    ("lower", "chữ cái thường"), ("upper", "chữ in hoa"), ("no_accent", "chữ không dấu"),
    ("vietnamese", "Tiếng Việt có dấu"), ("digits", "là chữ số"), ("special", "ký tự đặc biệt"),
    ("html", "html"), ("emoji", "emoji"),
]


def classify(tc: Tc) -> str | None:
    """Loại kiểm tra của 1 TC theo câu chữ mẫu trong tài liệu; None = TC nghiệp vụ riêng (viết test tay)."""
    p, s, e = tc.purpose.lower(), tc.steps.lower(), tc.expected.lower()
    step1 = s.split("\n")[0]

    # ---------- giao diện chung / phân quyền / tải dữ liệu
    if p.startswith("kiểm tra giao diện mặc định"):
        return "layout_default"
    if p.startswith("kiểm tra tổng thể giao diện"):
        return "layout_look"
    if "thu nhỏ, phóng to" in p:
        return "layout_zoom"
    if "thiết bị di động" in p and "375px" in s:
        return "layout_mobile"
    if "phím shift tab" in p or "shift-tab liên tục" in s:
        return "layout_shift_tab"
    if "phím tab" in p:
        return "layout_tab"
    if p.startswith("kiểm tra truy cập khi chưa đăng nhập"):
        return "access_no_login"
    if p.startswith("kiểm tra truy cập sai vai trò"):
        return "access_wrong_role"
    if p.startswith("kiểm tra khi phiên đăng nhập hết hạn"):
        return "access_expired"
    if p.startswith("kiểm tra trạng thái đang tải"):
        return "load_slow"
    if p.startswith("kiểm tra khi lỗi tải dữ liệu"):
        return "load_error"
    if p.startswith("kiểm tra nút thử lại"):
        return "load_retry"

    # ---------- popup xác nhận
    if p.startswith("kiểm tra hiển thị popup"):
        return "popup_display"
    if p.startswith("kiểm tra khi nhấn hủy"):
        return "popup_cancel"
    if p.startswith("kiểm tra khi nhấn icon x"):
        return "popup_close"

    # ---------- phân trang
    if p.startswith("kiểm tra hiển thị phân trang"):
        return "page_display"
    if p.startswith("kiểm tra ẩn phân trang"):
        return "page_hidden"
    if p.startswith("kiểm tra chuyển trang") and "số trang" in s:
        return "page_number"
    if p.startswith("kiểm tra chuyển trang"):
        return "page_next_prev"
    if p.startswith("kiểm tra trạng thái nút ở trang đầu/cuối"):
        return "page_bounds"
    if p.startswith("kiểm tra giữ bộ lọc khi chuyển trang"):
        return "page_keep_filter"

    # ---------- combobox
    if p.startswith("kiểm tra hiển thị combobox"):
        return "cb_display"
    if p.startswith("kiểm tra danh sách giá trị"):
        return "cb_options"
    if p.startswith("kiểm tra chọn giá trị"):
        return "cb_select"
    if p.startswith("kiểm tra thao tác bằng bàn phím"):
        return "cb_keyboard"
    if p.startswith("kiểm tra tìm kiếm trong combobox"):
        return "cb_search_miss" if "không có" in step1 else "cb_search_hit"
    if p.startswith("kiểm tra tính bắt buộc") and "không chọn" in s:
        return "cb_required"

    # ---------- ô tìm kiếm
    if p.startswith("kiểm tra tìm kiếm chính xác"):
        return "search_exact"
    if p.startswith("kiểm tra tìm kiếm gần đúng"):
        return "search_partial"
    if p.startswith("kiểm tra tìm kiếm không phân biệt hoa thường"):
        return "search_case"
    if p.startswith("kiểm tra tìm kiếm có khoảng trắng"):
        return "search_trim"
    if p.startswith("kiểm tra tìm kiếm với toàn ký tự space"):
        return "search_spaces"
    if p.startswith("kiểm tra tìm kiếm với ký tự đặc biệt"):
        return "search_special"
    if p.startswith("kiểm tra tìm kiếm không có kết quả"):
        return "search_empty"
    if p.startswith("kiểm tra xóa từ khóa"):
        return "search_clear"

    # ---------- ô số
    if p.startswith("kiểm tra nút tăng/giảm"):
        return "num_spin"
    if p.startswith("kiểm tra giá trị nhỏ nhất") or p.startswith("kiểm tra giá trị lớn nhất"):
        return "num_bound"
    if p.startswith("kiểm tra copy/paste") and "chuỗi số hợp lệ" in s:
        return "num_paste_ok"
    if p.startswith("kiểm tra copy/paste") and "chuỗi chứa chữ cái" in s:
        return "num_paste_letters"
    if p.startswith("kiểm tra định dạng dữ liệu nhập vào"):
        if "số nguyên dương" in step1:
            return "num_positive"
        if "số âm" in step1:
            return "num_negative"
        if "số thập phân" in step1:
            return "num_decimal"
        if ("chữ cái" in step1 and "thường" not in step1) or ("ký tự đặc biệt" in step1 and "không cho phép" in e):
            return "num_reject"

    # ---------- số điện thoại
    if p.startswith("kiểm tra định dạng số điện thoại"):
        return "phone_valid" if "hợp lệ" in step1 and "không" not in step1 else "phone_invalid"

    # ---------- textbox / textarea
    if p.startswith("kiểm tra hiển thị textbox"):
        return "txt_display"
    if p.startswith("kiểm tra giá trị mặc định"):
        return "default"
    if p.startswith("kiểm tra placeholder"):
        return "txt_placeholder"
    if p.startswith("kiểm tra tính không bắt buộc"):
        return "txt_optional"
    if p.startswith("kiểm tra tính bắt buộc"):
        return "txt_required"
    if p.startswith("kiểm tra khi nhập toàn ký tự space"):
        return "txt_spaces"
    if p.startswith("kiểm tra trim khoảng trắng"):
        return "txt_trim"
    if p.startswith("kiểm tra định dạng dữ liệu nhập vào"):
        for kind, needle in _FORMAT_STEPS:
            if needle.lower() in step1:
                return f"fmt_{kind}"
    if p.startswith("kiểm tra copy/paste"):
        return "txt_paste"
    if p.startswith("kiểm tra maxlength"):
        if ">" in step1:
            return "max_over"
        if "=" in step1:
            return "max_eq"
        if "<" in step1:
            return "max_under"
    if p.startswith("kiểm tra xuống dòng"):
        return "txt_multiline"
    if p.startswith("kiểm tra resize/thanh cuộn"):
        return "txt_scroll"
    if p.startswith("kiểm tra không cho phép sửa"):
        return "txt_readonly"
    if p.startswith("kiểm tra thông tin label"):
        return "label"
    return None


def maxlength_of(tc: Tc) -> int | None:
    return number_in(tc.purpose, r"maxlength\s*\((\d+)")


def bound_of(tc: Tc) -> tuple[str, int, int] | None:
    """('min'|'max', giới hạn, giá trị nhập) cho TC 'Kiểm tra giá trị nhỏ/lớn nhất (min = 0)' + 'Nhập -1'."""
    m = re.search(r"\((min|max)\s*=\s*(-?\d+)", tc.purpose)
    v = re.search(r"Nhập\s+(-?\d+)", tc.steps)
    if not m or not v:
        return None
    return m.group(1), int(m.group(2)), int(v.group(1))
