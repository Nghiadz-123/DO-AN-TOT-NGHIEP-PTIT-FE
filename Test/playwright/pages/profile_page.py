"""Page Object màn hình "Hồ sơ cá nhân" của ứng viên (/profile).

Nguồn DOM: FE/frontend/src/pages/Candidate/ProfilePage.jsx, components/common/ChangePasswordForm.jsx,
PasswordInput.jsx
  <h1>Hồ sơ cá nhân</h1> <p>{email}</p>
  Form hồ sơ (form.card thứ 1): label[for] + input#fullName (required, maxLength 150), #phone (tel, maxLength 20),
    #dateOfBirth (date), select#gender, #headline (maxLength 255), #address, textarea#summary, #desiredPosition,
    select#locationId | #type | #workMode | #level, number #yearsOfExperience (0..50, step 0.5),
    #salaryMin, #salaryMax (min 0, step 0.5), switch "Đang tìm việc", link "CV của tôi", button "Lưu thay đổi"
    -> PATCH /candidate/profile/ ; thông báo .alert role=status "Đã lưu thông tin hồ sơ." | role=alert lỗi
  Form đổi mật khẩu (form.card có h2 "Đổi mật khẩu"): #currentPassword, #newPassword, #confirmPassword
    (nút "Hiện mật khẩu"/"Ẩn mật khẩu"), button "Đổi mật khẩu" -> POST /auth/change-password/
"""
from __future__ import annotations

import re

from playwright.sync_api import Locator, Page, expect

from pages.components import AppShell
from pages.form_base import FormPage

# Trường hồ sơ -> khóa trong response GET /candidate/profile/
PROFILE_KEYS = {
    "fullName": "full_name", "phone": "phone", "headline": "headline", "address": "address", "summary": "summary",
    "desiredPosition": "desired_position", "dateOfBirth": "date_of_birth", "gender": "gender",
    "locationId": "location", "type": "desired_job_type", "workMode": "desired_work_mode", "level": "current_level",
    "yearsOfExperience": "years_of_experience", "salaryMin": "desired_salary_min", "salaryMax": "desired_salary_max",
    "isOpenToWork": "is_open_to_work",
}


class ProfilePage(FormPage):
    PATH = "/profile"
    URL_PATTERN = re.compile(r"/profile/?(\?.*)?$")
    WRITE_URL = "/candidate/profile/"
    WRITE_METHODS = ("PATCH",)

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.shell = AppShell(page)
        self.heading = page.get_by_role("heading", name="Hồ sơ cá nhân", level=1)
        self.loading = page.get_by_role("status", name="Đang tải hồ sơ")
        self.form_root = page.locator("main form").filter(has=page.locator("#fullName"))
        self.submit_button = self.form_root.get_by_role("button", name=re.compile("Lưu thay đổi|Đang lưu"))
        self.success = self.form_root.get_by_role("status").filter(has_text="Đã lưu thông tin hồ sơ.")
        self.open_to_work = self.form_root.get_by_role("switch", name="Đang tìm việc")
        self.cv_link = self.form_root.get_by_role("link", name="CV của tôi")
        self.password = ChangePasswordSection(page)

    def open(self, **_):
        super().open()
        return self

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()
        expect(self.loading).to_have_count(0)
        expect(self.form_root).to_be_visible()

    # ---------- dữ liệu đã lưu
    def saved(self, key: str):
        resp = self.env.client.get("candidate/profile/")
        assert resp.ok, f"Lấy hồ sơ: {resp.status}"
        value = resp.json().get(PROFILE_KEYS.get(key, key))
        return "" if value is None and key in ("phone", "headline", "address", "summary", "desiredPosition") else value

    def fill_required(self, exclude: str = "") -> None:
        if exclude != "Họ và tên" and not self.field("Họ và tên").input_value().strip():
            self.field("Họ và tên").fill("Auto Profile Tester")


class ChangePasswordSection(FormPage):
    """Form "Đổi mật khẩu" (dùng chung trang hồ sơ ứng viên và tài khoản NTD)."""

    WRITE_URL = "/auth/change-password/"
    WRITE_METHODS = ("POST",)

    def __init__(self, page: Page, settings=None):
        super().__init__(page, settings)
        self.form_root = page.locator("form").filter(has=page.get_by_role("heading", name="Đổi mật khẩu"))
        self.title = self.form_root.get_by_role("heading", name="Đổi mật khẩu")
        self.current = self.form_root.locator("#currentPassword")
        self.new = self.form_root.locator("#newPassword")
        self.confirm = self.form_root.locator("#confirmPassword")
        self.submit_button = self.form_root.get_by_role("button", name=re.compile("^(Đổi mật khẩu|Đang lưu...)$"))
        self.hint = self.form_root.locator("#newPassword-hint")

    def toggle(self, field_id: str) -> Locator:
        return self.form_root.locator(f"button.password-toggle[aria-controls='{field_id}']")

    def change(self, current: str, new: str, confirm: str | None = None):
        self.current.fill(current)
        self.new.fill(new)
        self.confirm.fill(new if confirm is None else confirm)
        return self.submit()

    def submit(self, timeout_ms: int = 3000):
        # Kiểm tra 1 trong 2 ô mật khẩu mới: ô còn lại nhập y hệt để chỉ trường đang test quyết định kết quả
        exclude = getattr(self, "_exclude", "")
        if exclude == "Mật khẩu mới":
            self.confirm.fill(self.new.input_value())
        elif exclude == "Xác nhận mật khẩu mới":
            self.new.fill(self.confirm.input_value())
        self._sent = {"current": self.current.input_value(), "new": self.new.input_value()}
        self._last = super().submit(timeout_ms)
        return self._last

    def saved(self, key: str):
        """Giá trị mật khẩu đã lưu, suy ra bằng đăng nhập API (mật khẩu không đọc lại được).
        key = "new": mật khẩu đăng nhập được sau khi đổi (bản đã trim hay nguyên văn); "current": bản được chấp nhận."""
        sent = getattr(self, "_sent", None)
        last = getattr(self, "_last", None)
        if not sent or last is None or not last.ok:
            return None
        if key == "current":
            return sent["current"].strip()
        api = self.env.fixtures("api_request")
        raw, stripped = sent["new"], sent["new"].strip()
        ok = api.post("auth/login/", data={"email": self.env.client.email, "password": stripped}).ok
        return stripped if ok else raw

    def fill_required(self, exclude: str = "") -> None:
        self._exclude = exclude
        env = getattr(self, "env", None)
        values = {
            "Mật khẩu hiện tại": (self.current, env.client.password if env else ""),
            "Mật khẩu mới": (self.new, "NewAuto@12345"),
            "Xác nhận mật khẩu mới": (self.confirm, "NewAuto@12345"),
        }
        for label, (loc, value) in values.items():
            if label != exclude:
                loc.fill(value)
