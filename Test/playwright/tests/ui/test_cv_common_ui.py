"""Kiểm tra giao diện chung + phân quyền cho 4 màn hình CV (cùng kịch bản, khác URL / mã TC).

Nguồn: KBKTCN_ATS_WEB_v1.0.xlsx, sheet "Ứng viên":
  CV của tôi Candidate_2..9 · Tải lên CV Candidate_43..47 · Tạo CV Candidate_98..102 · Chấm điểm CV Candidate_212..219
"""
import re

import pytest
from playwright.sync_api import Page, expect

from pages.login_page import LoginPage
from utils.layout import ZOOM_LEVELS, focus_sequence, horizontal_overflow, overlapping_text_blocks, reading_order_violations, set_zoom

pytestmark = [pytest.mark.ui, pytest.mark.cv]

SCREENS = {
    "cv_list": {"path": "/cv", "heading": "CV của tôi", "mark": "cv_list",
                "tc": {"look": "Candidate_2", "zoom": "Candidate_3", "mobile": "Candidate_4", "tab": "Candidate_5",
                       "shift_tab": "Candidate_6", "no_login": "Candidate_7", "role": "Candidate_8", "expired": "Candidate_9"}},
    "cv_upload": {"path": "/cv/new", "heading": "Tải CV mới", "mark": "cv_upload",
                  "tc": {"look": "Candidate_43", "zoom": "Candidate_44", "mobile": "Candidate_45", "tab": "Candidate_46",
                         "shift_tab": "Candidate_47"}},
    "cv_builder": {"path": "/create-cv", "heading": "Tạo CV của bạn", "mark": "cv_builder",
                   "tc": {"look": "Candidate_98", "zoom": "Candidate_99", "mobile": "Candidate_100", "tab": "Candidate_101",
                          "shift_tab": "Candidate_102"}},
    "cv_analysis": {"path": "/cv-analysis", "heading": "AI chấm điểm & gợi ý sửa CV", "mark": "cv_analysis",
                    "tc": {"look": "Candidate_212", "zoom": "Candidate_213", "mobile": "Candidate_214", "tab": "Candidate_215",
                           "shift_tab": "Candidate_216", "no_login": "Candidate_217", "role": "Candidate_218",
                           "expired": "Candidate_219"}},
}


def _params(check: str):
    """Các bộ (screen) có mã TC cho kiểm tra `check`, id = mã TC."""
    out = []
    for key, s in SCREENS.items():
        if check in s["tc"]:
            out.append(pytest.param(key, id=s["tc"][check], marks=getattr(pytest.mark, s["mark"])))
    return out


def _open(page: Page, settings, screen: str):
    s = SCREENS[screen]
    page.goto(f"{settings.base_url}{s['path']}", wait_until="domcontentloaded")
    heading = page.get_by_role("heading", name=s["heading"], level=1)
    expect(heading).to_be_visible()
    if screen == "cv_builder":
        expect(page.get_by_role("status").filter(has_text="Đang tải CV đã lưu")).to_be_hidden()
    elif screen in ("cv_list", "cv_analysis"):
        expect(page.get_by_role("status", name="Đang tải danh sách CV")).to_be_hidden()
    return heading


@pytest.fixture
def opened(login_as, shared_candidate, page, settings):
    def _go(screen: str):
        login_as(shared_candidate)
        return _open(page, settings, screen)

    return _go


# ---------------------------------------------------------------- giao diện tổng thể (cảm quan)
@pytest.mark.manual
@pytest.mark.parametrize("screen", _params("look"))
def test_cv_layout_look_and_feel(screen, record_testcase):
    """Candidate_2/43/98/212 - Bố cục, font chữ, chính tả, màu chữ.

    Mang tính cảm quan, không có thiết kế chuẩn để so ảnh -> kiểm thử thủ công. Phần kiểm tra được bằng
    máy (dấu * trường bắt buộc, không tràn ngang, không chồng lấn) nằm ở test_cv_*_ui.py và test zoom/mobile.
    """
    record_testcase(SCREENS[screen]["tc"]["look"])
    pytest.skip("MANUAL: kiểm tra cảm quan bố cục/font/chính tả – cần người kiểm tra hoặc ảnh thiết kế chuẩn.")


# ---------------------------------------------------------------- thu nhỏ / phóng to
@pytest.mark.parametrize("screen", _params("zoom"))
def test_cv_zoom_in_out(opened, page: Page, settings, screen, record_testcase):
    """Candidate_3/44/99/213 - Ctrl - / Ctrl +: màn hình thu phóng, không vỡ giao diện.

    Ctrl -/+ không điều khiển được ở headless -> giả lập bằng viewport tương đương mức zoom 50%..200%.
    Tiêu chí "không vỡ": không tràn ngang, tiêu đề vẫn hiển thị, tiêu đề/nút/link không chồng lên nhau.
    """
    record_testcase(SCREENS[screen]["tc"]["zoom"])
    heading = opened(screen)
    for level in ZOOM_LEVELS:
        set_zoom(page, level, settings.viewport)
        assert horizontal_overflow(page) == 0, f"Zoom {int(level * 100)}%: trang bị tràn ngang"
        expect(heading).to_be_visible()
        overlaps = overlapping_text_blocks(page)
        assert not overlaps, f"Zoom {int(level * 100)}%: phần tử chồng lấn {overlaps}"


