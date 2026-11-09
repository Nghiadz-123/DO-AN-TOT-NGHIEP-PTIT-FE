"""Page Object màn hình Đăng nhập – Smart ATS (route /login).

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
"""
from __future__ import annotations

import re

from playwright.sync_api import Locator, expect

from pages.base_page import BasePage

TOGGLE_NAME = re.compile(r"^(Hiện|Ẩn) mật khẩu$")


class LoginPage(BasePage):
    PATH = "/login"
    URL_PATTERN = re.compile(r".*/login/?(\?.*)?$")

    def __init__(self, page, settings):
        super().__init__(page, settings)
        # Header cũng có nút/link "Đăng nhập" -> mọi locator trong form đều scope vào form
        self.form = page.locator("form.auth-card")
        self.heading = self.form.get_by_role("heading", name="Đăng nhập", level=1)
        self.email_input = self.form.get_by_label("Email", exact=True)
        self.password_input = self.form.get_by_label("Mật khẩu", exact=True)
        self.password_toggle = self.form.get_by_role("button", name=TOGGLE_NAME)
        # Nhãn nút đổi thành "Đang đăng nhập..." khi đang gửi -> dùng type=submit cho ổn định
        self.submit_button = self.form.locator("button[type='submit']")
        self.register_link = self.form.get_by_role("link", name="Đăng ký ngay")
        self.error_alert = self.form.get_by_role("alert")
        self.header = page.get_by_role("banner")
        self.footer = page.get_by_role("contentinfo")

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()

    # ---------- Hành động nghiệp vụ ----------
    def fill_credentials(self, email: str | None, password: str | None) -> None:
        """None = bỏ qua trường; "" = để trống."""
        self.fill_field(self.email_input, email)
        self.fill_field(self.password_input, password)

    def submit(self) -> None:
        self.submit_button.click()

    def submit_by_enter(self, field: Locator | None = None) -> None:
        (field or self.password_input).press("Enter")

    def login(self, email: str | None, password: str | None) -> None:
        """Nhập thông tin và nhấn nút Đăng nhập. Test tự assert thành công/thất bại."""
        self.log.info("Đăng nhập với email='%s'", email)
        self.fill_credentials(email, password)
        self.submit()

    def login_and_wait_api(self, email: str, password: str):
        """Đăng nhập và chờ response của API /auth/login/ (tránh assert khi request chưa xong)."""
        self.fill_credentials(email, password)
        with self.page.expect_response(lambda r: "/auth/login/" in r.url and r.request.method == "POST") as info:
            self.submit()
        return info.value

    def toggle_password_visibility(self) -> None:
        self.password_toggle.click()

    def go_to_register(self) -> None:
        self.register_link.click()

    # ---------- Đọc trạng thái ----------
    @staticmethod
    def validation_message(field: Locator) -> str:
        """Thông báo validation HTML5 (tooltip của trình duyệt) của một input."""
        return field.evaluate("el => el.validationMessage")

    @staticmethod
    def is_value_missing(field: Locator) -> bool:
        return field.evaluate("el => el.validity.valueMissing")

    def access_token(self) -> str | None:
        """FE lưu token trong sessionStorage (FE/frontend/src/utils/storage.js)."""
        return self.page.evaluate("() => sessionStorage.getItem('access_token')")

    # ---------- Clipboard ----------
    def copy_from(self, field: Locator) -> None:
        field.focus()
        field.press("ControlOrMeta+a")
        field.press("ControlOrMeta+c")

    def paste_into(self, field: Locator) -> None:
        field.focus()
        field.press("ControlOrMeta+v")

    def read_clipboard(self) -> str:
        return self.page.evaluate("() => navigator.clipboard.readText()")

    def write_clipboard(self, text: str) -> None:
        self.page.evaluate("t => navigator.clipboard.writeText(t)", text)
