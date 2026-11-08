"""Page Object màn hình Đăng ký – Smart ATS (route /register).

Locator lấy từ source FE (đã đối chiếu, không suy đoán):
  FE/frontend/src/pages/Auth/RegisterPage.jsx
    <form class="auth-card">
      <h1>Tạo tài khoản</h1>
      <fieldset> Bạn là: <label class="role-option"><input type="radio" name="role" value="candidate|employer">
      <div class="alert alert-error" role="alert">...</div>        (lỗi FE hoặc lỗi API)
      <label for="fullName">Họ và tên</label>        <input id="fullName" required>
      <label for="companyName">Tên công ty</label>   <input id="companyName" required>   (chỉ khi chọn NTD)
      <label for="email">Email</label>               <input id="email" type="email" required>
      <label for="password">Mật khẩu</label>         <PasswordInput id="password" required>
      <label for="confirmPassword">Xác nhận mật khẩu</label> <PasswordInput id="confirmPassword" required>
      <button type="submit">Đăng ký | Đang tạo tài khoản...</button>
      Đã có tài khoản? <a href="/login">Đăng nhập</a>
  Nút ẩn/hiện mật khẩu (PasswordInput.jsx): <button aria-controls="<id ô mật khẩu>">
"""
from __future__ import annotations

import re

from playwright.sync_api import Locator, expect

from pages.base_page import BasePage

ROLE_TITLES = {"candidate": "Ứng viên", "recruiter": "Nhà tuyển dụng"}
ROLE_VALUES = {"candidate": "candidate", "recruiter": "employer"}


class RegisterPage(BasePage):
    PATH = "/register"
    URL_PATTERN = re.compile(r".*/register/?(\?.*)?$")

    def __init__(self, page, settings):
        super().__init__(page, settings)
        # Header cũng có link "Đăng nhập"/"Đăng ký" -> mọi locator scope vào form
        self.form = page.locator("form.auth-card")
        self.heading = self.form.get_by_role("heading", name="Tạo tài khoản", level=1)
        self.full_name_input = self.form.get_by_label("Họ và tên", exact=True)
        self.company_name_input = self.form.get_by_label("Tên công ty", exact=True)
        self.email_input = self.form.get_by_label("Email", exact=True)
        self.password_input = self.form.get_by_label("Mật khẩu", exact=True)
        self.confirm_password_input = self.form.get_by_label("Xác nhận mật khẩu", exact=True)
        self.password_toggle = self.form.locator("button[aria-controls='password']")
        self.confirm_password_toggle = self.form.locator("button[aria-controls='confirmPassword']")
        # Nhãn nút đổi thành "Đang tạo tài khoản..." khi đang gửi -> dùng type=submit
        self.submit_button = self.form.locator("button[type='submit']")
        self.login_link = self.form.get_by_role("link", name="Đăng nhập")
        self.error_alert = self.form.get_by_role("alert")
        self.header = page.get_by_role("banner")
        self.footer = page.get_by_role("contentinfo")

        self.fields: dict[str, Locator] = {
            "full_name": self.full_name_input,
            "company_name": self.company_name_input,
            "email": self.email_input,
            "password": self.password_input,
            "confirm_password": self.confirm_password_input,
        }

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()

    # ---------- Hành động nghiệp vụ ----------
    def role_radio(self, role: str) -> Locator:
        return self.form.locator(f"input[type='radio'][name='role'][value='{ROLE_VALUES[role]}']")

    def select_role(self, role: str) -> None:
        """Chọn "Ứng viên" / "Nhà tuyển dụng" (radio ẩn kiểu visually-hidden -> click vào thẻ label)."""
        self.form.locator("label.role-option", has_text=ROLE_TITLES[role]).click()
        expect(self.role_radio(role)).to_be_checked()
        if role == "recruiter":
            expect(self.company_name_input).to_be_visible()

    def fill_form(self, data: dict) -> None:
        """data: {field_name: value}; field không có trong data thì bỏ qua, "" = để trống."""
        for name, value in data.items():
            if name in self.fields:
                self.fill_field(self.fields[name], value)

    def submit(self) -> None:
        self.submit_button.click()

    def register_and_wait_api(self, data: dict, role: str):
        """Điền form, nhấn Đăng ký và chờ response API đăng ký tương ứng vai trò."""
        path = "/employer/register/" if role == "recruiter" else "/candidate/register/"
        self.fill_form(data)
        with self.page.expect_response(lambda r: path in r.url and r.request.method == "POST") as info:
            self.submit()
        return info.value

    def go_to_login(self) -> None:
        self.login_link.click()

    def wait_submit_outcome(self) -> None:
        """Sau khi nhấn Đăng ký, chờ 1 trong 3 kết quả: trình duyệt chặn (có trường :invalid),
        form hiện thông báo lỗi (role=alert), hoặc đã rời trang /register (đăng ký thành công)."""
        self.page.wait_for_function(
            """() => {
                const form = document.querySelector('form.auth-card');
                return !location.pathname.startsWith('/register')
                    || (form && (form.querySelector('[role=alert]') || form.querySelector(':invalid')));
            }"""
        )

    # ---------- Đọc trạng thái ----------
    @staticmethod
    def validation_message(field: Locator) -> str:
        return field.evaluate("el => el.validationMessage")

    @staticmethod
    def is_value_missing(field: Locator) -> bool:
        return field.evaluate("el => el.validity.valueMissing")

    @staticmethod
    def is_valid(field: Locator) -> bool:
        return field.evaluate("el => el.validity.valid")

    def alert_text(self) -> str:
        return self.error_alert.inner_text() if self.error_alert.count() else ""

    def feedback_for(self, field: Locator) -> str:
        """Gộp thông báo validation của trình duyệt (tại trường) và thông báo lỗi của form."""
        return " | ".join(m for m in (self.validation_message(field), self.alert_text()) if m)

    def access_token(self) -> str | None:
        return self.page.evaluate("() => sessionStorage.getItem('access_token')")

    # ---------- Clipboard ----------
    def write_clipboard(self, text: str) -> None:
        self.page.evaluate("t => navigator.clipboard.writeText(t)", text)

    def paste_into(self, field: Locator) -> None:
        field.focus()
        field.press("ControlOrMeta+v")
