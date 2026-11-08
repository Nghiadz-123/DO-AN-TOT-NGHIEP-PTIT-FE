"""Fixtures và hook dùng chung cho toàn bộ project.

Cung cấp:
- --env: chọn môi trường (dev/staging/uat) -> fixture `settings`
- Cấu hình timeout, viewport, locale cho browser context
- `credentials`: tài khoản test lấy từ biến môi trường (không hardcode)
- `api_context`: APIRequestContext cho API test
- `record_testcase`: gắn Test Case ID cho test data-driven
- Screenshot khi fail -> lưu screenshots/ và nhúng vào pytest-html
- Cột "Test Case ID" + thông tin môi trường trong report HTML
"""
from __future__ import annotations

import base64
import os
import time
from datetime import datetime
from pathlib import Path

import pytest
from playwright.sync_api import Playwright, expect

from config.settings import ROOT_DIR, get_secret, load_settings
from utils.helpers import safe_filename
from utils.rate_limit import AuthRateLimiter, is_auth_request

SCREENSHOT_DIR = ROOT_DIR / "screenshots"
REPORT_DIR = ROOT_DIR / "reports"


# ---------------------------------------------------------------- options
def pytest_addoption(parser):
    parser.addoption(
        "--env",
        action="store",
        default=os.getenv("TEST_ENV", "dev"),
        help="Môi trường chạy test, khai báo trong config/environments.yaml",
    )


def pytest_configure(config):
    SCREENSHOT_DIR.mkdir(exist_ok=True)
    REPORT_DIR.mkdir(exist_ok=True)

    settings = load_settings(config.getoption("--env"))
    config._automation_settings = settings
    config._session_start = time.time()

    # Ghi thông tin môi trường vào phần "Environment" của pytest-html
    try:
        from pytest_metadata.plugin import metadata_key

        config.stash[metadata_key].update(
            {
                "Test Environment": settings.env_name,
                "Base URL": settings.base_url,
                "API URL": settings.api_url,
                "Commit": os.getenv("CI_COMMIT_SHORT_SHA", "local"),
            }
        )
    except ImportError:
        pass


# ---------------------------------------------------------------- settings / browser
@pytest.fixture(scope="session")
def settings(pytestconfig):
    return pytestconfig._automation_settings


@pytest.fixture(scope="session")
def base_url(settings):
    """Ghi đè base_url của pytest-base-url để page.goto('/path') dùng URL theo môi trường."""
    return settings.base_url


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args, settings):
    return {
        **browser_context_args,
        "base_url": settings.base_url,
        "viewport": settings.viewport,
        "locale": settings.locale,
        "ignore_https_errors": settings.ignore_https_errors,
    }


@pytest.fixture(autouse=True)
def _configure_timeouts(request, settings):
    """Áp timeout tập trung cho mọi test có dùng `page`."""
    expect.set_options(timeout=settings.expect_timeout_ms)
    if "page" in request.fixturenames:
        page = request.getfixturevalue("page")
        page.set_default_timeout(settings.timeout_ms)
        page.set_default_navigation_timeout(settings.navigation_timeout_ms)


# ---------------------------------------------------------------- test data / secrets
@pytest.fixture(scope="session")
def browser_type_launch_args(browser_type_launch_args, settings):
    """Ngôn ngữ UI của Chromium = locale -> thông báo validation HTML5 hiển thị tiếng Việt."""
    lang = settings.locale
    args = [*browser_type_launch_args.get("args", []), f"--lang={lang}"]
    return {**browser_type_launch_args, "args": args}


@pytest.fixture(scope="session")
def auth_limiter(settings) -> AuthRateLimiter:
    return AuthRateLimiter(settings.auth_rate_limit_per_min)


@pytest.fixture(autouse=True)
def _auth_rate_guard(request, auth_limiter):
    """Trước mỗi test UI: chờ nếu gần chạm giới hạn API auth; ghi nhận mọi request auth của trang."""
    if "page" not in request.fixturenames or not auth_limiter.enabled:
        return
    auth_limiter.ensure_capacity(3)  # một test gửi tối đa ~2 request auth
    page = request.getfixturevalue("page")
    page.on("request", lambda r: auth_limiter.record() if is_auth_request(r.url, r.method) else None)


@pytest.fixture(scope="session")
def accounts():
    """Tài khoản test theo vai trò, đọc từ biến môi trường <ROLE>_EMAIL / <ROLE>_PASSWORD.

    Trả về hàm get(role). Thiếu biến -> test báo ERROR ở setup (lỗi cấu hình), không phải FAILED.
    """

    def _get(role: str) -> dict:
        prefix = role.upper()
        email, password = get_secret(f"{prefix}_EMAIL"), get_secret(f"{prefix}_PASSWORD")
        if not email or not password:
            pytest.fail(
                f"Thiếu {prefix}_EMAIL/{prefix}_PASSWORD. Khai báo trong file .env "
                "(xem .env.example) hoặc CI/CD Variables.",
                pytrace=False,
            )
        return {"email": email, "password": password}

    return _get


