"""Test chung cho mọi màn hình: Giao diện chung (mặc định, cảm quan, zoom, 375px, Tab, Shift+Tab),
Phân quyền truy cập (chưa đăng nhập, sai vai trò, hết phiên) và Trạng thái tải dữ liệu (đang tải, lỗi, Thử lại).

Mã TC lấy từ KBKTCN theo nhóm "Giao diện chung" / "Phân quyền truy cập" / "Trạng thái tải dữ liệu" của từng
chức năng khai báo ở specs/; TC nghiệp vụ riêng trong các nhóm này nằm ở tests/ui|function/test_<màn hình>_*.py.
"""
import re

import pytest
from playwright.sync_api import Page, Route, expect

from pages.components import AppShell, ErrorState
from pages.login_page import LoginPage
from specs.model import ADMIN, CANDIDATE, EMPLOYER
from specs.registry import SCREENS
from utils import kbktcn
from utils.layout import ZOOM_LEVELS, focus_sequence, horizontal_overflow, overlapping_text_blocks, reading_order_violations, set_zoom

pytestmark = [pytest.mark.ui, pytest.mark.generic]

KINDS = {
    "layout_default", "layout_look", "layout_zoom", "layout_mobile", "layout_tab", "layout_shift_tab",
    "access_no_login", "access_wrong_role", "access_expired", "load_slow", "load_error", "load_retry",
}


def _params(kinds: set[str]):
    for screen in SCREENS.values():
        groups = (*screen.groups_layout, *screen.groups_access, *screen.groups_loading)
        for group in groups:
            try:
                tcs = kbktcn.cases(screen.function, group)
            except LookupError:
                continue
            for tc in tcs:
                kind = kbktcn.classify(tc)
                if kind in kinds:
                    yield pytest.param(screen, tc, id=tc.id, marks=[getattr(pytest.mark, screen.mark)])


def _open(screen_env, screen, **kw):
    env = screen_env(screen, **kw)
    return env, env.open()


# ---------------------------------------------------------------- giao diện chung
def _item_locator(page: Page, kind: str, value: str):
    main = page.locator("main, [role='dialog']")  # màn hình dạng popup (Ứng tuyển) nằm ngoài <main>
    return {
        "heading": lambda: main.get_by_role("heading", name=value),
        "label": lambda: main.get_by_label(re.compile(rf"^\s*{re.escape(value)}\s*\*?\s*$")),
        "button": lambda: main.get_by_role("button", name=value),
        "link": lambda: main.get_by_role("link", name=value),
        "switch": lambda: main.get_by_role("switch", name=value),
        "tab": lambda: main.get_by_role("tab", name=value),
        "radio": lambda: main.get_by_role("radio"),
        "region": lambda: main.get_by_role("region", name=value),
        "group": lambda: main.get_by_role("group", name=value),
        "placeholder": lambda: main.get_by_placeholder(value),
        "text": lambda: main.get_by_text(value),
    }[kind]()


@pytest.mark.parametrize("screen, tc", list(_params({"layout_default"})))
def test_layout_default(screen_env, screen, tc, record_testcase):
    """Title đúng tài liệu; đủ các trường / nút như tài liệu mô tả; có header, footer."""
    record_testcase(tc.id)
    env, po = _open(screen_env, screen)
    page = env.page
    title = (kbktcn.quoted(tc.expected) or [screen.heading])[0].split("<")[0].strip()
    title_loc = getattr(po, "screen_title", None) or page.get_by_role("heading", level=1)
    expect(title_loc).to_contain_text(title)
    missing = [f"{k} '{v}'" for k, v in screen.layout_items if _item_locator(page, k, v).count() == 0]
    assert not missing, f"Thiếu thành phần theo tài liệu: {missing}"
    shell = AppShell(page)
    if "header, footer" in tc.expected.lower() or "header" in tc.steps.lower():
        expect(shell.header).to_be_visible()


@pytest.mark.manual
@pytest.mark.parametrize("screen, tc", list(_params({"layout_look"})))
def test_layout_look_and_feel(screen, tc, record_testcase):
    """Bố cục, font chữ, chính tả, màu chữ: mang tính cảm quan, không có ảnh thiết kế chuẩn để so -> kiểm thử tay.
    Phần đo được bằng máy (tràn ngang, chồng lấn) nằm ở test zoom / 375px."""
    record_testcase(tc.id)
    pytest.skip("MANUAL: kiểm tra cảm quan bố cục/font/chính tả – cần người kiểm tra hoặc ảnh thiết kế chuẩn.")


