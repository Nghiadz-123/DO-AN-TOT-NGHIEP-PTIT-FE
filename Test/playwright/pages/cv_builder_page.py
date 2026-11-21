"""Page Object màn hình "Tạo CV" (route /create-cv).

Locator lấy từ FE/frontend/src/pages/Candidate/CVBuilderPage.jsx:
  <h1>Tạo CV của bạn</h1>
  <button>Tải CV dạng PDF</button> (window.print)   <button>Lưu CV | Đang lưu…</button>
  thông báo: <div class="alert alert-success" role="status"> | <div class="alert alert-error" role="alert">
  đang tải: <div class="loading" role="status">Đang tải CV đã lưu…</div>
  <form class="cv-builder-form"><fieldset>
    Field: <label class="form-group cv-builder-field"><span>{label}</span><input|textarea placeholder></label>
      (input nằm TRONG label nên tên truy cập của input gồm cả giá trị đang nhập -> locator theo <span> nhãn)
    Kinh nghiệm: <div class="cv-repeat-item"><strong>Kinh nghiệm {n}</strong>
       <button aria-label="Xóa kinh nghiệm {n}"> ... <button>Thêm kinh nghiệm</button>   (tương tự Học vấn)
  <aside aria-label="Xem trước CV"><article class="cv-paper">
       <h1>{fullName}</h1><p>{title}</p> section h2 GIỚI THIỆU / KINH NGHIỆM LÀM VIỆC / HỌC VẤN / KỸ NĂNG / DỰ ÁN
       .cv-skill-list span | .cv-preview-empty <strong>CV của bạn đang dần hoàn thiện</strong>
"""
from __future__ import annotations

import re

from playwright.sync_api import Locator, expect

from pages.base_page import BasePage
from pages.components import AppShell


class CVBuilderPage(BasePage):
    PATH = "/create-cv"
    URL_PATTERN = re.compile(r".*/create-cv/?(\?.*)?$")

    def __init__(self, page, settings):
        super().__init__(page, settings)
        self.shell = AppShell(page)
        self.heading = page.get_by_role("heading", name="Tạo CV của bạn", level=1)
        self.print_button = page.get_by_role("button", name="Tải CV dạng PDF")
        self.save_button = page.locator(".cv-builder-heading .btn-primary")
        self.success_alert = page.locator(".alert-success[role='status']")
        self.error_alert = page.locator(".alert-error[role='alert']")
        self.loading = page.get_by_role("status").filter(has_text="Đang tải CV đã lưu")
        self.form = page.locator("form.cv-builder-form")
        self.add_experience_button = self.form.get_by_role("button", name="Thêm kinh nghiệm")
        self.add_education_button = self.form.get_by_role("button", name="Thêm học vấn")
        self.preview = page.get_by_role("complementary", name="Xem trước CV")
        self.paper = self.preview.locator("article.cv-paper")
        self.preview_name = self.paper.locator("header h1")
        self.preview_title = self.paper.locator("header p")
        self.preview_contact = self.paper.locator(".cv-contact")
        self.preview_skills = self.paper.locator(".cv-skill-list span")
        self.preview_empty = self.paper.locator(".cv-preview-empty")

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()
        self.wait_ready()

    def wait_ready(self) -> None:
        """Chờ tải xong nội dung đã lưu (form bị khóa trong lúc tải)."""
        expect(self.loading).to_be_hidden()
        expect(self.save_button).to_be_enabled()

    # ---------- Trường nhập ----------
    def _field_in(self, scope: Locator, label: str) -> Locator:
        group = scope.locator("label.cv-builder-field").filter(has=self.page.get_by_text(label, exact=True))
        return group.locator("input, textarea")

    def field(self, label: str) -> Locator:
        """Trường ở các mục không lặp (Thông tin cá nhân, Giới thiệu, Kỹ năng & dự án) – nhãn là duy nhất."""
        return self._field_in(self.form, label)

    def field_label(self, label: str) -> Locator:
        return self.form.locator("label.cv-builder-field > span").get_by_text(label, exact=True)

    def experience(self, n: int) -> Locator:
        return self.form.locator(".cv-repeat-item").filter(has=self.page.get_by_text(f"Kinh nghiệm {n}", exact=True))

    def education(self, n: int) -> Locator:
        return self.form.locator(".cv-repeat-item").filter(has=self.page.get_by_text(f"Học vấn {n}", exact=True))

    def item_field(self, item: Locator, label: str) -> Locator:
        return self._field_in(item, label)

    def remove_experience_button(self, n: int) -> Locator:
        return self.form.get_by_role("button", name=f"Xóa kinh nghiệm {n}", exact=True)

    def remove_education_button(self, n: int) -> Locator:
        return self.form.get_by_role("button", name=f"Xóa học vấn {n}", exact=True)

    def preview_section(self, heading: str) -> Locator:
        return self.paper.locator("section.cv-paper-section").filter(
            has=self.page.get_by_role("heading", name=heading, exact=True)
        )

    # ---------- Hành động ----------
    def fill_cv(self, data: dict) -> None:
        """data theo test_data/cv.json > builder_full (khóa bỏ trống thì bỏ qua)."""
        simple = {
            "fullName": "Họ và tên", "title": "Vị trí ứng tuyển", "email": "Email", "phone": "Số điện thoại",
            "location": "Địa điểm", "summary": "Tóm tắt nghề nghiệp", "skills": "Kỹ năng", "projects": "Dự án tiêu biểu",
        }
        for key, label in simple.items():
            if key in data:
                self.field(label).fill(data[key])
        for i, exp in enumerate(data.get("experiences", []), start=1):
            if i > 1:
                self.add_experience_button.click()
            item = self.experience(i)
            for key, label in (("role", "Chức danh"), ("company", "Công ty"), ("period", "Thời gian"),
                               ("description", "Mô tả công việc và thành tựu")):
                self.item_field(item, label).fill(exp.get(key, ""))
        for i, edu in enumerate(data.get("educations", []), start=1):
            if i > 1:
                self.add_education_button.click()
            item = self.education(i)
            for key, label in (("degree", "Bằng cấp / chuyên ngành"), ("school", "Trường học"), ("period", "Thời gian"),
                               ("description", "Mô tả thêm")):
                self.item_field(item, label).fill(edu.get(key, ""))

    def save(self):
        """Nhấn Lưu CV và chờ response PUT /candidate/cv-builder/ (None nếu không có request nào được gửi)."""
        with self.page.expect_response(lambda r: "/candidate/cv-builder/" in r.url and r.request.method == "PUT") as info:
            self.save_button.click()
        return info.value

    def save_requests_after_click(self) -> int:
        """Nhấn Lưu CV, đếm số request lưu gửi đi (dùng khi mong đợi KHÔNG lưu)."""
        sent: list = []
        handler = lambda r: sent.append(r) if "/candidate/cv-builder/" in r.url and r.method == "PUT" else None  # noqa: E731
        self.page.on("request", handler)
        self.save_button.click()
        # Chờ phản hồi của giao diện (thông báo hoặc focus) thay vì sleep
        self.page.wait_for_load_state("networkidle")
        self.page.remove_listener("request", handler)
        return len(sent)

    def stub_print(self) -> None:
        """Thay window.print bằng hàm đếm số lần gọi (hộp thoại in không điều khiển được trong headless)."""
        self.page.evaluate("() => { window.__printCalls = 0; window.print = () => { window.__printCalls += 1 } }")

    def print_calls(self) -> int:
        return self.page.evaluate("() => window.__printCalls || 0")