@pytest.fixture(scope="session")
def api_context(playwright: Playwright, settings):
    headers = {"Accept": "application/json"}
    token = get_secret("API_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    context = playwright.request.new_context(
        base_url=f"{settings.api_url}/",
        extra_http_headers=headers,
        ignore_https_errors=settings.ignore_https_errors,
        timeout=settings.timeout_ms,
    )
    yield context
    context.dispose()


@pytest.fixture
def record_testcase(request):
    """Gắn Test Case ID cho test (dùng với parametrize): record_testcase('TC_001')."""

    def _record(tc_id: str):
        request.node.user_properties.append(("testcase_id", tc_id))

    return _record


# ---------------------------------------------------------------- report hooks
def _testcase_ids(item) -> list[str]:
    ids = [m.args[0] for m in item.iter_markers(name="testcase") if m.args]
    ids += [v for k, v in item.user_properties if k == "testcase_id"]
    return list(dict.fromkeys(ids))


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    report.testcase_id = ", ".join(_testcase_ids(item))

    if report.when == "setup":
        # Ghi mã TC từ marker @pytest.mark.testcase vào junit.xml (báo cáo Excel đọc từ đây)
        recorded = {v for k, v in item.user_properties if k == "testcase_id"}
        for m in item.iter_markers(name="testcase"):
            if m.args and m.args[0] not in recorded:
                item.user_properties.append(("testcase_id", m.args[0]))

    if report.when != "call" or not report.failed:
        return

    page = item.funcargs.get("page")
    if page is None or page.is_closed():
        return

    file_name = f"{safe_filename(item.nodeid)}_{datetime.now():%Y%m%d_%H%M%S}.png"
    path: Path = SCREENSHOT_DIR / file_name
    try:
        png = page.screenshot(path=str(path), full_page=True)
    except Exception as exc:  # trang có thể đã crash; không để lỗi chụp ảnh che lỗi gốc
        report.sections.append(("Screenshot", f"Không chụp được screenshot: {exc}"))
        return
    item.user_properties.append(("screenshot", str(path.relative_to(ROOT_DIR))))

    pytest_html = item.config.pluginmanager.getplugin("html")
    if pytest_html is not None:
        extras = getattr(report, "extras", [])
        extras.append(pytest_html.extras.url(page.url, name="URL khi lỗi"))
        extras.append(pytest_html.extras.png(base64.b64encode(png).decode(), name="Screenshot"))
        report.extras = extras


def pytest_html_report_title(report):
    report.title = "Automation Test Report"


@pytest.hookimpl(trylast=True)
def pytest_unconfigure(config):
    """Sau khi junit.xml đã ghi xong: sinh reports/report.xlsx (1 sheet Tổng hợp + 1 sheet / chức năng)."""
    junit = getattr(config.option, "xmlpath", None)
    settings = getattr(config, "_automation_settings", None)
    if not junit or not Path(junit).exists() or config.option.collectonly or settings is None:
        return
    if Path(junit).stat().st_mtime < getattr(config, "_session_start", 0):
        return  # junit cũ của lần chạy trước (lần này không ghi junit)
    from utils.excel_report import build_report

    env = {
        "Môi trường": settings.env_name,
        "Base URL": settings.base_url,
        "API URL": settings.api_url,
        "Trình duyệt": ", ".join(config.option.browser or ["chromium"]),
    }
    out = build_report(Path(junit), REPORT_DIR / "report.xlsx", env=env)
    print(f"\n- Generated Excel report: {out}")


# pytest-html 4.x mã hóa sai URL khi đường dẫn có ký tự Unicode (vd "D:\Đồ án\...") nên
# history.pushState/replaceState ném lỗi -> JS dừng giữa chừng, bảng kết quả trống.
# Bọc 2 hàm này trong try/catch để report vẫn hiển thị (chỉ mất tính năng lưu sort/filter lên URL).
_HISTORY_GUARD = (
    "<script>(function(){['pushState','replaceState'].forEach(function(n){"
    "var o=history[n].bind(history);history[n]=function(){try{return o.apply(null,arguments)}"
    "catch(e){}}})})();</script>"
)


def pytest_html_results_summary(prefix, summary, postfix):
    prefix.insert(0, _HISTORY_GUARD)


def pytest_html_results_table_header(cells):
    cells.insert(1, "<th>Test Case ID</th>")


def pytest_html_results_table_row(report, cells):
    cells.insert(1, f"<td>{getattr(report, 'testcase_id', '')}</td>")