@pytest.mark.parametrize("screen, tc", list(_params({"layout_zoom"})))
def test_layout_zoom(screen_env, settings, screen, tc, record_testcase):
    """Ctrl -/+ (giả lập bằng viewport tương đương 50%..200%): không tràn ngang, không chồng lấn."""
    record_testcase(tc.id)
    env, po = _open(screen_env, screen)
    page = env.page
    heading = getattr(po, "screen_title", None) or page.get_by_role("heading", level=1).first
    for level in ZOOM_LEVELS:
        set_zoom(page, level, settings.viewport)
        assert horizontal_overflow(page) == 0, f"Zoom {int(level * 100)}%: trang bị tràn ngang"
        expect(heading).to_be_visible()
        overlaps = overlapping_text_blocks(page)
        assert not overlaps, f"Zoom {int(level * 100)}%: phần tử chồng lấn {overlaps}"


@pytest.mark.parametrize("screen, tc", list(_params({"layout_mobile"})))
def test_layout_mobile(screen_env, screen, tc, record_testcase):
    """Độ rộng 375px: responsive, không tràn ngang, nút nằm trong khung nhìn."""
    record_testcase(tc.id)
    env = screen_env(screen)
    env.page.set_viewport_size({"width": 375, "height": 812})
    env.open()
    page = env.page
    assert horizontal_overflow(page) == 0, "Màn hình 375px bị tràn ngang"
    buttons = page.locator("main").get_by_role("button").filter(visible=True)
    for i in range(min(buttons.count(), 12)):
        box = buttons.nth(i).bounding_box()
        assert box and box["x"] >= 0 and box["x"] + box["width"] <= 376, \
            f"Nút '{buttons.nth(i).inner_text().strip()}' nằm ngoài khung 375px: {box}"


@pytest.mark.parametrize("screen, tc", list(_params({"layout_tab"})))
def test_layout_tab_order(screen_env, screen, tc, record_testcase):
    """Nhấn Tab: con trỏ đi từ trái qua phải, từ trên xuống dưới."""
    record_testcase(tc.id)
    env, _ = _open(screen_env, screen)
    seq = focus_sequence(env.page, max_steps=150)
    assert len(seq) >= 2, "Không có phần tử nào trong nội dung chính nhận focus khi nhấn Tab"
    bad = reading_order_violations(seq)
    assert not bad, "\n".join(bad)


@pytest.mark.parametrize("screen, tc", list(_params({"layout_shift_tab"})))
def test_layout_shift_tab_order(screen_env, screen, tc, record_testcase):
    """Nhấn Shift+Tab: thứ tự ngược với Tab."""
    record_testcase(tc.id)
    env, _ = _open(screen_env, screen)
    forward = [f.key for f in focus_sequence(env.page, max_steps=150)]
    backward = [f.key for f in focus_sequence(env.page, reverse=True, max_steps=150)]
    assert backward == list(reversed(forward)), "Thứ tự Shift+Tab không ngược với thứ tự Tab"


# ---------------------------------------------------------------- phân quyền
@pytest.mark.parametrize("screen, tc", list(_params({"access_no_login"})))
def test_access_without_login(page: Page, settings, account_for, screen, tc, record_testcase):
    """Chưa đăng nhập: chuyển tới Đăng nhập; đăng nhập xong quay lại đúng màn hình."""
    record_testcase(tc.id)
    client = account_for(screen.role, screen.key)
    page.goto(f"{settings.base_url}{screen.path}", wait_until="domcontentloaded")
    login = LoginPage(page, settings)
    login.expect_loaded()
    login.login_and_wait_api(client.email, client.password)
    expect(page).to_have_url(re.compile(rf"{re.escape(screen.path)}/?(\?.*)?$"))
    if screen.heading:
        expect(page.get_by_role("heading", name=screen.heading, level=1)).to_be_visible()


