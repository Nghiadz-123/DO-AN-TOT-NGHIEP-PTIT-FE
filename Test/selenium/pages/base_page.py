"""Base Page: hành vi dùng chung cho mọi Page Object (Selenium WebDriver).

Quy ước:
- Page Object chỉ chứa locator + hành động nghiệp vụ, không assert nghiệp vụ.
- Locator khai báo dạng tuple (By, selector) ở mức class -> test dùng được trong expect(driver, LOCATOR).
- Không dùng time.sleep(); chờ bằng WebDriverWait / utils.expect.
"""
from __future__ import annotations

import re

from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from config.settings import Settings
from utils.expect import Locator, expect_page
from utils.logger import get_logger


class BasePage:
    PATH: str = "/"
    URL_PATTERN: re.Pattern = re.compile(r".*")

    def __init__(self, driver: WebDriver, settings: Settings):
        self.driver = driver
        self.settings = settings
        self.wait = WebDriverWait(driver, settings.timeout_ms / 1000)
        self.log = get_logger(self.__class__.__name__)

    # ---------- Điều hướng ----------
    def open(self):
        url = f"{self.settings.base_url}{self.PATH}"
        self.log.info("Mở trang %s", url)
        self.driver.get(url)
        self.expect_loaded()
        return self

    def expect_loaded(self) -> None:
        """Xác nhận đã ở đúng trang. Page con nên override để chờ thêm phần tử chính."""
        expect_page(self.driver).to_have_url(self.URL_PATTERN)

    # ---------- Tìm phần tử ----------
    def find(self, locator: Locator) -> WebElement:
        """Chờ phần tử hiển thị rồi trả về."""
        return self.wait.until(EC.visibility_of_element_located(locator))

    def clickable(self, locator: Locator) -> WebElement:
        return self.wait.until(EC.element_to_be_clickable(locator))

    # ---------- Hành động dùng chung ----------
    def fill_field(self, locator: Locator, value: str | None) -> None:
        """Nhập giá trị (xóa giá trị cũ trước); None = bỏ qua trường, "" = để trống."""
        if value is None:
            return
        el = self.find(locator)
        if el.get_property("value"):
            self.clear(el)
        if value:
            el.send_keys(value)

    def clear(self, el: WebElement) -> None:
        """element.clear() không phát sự kiện onChange của React -> chọn hết rồi xóa bằng phím."""
        el.click()
        ActionChains(self.driver).key_down(self.ctrl).send_keys("a").key_up(self.ctrl).perform()
        el.send_keys("")  # Keys.BACKSPACE

    @property
    def ctrl(self) -> str:
        from selenium.webdriver.common.keys import Keys

        return Keys.COMMAND if self.driver.capabilities.get("platformName", "").lower() == "mac" else Keys.CONTROL

    def js(self, script: str, *args):
        return self.driver.execute_script(script, *args)

    def title(self) -> str:
        return self.driver.title
