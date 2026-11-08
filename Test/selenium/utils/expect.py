"""Assertion có tự chờ (auto-retry) cho Selenium – mô phỏng `expect()` của Playwright.

Selenium không có web-first assertion: nếu assert ngay sau click, React có thể chưa render xong
-> test flaky. Mỗi hàm ở đây lặp lại việc kiểm tra tới khi đúng hoặc hết timeout (WebDriverWait),
bỏ qua lỗi tạm thời (phần tử chưa có / bị render lại).

    expect(driver, LoginPage.HEADING).to_have_text("Đăng nhập")
    expect(driver, LoginPage.ALERT).to_be_hidden()
    expect_page(driver).to_have_url(re.compile(r".*/login$"))

Locator là tuple (By, selector) – resolve lại mỗi lần kiểm tra nên không bị StaleElementReference.
"""
from __future__ import annotations

import re
from typing import Callable

from selenium.common.exceptions import (
    JavascriptException,
    NoSuchElementException,
    StaleElementReferenceException,
    TimeoutException,
)
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support.ui import WebDriverWait

Locator = tuple[str, str]
_IGNORED = (NoSuchElementException, StaleElementReferenceException, JavascriptException)

DEFAULT_TIMEOUT_S = 10.0


def set_default_timeout(seconds: float) -> None:
    global DEFAULT_TIMEOUT_S
    DEFAULT_TIMEOUT_S = seconds


def _poll(driver: WebDriver, check: Callable[[], tuple[bool, object]], message: str, timeout: float | None):
    """Gọi check() tới khi trả (True, _). Hết giờ -> AssertionError kèm giá trị thực tế cuối cùng."""
    last = {"actual": "<chưa lấy được>"}

    def _cond(_):
        try:
            ok, actual = check()
        except _IGNORED as exc:
            last["actual"] = f"<{type(exc).__name__}>"
            return False
        last["actual"] = actual
        return ok

    try:
        WebDriverWait(driver, timeout or DEFAULT_TIMEOUT_S, poll_frequency=0.1).until(_cond)
    except TimeoutException:
        raise AssertionError(f"{message}\n  Thực tế: {last['actual']!r}") from None


def _match(expected, actual: str) -> bool:
    if isinstance(expected, re.Pattern):
        return bool(expected.search(actual or ""))
    return (actual or "").strip() == expected


class LocatorAssertions:
    def __init__(self, driver: WebDriver, locator: Locator, message: str | None, timeout: float | None):
        self.driver, self.locator, self.timeout = driver, locator, timeout
        self.prefix = f"{message} – " if message else ""

    def _el(self) -> WebElement:
        return self.driver.find_element(*self.locator)

    def _fail_msg(self, what: str) -> str:
        return f"{self.prefix}{self.locator[1]!r}: mong đợi {what}"

    def to_be_visible(self):
        _poll(self.driver, lambda: (self._el().is_displayed(), "hidden"), self._fail_msg("hiển thị"), self.timeout)

    def to_be_hidden(self):
        def check():
            els = self.driver.find_elements(*self.locator)
            return (not any(e.is_displayed() for e in els), "visible")

        _poll(self.driver, check, self._fail_msg("ẩn / không tồn tại"), self.timeout)

    def to_have_text(self, expected):
        def check():
            text = self._el().text
            return _match(expected, text), text

        _poll(self.driver, check, self._fail_msg(f"text = {expected!r}"), self.timeout)

    def to_have_value(self, expected: str):
        def check():
            value = self._el().get_property("value")
            return value == expected, value

        _poll(self.driver, check, self._fail_msg(f"value = {expected!r}"), self.timeout)

    def to_have_attribute(self, name: str, expected: str):
        def check():
            value = self._el().get_attribute(name)
            return value == expected, value

        _poll(self.driver, check, self._fail_msg(f"[{name}] = {expected!r}"), self.timeout)

    def to_be_focused(self):
        def check():
            active = self.driver.switch_to.active_element
            return active == self._el(), active.get_attribute("outerHTML")[:120]

        _poll(self.driver, check, self._fail_msg("đang được focus"), self.timeout)


class PageAssertions:
    def __init__(self, driver: WebDriver, message: str | None, timeout: float | None):
        self.driver, self.timeout = driver, timeout
        self.prefix = f"{message} – " if message else ""

    def to_have_url(self, expected):
        def check():
            url = self.driver.current_url
            return _match(expected, url), url

        pattern = expected.pattern if isinstance(expected, re.Pattern) else expected
        _poll(self.driver, check, f"{self.prefix}URL mong đợi khớp {pattern!r}", self.timeout)


def expect(driver: WebDriver, locator: Locator, message: str | None = None, timeout: float | None = None):
    return LocatorAssertions(driver, locator, message, timeout)


def expect_page(driver: WebDriver, message: str | None = None, timeout: float | None = None):
    return PageAssertions(driver, message, timeout)