# ---------------------------------------------------------------- thiết bị di động
@pytest.mark.parametrize("screen", _params("mobile"))
def test_cv_mobile_375px(opened, page: Page, screen, record_testcase):
    """Candidate_4/45/100/214 - Độ rộng 375px: bố cục responsive, không tràn ngang, nút vẫn thao tác được."""
    record_testcase(SCREENS[screen]["tc"]["mobile"])
    page.set_viewport_size({"width": 375, "height": 812})
    heading = opened(screen)

    assert horizontal_overflow(page) == 0, "Màn hình 375px bị tràn ngang"
    expect(heading).to_be_in_viewport()
    buttons = page.locator("main").get_by_role("button").filter(visible=True)
    for i in range(min(buttons.count(), 10)):
        btn = buttons.nth(i)
        box = btn.bounding_box()
        assert box and box["x"] >= 0 and box["x"] + box["width"] <= 375 + 1, \
            f"Nút '{btn.inner_text().strip()}' nằm ngoài khung 375px: {box}"


# ---------------------------------------------------------------- Tab / Shift+Tab
@pytest.mark.parametrize("screen", _params("tab"))
def test_cv_tab_order(opened, page: Page, screen, record_testcase):
    """Candidate_5/46/101/215 - Nhấn Tab: con trỏ đi từ trái qua phải, từ trên xuống dưới."""
    record_testcase(SCREENS[screen]["tc"]["tab"])
    opened(screen)

    seq = focus_sequence(page, max_steps=150)

    assert len(seq) >= 2, "Không có phần tử nào trong nội dung chính nhận focus khi nhấn Tab"
    assert not reading_order_violations(seq), "\n".join(reading_order_violations(seq))


@pytest.mark.parametrize("screen", _params("shift_tab"))
def test_cv_shift_tab_order(opened, page: Page, screen, record_testcase):
    """Candidate_6/47/102/216 - Nhấn Shift+Tab: con trỏ đi theo thứ tự ngược lại."""
    record_testcase(SCREENS[screen]["tc"]["shift_tab"])
    opened(screen)

    forward = [f.key for f in focus_sequence(page, max_steps=150)]
    backward = [f.key for f in focus_sequence(page, reverse=True, max_steps=150)]

    assert backward == list(reversed(forward)), "Thứ tự Shift+Tab không ngược với thứ tự Tab"


# ---------------------------------------------------------------- phân quyền
@pytest.mark.parametrize("screen", _params("no_login"))
def test_cv_access_without_login(page: Page, settings, shared_candidate, screen, record_testcase):
    """Candidate_7/217 - Chưa đăng nhập: chuyển tới Đăng nhập; đăng nhập xong quay lại đúng màn hình."""
    record_testcase(SCREENS[screen]["tc"]["no_login"])
    path = SCREENS[screen]["path"]
    page.goto(f"{settings.base_url}{path}", wait_until="domcontentloaded")

    login = LoginPage(page, settings)
    login.expect_loaded()
    login.login_and_wait_api(shared_candidate.email, shared_candidate.password)

    expect(page).to_have_url(re.compile(rf"{re.escape(path)}/?(\?.*)?$"))
    expect(page.get_by_role("heading", name=SCREENS[screen]["heading"], level=1)).to_be_visible()


@pytest.mark.parametrize("screen", _params("role"))
def test_cv_access_wrong_role(login_as, recruiter, page: Page, settings, screen, record_testcase):
    """Candidate_8/218 - Tài khoản không phải Ứng viên: từ chối truy cập, về trang chủ của vai trò (NTD: /recruiter)."""
    record_testcase(SCREENS[screen]["tc"]["role"])
    login_as(recruiter)
    page.goto(f"{settings.base_url}{SCREENS[screen]['path']}", wait_until="domcontentloaded")

    expect(page.get_by_role("heading", name=SCREENS[screen]["heading"], level=1)).to_have_count(0)
    expect(page).to_have_url(re.compile(rf"^{re.escape(settings.base_url)}/recruiter/?$"))


@pytest.mark.parametrize("screen", _params("expired"))
def test_cv_session_expired(opened, page: Page, settings, screen, record_testcase):
    """Candidate_9/219 - Token hết hạn rồi thao tác: yêu cầu đăng nhập lại, không hiển thị lỗi hệ thống."""
    record_testcase(SCREENS[screen]["tc"]["expired"])
    opened(screen)
    # Giả lập access + refresh token hết hạn / không hợp lệ
    page.evaluate("() => { sessionStorage.setItem('access_token', 'expired.token.value');"
                  " sessionStorage.setItem('refresh_token', 'expired.refresh.value'); }")

    page.reload(wait_until="domcontentloaded")

    LoginPage(page, settings).expect_loaded()
    expect(page.get_by_text(re.compile(r"Traceback|Internal Server Error|Lỗi hệ thống|500"))).to_have_count(0)
