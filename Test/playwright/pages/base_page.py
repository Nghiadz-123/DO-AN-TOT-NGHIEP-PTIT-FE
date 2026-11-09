"""Base Page: hành vi dùng chung cho mọi Page Object.

Quy ước:
- Page Object chỉ chứa locator + hành động nghiệp vụ, không assert nghiệp vụ.
- Mỗi Page khai báo PATH (đường dẫn tương đối) và URL_PATTERN (regex) để mở/nhận diện trang.
- Không dùng time.sleep(); dựa vào auto-wait và expect() của Playwright.
"""
from __future__ import annotations

import re

from playwright.sync_api import Locator, Page, expect

from config.settings import Settings
from utils.logger import get_logger


class BasePage:
    PATH: str = "/"
    URL_PATTERN: re.Pattern = re.compile(r".*")

    def __init__(self, page: Page, settings: Settings):
        self.page = page
        self.settings = settings
        self.log = get_logger(self.__class__.__name__)

    # ---------- Điều hướng ----------
    def open(self):
        url = f"{self.settings.base_url}{self.PATH}"
        self.log.info("Mở trang %s", url)
        self.page.goto(url, wait_until="domcontentloaded")
        self.expect_loaded()
        return self

    def expect_loaded(self) -> None:
        """Xác nhận đã ở đúng trang. Page con nên override để chờ thêm phần tử chính."""
        expect(self.page).to_have_url(self.URL_PATTERN)

    # ---------- Hành động dùng chung ----------
    def fill_field(self, locator: Locator, value: str | None) -> None:
        """Nhập giá trị; None nghĩa là bỏ qua trường, chuỗi rỗng nghĩa là xóa trắng."""
        if value is None:
            return
        locator.fill(value)

    def select_option(self, locator: Locator, label: str) -> None:
        locator.select_option(label=label)

    def wait_for_loading_done(self, spinner: Locator) -> None:
        """Chờ spinner/overlay biến mất (thay cho sleep)."""
        expect(spinner).to_be_hidden()

    def title(self) -> str:
        return self.page.title()
