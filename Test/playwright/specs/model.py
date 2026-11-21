"""Mô hình đặc tả màn hình / thành phần cho engine test chung (tests/generic).

Screen: 1 chức năng trong KBKTCN (vd. "Hồ sơ cá nhân") + cách mở màn hình bằng Page Object.
Widget: 1 nhóm kiểm thử trong KBKTCN (vd. "Textbox Họ và tên") + cách tìm phần tử và đọc giá trị đã lưu.
Mã TC lấy từ tài liệu theo (Screen.function, Widget.group), loại kiểm tra theo utils.kbktcn.classify().
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

# Vai trò tài khoản đăng nhập khi mở màn hình
CANDIDATE, EMPLOYER, ADMIN, GUEST = "candidate", "employer", "admin", None


@dataclass(frozen=True)
class Screen:
    key: str
    function: str                        # tên chức năng trong KBKTCN
    mark: str                            # marker pytest (pytest.ini)
    page: Callable                       # (page, settings, env) -> Page Object có .open() / .expect_loaded()
    role: str | None = CANDIDATE         # vai trò mở màn hình (None = khách)
    path: str = ""                       # URL (tĩnh) – dùng cho kiểm tra phân quyền
    heading: str = ""                    # tiêu đề h1 (khi đã tải xong)
    # Vai trò sai để kiểm tra phân quyền và URL mong đợi khi bị từ chối (regex, sau base_url)
    wrong_role: tuple[str, str] | None = None
    # API chính khi tải màn hình (glob cho page.route) – kiểm tra trạng thái đang tải / lỗi / Thử lại
    load_api: str = ""
    load_label: str = ""                 # aria-label skeleton khi đang tải (vd. "Đang tải hồ sơ")
    # Kiểm tra "giao diện mặc định": (loại, giá trị) – loại: heading | label | button | link | text | placeholder
    layout_items: tuple[tuple[str, str], ...] = ()
    groups_layout: tuple[str, ...] = ("Giao diện chung",)
    groups_access: tuple[str, ...] = ("Phân quyền truy cập",)
    groups_loading: tuple[str, ...] = ("Trạng thái tải dữ liệu",)
    prepare: Callable | None = None      # (env) -> None: tạo dữ liệu tiền điều kiện, ghi vào env.data
    cvs: tuple[str, ...] = ()            # CV tải sẵn cho tài khoản ứng viên ("pdf" | "docx")
    fresh: bool = False                  # mỗi test 1 tài khoản mới (thao tác làm hỏng tài khoản, vd. đổi mật khẩu)
    # Ghi chú lỗi môi trường đã biết: khi có, test của màn hình bị skip với lý do này (vd. backend chưa có API)
    env_missing: str = ""


@dataclass(frozen=True)
class Widget:
    screen: str                          # Screen.key
    group: str                           # tên nhóm kiểm thử trong KBKTCN
    kind: str                            # text | textarea | number | phone | select | hover | search | password
    label: str = ""                      # nhãn truy cập (get_by_label) – mặc định tìm theo nhãn
    locate: Callable | None = None       # (page_object) -> Locator, dùng khi không tìm theo nhãn được
    key: str = ""                        # khóa trong page_object.saved() – đọc giá trị đã lưu qua API
    required: bool = False
    valid: Any = "Giá trị hợp lệ"        # giá trị hợp lệ mẫu (chuỗi hoặc (env) -> chuỗi)
    default: Callable | None = None      # (env) -> giá trị mặc định mong đợi khi tài liệu không ghi "rỗng"
    sample: Callable | None = None       # ô tìm kiếm: (env) -> từ khóa khớp 1 bản ghi có thật
    to_saved: Callable | None = None     # chuyển giá trị nhập -> giá trị lưu (vd. số -> float)
    manual: dict[str, str] = field(default_factory=dict)  # loại kiểm tra -> lý do kiểm thử thủ công
    extra: dict[str, Any] = field(default_factory=dict)
