"""Fixtures và hook dùng chung cho toàn bộ project Selenium.

Cung cấp:
- --env: chọn môi trường (dev/staging) -> fixture `settings`
- --browser chrome|edge, --headed: chọn trình duyệt, chạy có giao diện
- `driver`: WebDriver mới cho mỗi test (cô lập như browser context của Playwright)
- `network`: đọc request/response qua DevTools (thay page.expect_response)
- `accounts`: tài khoản test lấy từ biến môi trường (không hardcode)
- `record_testcase`: gắn Test Case ID cho test data-driven
- Screenshot full page + URL + console log khi fail -> lưu screenshots/ và nhúng vào pytest-html
- Cột "Test Case ID" + thông tin môi trường trong report HTML, sinh report.xlsx sau khi chạy
"""
from __future__ import annotations

import base64
import os
import time
from datetime import datetime
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.common.exceptions import WebDriverException

from config.settings import ROOT_DIR, get_secret, load_settings
from utils import expect as expect_module
from utils.helpers import safe_filename
from utils.network import NetworkMonitor
from utils.rate_limit import AuthRateLimiter

SCREENSHOT_DIR = ROOT_DIR / "screenshots"
REPORT_DIR = ROOT_DIR / "reports"
BROWSERS = ("chrome", "edge")


# ---------------------------------------------------------------- options
def pytest_addoption(parser):
    parser.addoption("--env", action="store", default=os.getenv("TEST_ENV", "dev"),
                     help="Môi trường chạy test, khai báo trong config/environments.yaml")
    parser.addoption("--browser", action="store", default=os.getenv("BROWSER", "chrome"), choices=BROWSERS,
                     help="Trình duyệt: chrome (mặc định) hoặc edge")
    parser.addoption("--headed", action="store_true", default=False, help="Chạy có giao diện trình duyệt")


def pytest_configure(config):
    SCREENSHOT_DIR.mkdir(exist_ok=True)
    REPORT_DIR.mkdir(exist_ok=True)

    settings = load_settings(config.getoption("--env"))
    config._automation_settings = settings
    config._session_start = time.time()
    expect_module.set_default_timeout(settings.expect_timeout_ms / 1000)

    try:
        from pytest_metadata.plugin import metadata_key

        config.stash[metadata_key].update({
            "Framework": "Selenium WebDriver + Pytest",
            "Browser": config.getoption("--browser"),
            "Headless": str(not config.getoption("--headed")),
            "Test Environment": settings.env_name,
            "Base URL": settings.base_url,
            "API URL": settings.api_url,
            "Commit": os.getenv("CI_COMMIT_SHORT_SHA", "local"),
        })
    except ImportError:
        pass


# ---------------------------------------------------------------- settings / driver
@pytest.fixture(scope="session")
def settings(pytestconfig):
    return pytestconfig._automation_settings


def _build_options(browser: str, settings, headed: bool):
    opts = webdriver.ChromeOptions() if browser == "chrome" else webdriver.EdgeOptions()
    vp = settings.viewport
    if not headed:
        opts.add_argument("--headless=new")  # full Chrome headless -> thông báo validation theo --lang
    opts.add_argument(f"--window-size={vp['width']},{vp['height']}")
    # Ngôn ngữ UI = locale -> thông báo validation HTML5 hiển thị tiếng Việt
    opts.add_argument(f"--lang={settings.locale}")
    opts.add_experimental_option("prefs", {"intl.accept_languages": settings.locale})
    if settings.ignore_https_errors:
        opts.add_argument("--ignore-certificate-errors")
    opts.add_argument("--disable-search-engine-choice-screen")
    opts.add_argument("--no-first-run")
    # performance log -> đọc request mạng (utils/network.py); browser log -> console khi fail
    opts.set_capability("goog:loggingPrefs", {"performance": "ALL", "browser": "ALL"})
    return opts


@pytest.fixture
def driver(pytestconfig, settings):
    browser = pytestconfig.getoption("--browser")
    opts = _build_options(browser, settings, pytestconfig.getoption("--headed"))
    drv = webdriver.Chrome(options=opts) if browser == "chrome" else webdriver.Edge(options=opts)
    drv.set_page_load_timeout(settings.navigation_timeout_ms / 1000)
    if pytestconfig.getoption("--headed"):
        drv.set_window_size(settings.viewport["width"], settings.viewport["height"])
    try:  # cho phép đọc/ghi clipboard (Login_19, 36, 37) không cần hộp thoại xin quyền
        drv.execute_cdp_cmd("Browser.grantPermissions", {
            "origin": settings.base_url,
            "permissions": ["clipboardReadWrite", "clipboardSanitizedWrite"],
        })
    except WebDriverException:
        pass
    yield drv
    drv.quit()


@pytest.fixture
def network(driver) -> NetworkMonitor:
    return NetworkMonitor(driver)


# ---------------------------------------------------------------- rate limit API auth
@pytest.fixture(scope="session")
def auth_limiter(settings) -> AuthRateLimiter:
    return AuthRateLimiter(settings.auth_rate_limit_per_min)