@pytest.mark.parametrize("screen, tc", list(_params({"access_wrong_role"})))
def test_access_wrong_role(page: Page, settings, login_role, screen, tc, record_testcase):
    """Đăng nhập vai trò khác: từ chối truy cập, chuyển về trang chủ của vai trò đó."""
    record_testcase(tc.id)
    role, landing = screen.wrong_role or ((EMPLOYER, r"/recruiter/?$") if screen.role != EMPLOYER else (CANDIDATE, r"/?$"))
    login_role(role)
    page.goto(f"{settings.base_url}{screen.path}", wait_until="domcontentloaded")
    expect(page).to_have_url(re.compile(rf"^{re.escape(settings.base_url)}{landing}"))
    if screen.heading:
        expect(page.get_by_role("heading", name=screen.heading, level=1)).to_have_count(0)


@pytest.mark.parametrize("screen, tc", list(_params({"access_expired"})))
def test_access_session_expired(screen_env, settings, screen, tc, record_testcase):
    """Token hết hạn rồi thao tác: yêu cầu đăng nhập lại, không hiển thị lỗi hệ thống."""
    record_testcase(tc.id)
    env, _ = _open(screen_env, screen)
    page = env.page
    page.evaluate("() => { sessionStorage.setItem('access_token', 'expired.token.value');"
                  " sessionStorage.setItem('refresh_token', 'expired.refresh.value'); }")
    page.reload(wait_until="domcontentloaded")
    LoginPage(page, settings).expect_loaded()
    expect(page.get_by_text(re.compile(r"Traceback|Internal Server Error|Lỗi hệ thống"))).to_have_count(0)


# ---------------------------------------------------------------- trạng thái tải dữ liệu
def _require_load_api(screen):
    if not screen.load_api:
        pytest.fail(f"Chưa khai báo Screen.load_api cho màn hình {screen.key}", pytrace=False)


@pytest.mark.parametrize("screen, tc", list(_params({"load_slow"})))
def test_loading_state(screen_env, screen, tc, record_testcase):
    """Mạng chậm (giữ response API): hiển thị skeleton/loading với nhãn theo tài liệu."""
    record_testcase(tc.id)
    _require_load_api(screen)
    env = screen_env(screen)
    page = env.page
    held: list[Route] = []
    page.route(screen.load_api, lambda route: held.append(route) if route.request.method == "GET" else route.continue_())
    page.goto(f"{env.settings.base_url}{screen.path}", wait_until="domcontentloaded")
    label = (kbktcn.quoted(tc.expected) or [screen.load_label])[0]
    expect(page.get_by_role("status", name=label)).to_be_visible()
    page.unroute(screen.load_api)
    for route in held:
        try:
            route.continue_()
        except Exception:  # route đã được xử lý (trang tự hủy request cũ khi tải lại)
            pass


def _fail_api(page: Page, pattern: str):
    page.route(pattern, lambda route: route.fulfill(status=500, body="{}", content_type="application/json")
               if route.request.method == "GET" else route.continue_())


@pytest.mark.parametrize("screen, tc", list(_params({"load_error"})))
def test_loading_error(screen_env, screen, tc, record_testcase):
    """API trả lỗi 500: hiển thị thông báo lỗi kèm nút Thử lại, không trắng trang."""
    record_testcase(tc.id)
    _require_load_api(screen)
    env = screen_env(screen)
    _fail_api(env.page, screen.load_api)
    env.page.goto(f"{env.settings.base_url}{screen.path}", wait_until="domcontentloaded")
    err = ErrorState(env.page)
    expect(err.root).to_be_visible()
    expect(err.retry_button).to_be_visible()


@pytest.mark.parametrize("screen, tc", list(_params({"load_retry"})))
def test_loading_retry(screen_env, screen, tc, record_testcase):
    """Khôi phục kết nối, nhấn Thử lại: dữ liệu được tải lại thành công."""
    record_testcase(tc.id)
    _require_load_api(screen)
    env = screen_env(screen)
    page = env.page
    _fail_api(page, screen.load_api)
    page.goto(f"{env.settings.base_url}{screen.path}", wait_until="domcontentloaded")
    err = ErrorState(page)
    expect(err.retry_button).to_be_visible()
    page.unroute(screen.load_api)
    err.retry_button.click()
    expect(err.root).to_have_count(0)
    env.make().expect_loaded()
