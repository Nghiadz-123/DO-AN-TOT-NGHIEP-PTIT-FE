"""Page Object màn hình Đăng nhập – Smart ATS (route /login), Selenium.

Locator lấy từ source FE (đã đối chiếu, không suy đoán):
  FE/frontend/src/pages/Auth/LoginPage.jsx
    <form class="auth-card">
      <h1>Đăng nhập</h1>
      <div class="alert alert-error" role="alert">...</div>         (chỉ hiện khi API trả lỗi)
      <label for="email">Email</label><input id="email" type="email" required>
      <label for="password">Mật khẩu</label><PasswordInput id="password" required>
      <button type="submit">Đăng nhập | Đang đăng nhập...</button>
      Chưa có tài khoản? <a href="/register">Đăng ký ngay</a>
  FE/frontend/src/components/common/PasswordInput.jsx
    <button class="password-toggle" aria-label="Hiện mật khẩu|Ẩn mật khẩu" aria-pressed>
  FE/frontend/src/components/layout/Header.jsx / Footer.jsx -> <header class="header">, <footer class="footer">
"""
from __future__ import annotations

import re

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains

from pages.base_page import BasePage
from utils.expect import Locator, expect
from utils.network import NetworkCall, NetworkMonitor

FORM_CSS = "form.auth-card"


def _is_login_api(call: NetworkCall) -> bool:
    return "/auth/login/" in call.url and call.method == "POST"


class LoginPage(BasePage):
    PATH = "/login"
    URL_PATTERN = re.compile(r".*/login/?(\?.*)?$")

    # Header cũng có nút/link "Đăng nhập" -> mọi locator trong form đều scope vào form.auth-card
    FORM: Locator = (By.CSS_SELECTOR, FORM_CSS)
    HEADING: Locator = (By.CSS_SELECTOR, f"{FORM_CSS} h1")
    EMAIL: Locator = (By.CSS_SELECTOR, f"{FORM_CSS} input#email")
    PASSWORD: Locator = (By.CSS_SELECTOR, f"{FORM_CSS} input#password")
    PASSWORD_TOGGLE: Locator = (By.CSS_SELECTOR, f"{FORM_CSS} button.password-toggle")
    # Nhãn nút đổi thành "Đang đăng nhập..." khi đang gửi -> dùng type=submit cho ổn định
    SUBMIT: Locator = (By.CSS_SELECTOR, f"{FORM_CSS} button[type='submit']")
    REGISTER_LINK: Locator = (By.XPATH, f"//form[contains(@class,'auth-card')]//a[normalize-space()='Đăng ký ngay']")
    ERROR_ALERT: Locator = (By.CSS_SELECTOR, f"{FORM_CSS} [role='alert']")
    HEADER: Locator = (By.CSS_SELECTOR, "header.header")
    FOOTER: Locator = (By.CSS_SELECTOR, "footer.footer")

    def __init__(self, driver, settings, network: NetworkMonitor | None = None):
        super().__init__(driver, settings)
        self.network = network

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.driver, self.HEADING).to_be_visible()

    # ---------- Phần tử ----------
    @property
    def email_input(self):
        return self.find(self.EMAIL)

    @property
    def password_input(self):
        return self.find(self.PASSWORD)

    # ---------- Hành động nghiệp vụ ----------
    def fill_credentials(self, email: str | None, password: str | None) -> None:
        """None = bỏ qua trường; "" = để trống."""
        self.fill_field(self.EMAIL, email)
        self.fill_field(self.PASSWORD, password)

    def submit(self) -> None:
        self.clickable(self.SUBMIT).click()

    def submit_by_enter(self, locator: Locator | None = None) -> None:
        self.find(locator or self.PASSWORD).send_keys(Keys.ENTER)

    def login(self, email: str | None, password: str | None) -> None:
        """Nhập thông tin và nhấn nút Đăng nhập. Test tự assert thành công/thất bại."""
        self.log.info("Đăng nhập với email='%s'", email)
        self.fill_credentials(email, password)
        self.submit()

    def login_and_wait_api(self, email: str, password: str, by_enter: bool = False) -> NetworkCall:
        """Đăng nhập và chờ response của API /auth/login/ (tránh assert khi request chưa xong)."""
        assert self.network is not None, "LoginPage cần NetworkMonitor để chờ API"
        self.fill_credentials(email, password)
        before = self.network.mark()
        self.submit_by_enter() if by_enter else self.submit()
        return self.network.wait_for_response(_is_login_api, since=before,
                                              timeout=self.settings.timeout_ms / 1000)

    def toggle_password_visibility(self) -> None:
        self.clickable(self.PASSWORD_TOGGLE).click()

    def go_to_register(self) -> None:
        self.clickable(self.REGISTER_LINK).click()

    def press_tab(self, shift: bool = False) -> None:
        actions = ActionChains(self.driver)
        if shift:
            actions.key_down(Keys.SHIFT).send_keys(Keys.TAB).key_up(Keys.SHIFT)
        else:
            actions.send_keys(Keys.TAB)
        actions.perform()

    def focus(self, locator: Locator) -> None:
        self.js("arguments[0].focus()", self.driver.find_element(*locator))

    # ---------- Đọc trạng thái ----------
    def validation_message(self, locator: Locator) -> str:
        """Thông báo validation HTML5 (tooltip của trình duyệt) của một input."""
        return self.js("return arguments[0].validationMessage", self.driver.find_element(*locator))

    def is_value_missing(self, locator: Locator) -> bool:
        return self.js("return arguments[0].validity.valueMissing", self.driver.find_element(*locator))

    def value_of(self, locator: Locator) -> str:
        return self.driver.find_element(*locator).get_property("value")

    def access_token(self) -> str | None:
        """FE lưu token trong sessionStorage (FE/frontend/src/utils/storage.js)."""
        return self.js("return sessionStorage.getItem('access_token')")

    # ---------- Clipboard ----------
    def copy_from(self, locator: Locator) -> None:
        el = self.driver.find_element(*locator)
        el.click()
        ActionChains(self.driver).key_down(self.ctrl).send_keys("a").send_keys("c").key_up(self.ctrl).perform()

    def paste_into(self, locator: Locator) -> None:
        el = self.driver.find_element(*locator)
        el.click()
        ActionChains(self.driver).key_down(self.ctrl).send_keys("v").key_up(self.ctrl).perform()

    def read_clipboard(self) -> str:
        return self.driver.execute_async_script(
            "const done = arguments[arguments.length - 1];"
            "navigator.clipboard.readText().then(done, e => done('__ERR__' + e));"
        )

    def write_clipboard(self, text: str) -> None:
        self.driver.execute_async_script(
            "const [t, done] = arguments; navigator.clipboard.writeText(t).then(() => done(), () => done());",
            text,
        )