@pytest.fixture(autouse=True)
def _auth_rate_guard(request, auth_limiter):
    """Trước mỗi test UI: chờ nếu gần chạm giới hạn API auth; sau test: ghi nhận request auth đã gửi."""
    if "driver" not in request.fixturenames or not auth_limiter.enabled:
        yield
        return
    auth_limiter.ensure_capacity(3)  # một test gửi tối đa ~2 request auth
    net: NetworkMonitor = request.getfixturevalue("network")
    yield
    for _ in range(net.drain_auth_requests()):
        auth_limiter.record()


# ---------------------------------------------------------------- test data / secrets
@pytest.fixture(scope="session")
def accounts():
    """Tài khoản test theo vai trò, đọc từ biến môi trường <ROLE>_EMAIL / <ROLE>_PASSWORD.

    Trả về hàm get(role). Thiếu biến -> test báo ERROR ở setup (lỗi cấu hình), không phải FAILED.
    """

    def _get(role: str) -> dict:
        prefix = role.upper()
        email, password = get_secret(f"{prefix}_EMAIL"), get_secret(f"{prefix}_PASSWORD")
        if not email or not password:
            pytest.fail(f"Thiếu {prefix}_EMAIL/{prefix}_PASSWORD. Khai báo trong file .env "
                        "(xem .env.example) hoặc CI/CD Variables.", pytrace=False)
        return {"email": email, "password": password}

    return _get


@pytest.fixture
def record_testcase(request):
    """Gắn Test Case ID cho test (dùng với parametrize): record_testcase('Login_6')."""

    def _record(tc_id: str):
        request.node.user_properties.append(("testcase_id", tc_id))

    return _record


# ---------------------------------------------------------------- report hooks
def _testcase_ids(item) -> list[str]:
    ids = [m.args[0] for m in item.iter_markers(name="testcase") if m.args]
    ids += [v for k, v in item.user_properties if k == "testcase_id"]
    return list(dict.fromkeys(ids))


def _full_page_png(drv) -> bytes:
    """Screenshot toàn trang qua CDP (Selenium chỉ chụp phần đang hiển thị)."""
    try:
        data = drv.execute_cdp_cmd("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True})
        return base64.b64decode(data["data"])
    except WebDriverException:
        return drv.get_screenshot_as_png()


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

    drv = item.funcargs.get("driver")
    if drv is None:
        return
    file_name = f"{safe_filename(item.nodeid)}_{datetime.now():%Y%m%d_%H%M%S}.png"
    path: Path = SCREENSHOT_DIR / file_name
    try:
        png = _full_page_png(drv)
        path.write_bytes(png)
        url = drv.current_url
        console = [f"[{e['level']}] {e['message']}" for e in drv.get_log("browser")]
    except WebDriverException as exc:  # trình duyệt có thể đã crash; không để lỗi chụp ảnh che lỗi gốc
        report.sections.append(("Screenshot", f"Không chụp được screenshot: {exc}"))
        return
    item.user_properties.append(("screenshot", str(path.relative_to(ROOT_DIR))))
    if console:
        report.sections.append(("Browser console", "\n".join(console)))

    pytest_html = item.config.pluginmanager.getplugin("html")
    if pytest_html is not None:
        extras = getattr(report, "extras", [])
        extras.append(pytest_html.extras.url(url, name="URL khi lỗi"))
        extras.append(pytest_html.extras.png(base64.b64encode(png).decode(), name="Screenshot"))
        report.extras = extras


def pytest_html_report_title(report):
    report.title = "Automation Test Report – Selenium"


@pytest.hookimpl(trylast=True)
def pytest_unconfigure(config):
    """Sau khi junit.xml đã ghi xong: sinh reports/report.xlsx (1 sheet Tổng hợp + 1 sheet / chức năng)."""
    junit = getattr(config.option, "xmlpath", None)
    settings = getattr(config, "_automation_settings", None)
    if not junit or not Path(junit).exists() or config.option.collectonly or settings is None:
        return
    if Path(junit).stat().st_mtime < getattr(config, "_session_start", 0):
        return  # junit cũ của lần chạy trước
    from utils.excel_report import build_report

    env = {
        "Framework": "Selenium WebDriver + Pytest",
        "Môi trường": settings.env_name,
        "Base URL": settings.base_url,
        "API URL": settings.api_url,
        "Trình duyệt": config.getoption("--browser"),
    }
    out = build_report(Path(junit), REPORT_DIR / "report.xlsx", env=env)
    try:
        print(f"\n- Generated Excel report: {out}")
    except UnicodeEncodeError:  # console cp1252 không in được "Đồ án"
        print(f"\n- Generated Excel report: {out.as_uri()}")


# pytest-html 4.x mã hóa sai URL khi đường dẫn có ký tự Unicode (vd "D:\Đồ án\...") nên
# history.pushState/replaceState ném lỗi -> JS dừng giữa chừng, bảng kết quả trống. Bọc try/catch.
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
