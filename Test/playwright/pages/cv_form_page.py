"""Page Object màn hình "Tải CV mới" (/cv/new) và "Chỉnh sửa CV" (/cv/{id}/edit).

Locator lấy từ FE/frontend/src/pages/Candidate/CVFormPage.jsx:
  <h1>Tải CV mới | Chỉnh sửa CV</h1>
  UploadForm <form class="card">
    ErrorAlert: <div class="alert alert-error" role="alert">
    <div role="group" aria-labelledby="cv-file-label"><span id="cv-file-label">File CV<span class="required-mark">*</span>
       FileDropzone (hint "PDF, DOCX · tối đa 5MB") | FileCard <div class="file-card"><strong>{name}</strong>
       <small>{size} · Sẵn sàng tải lên</small><button>Chọn file khác</button>
       lỗi file: <p class="field-error" role="alert">
    <label for="title">Tên CV</label><input id="title" maxLength=150 placeholder="VD: CV Nhân viên kinh doanh 2026">
    <label class="checkbox"><input type="checkbox"> Đặt làm CV chính</label>
    UploadProgress: role="progressbar" aria-label="Tiến độ tải file" + "Đang tải file lên... X%" / "Đang đọc nội dung CV..."
    <button>Hủy</button> <button type="submit">Tải CV lên | Đang tải lên...</button>
  EditForm: FileCard, ParseInfo (Badge trạng thái, gợi ý email/SĐT), <button>Đọc lại nội dung CV</button>,
    <input id="title" required maxLength=150>, Badge "Đang là CV chính", <button type="submit">Lưu thay đổi</button>

Phần tử theo tài liệu nhưng FE CHƯA CÓ (locator theo nhãn trong KBKTCN, cần xác nhận khi FE bổ sung):
  - Thông báo "CV sẽ được xử lý bằng AI", checkbox "Đồng ý xử lý dữ liệu bằng AI" (Candidate_42, 79..81, 86)
"""
from __future__ import annotations

import re

from playwright.sync_api import expect

from pages.base_page import BasePage
from pages.components import AppShell, FileDropzone
from utils.cv_files import CvFile


class CVUploadPage(BasePage):
    PATH = "/cv/new"
    URL_PATTERN = re.compile(r".*/cv/new/?(\?.*)?$")

    def __init__(self, page, settings):
        super().__init__(page, settings)
        self.shell = AppShell(page)
        self.heading = page.get_by_role("heading", name="Tải CV mới", level=1)
        self.form = page.locator("main form.card")
        self.file_group = self.form.get_by_role("group", name="File CV")
        self.file_label = page.locator("#cv-file-label")
        self.dropzone = FileDropzone(self.file_group, page)
        self.dropzone_hint = self.file_group.locator(".dropzone-hint")
        self.file_card = self.file_group.locator(".file-card")
        self.file_card_name = self.file_card.locator("strong")
        self.file_card_note = self.file_card.locator("small")
        self.change_file_button = self.file_group.get_by_role("button", name="Chọn file khác")
        self.file_error = self.file_group.get_by_role("alert")
        self.form_error = self.form.locator(".alert-error[role='alert']")
        self.title_input = self.form.get_by_label("Tên CV")
        self.default_checkbox = self.form.get_by_label("Đặt làm CV chính")
        # TODO(locator): FE chưa có – nhãn lấy theo KBKTCN, cần DOM để xác nhận khi FE bổ sung
        self.ai_consent_checkbox = self.form.get_by_role("checkbox", name=re.compile("Đồng ý xử lý dữ liệu bằng AI"))
        self.ai_notice = self.form.get_by_text(re.compile("xử lý bằng AI"))
        self.progressbar = page.get_by_role("progressbar", name="Tiến độ tải file")
        self.progress_text = page.locator(".upload-progress small")
        self.cancel_button = self.form.get_by_role("button", name="Hủy", exact=True)
        self.submit_button = self.form.locator("button[type='submit']")

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()

    def choose_file(self, file: CvFile) -> None:
        self.dropzone.choose(file)

    def submit(self) -> None:
        self.submit_button.click()

    def submit_and_wait(self):
        """Nhấn Tải CV lên và chờ response POST /candidate/cvs/."""
        with self.page.expect_response(
            lambda r: r.url.rstrip("/").endswith("/candidate/cvs") and r.request.method == "POST"
        ) as info:
            self.submit()
        return info.value

    def upload(self, file: CvFile, title: str | None = None):
        self.choose_file(file)
        expect(self.file_card).to_be_visible()
        if title is not None:
            self.title_input.fill(title)
        return self.submit_and_wait()


class CVEditPage(BasePage):
    PATH_TEMPLATE = "/cv/{id}/edit"
    URL_PATTERN = re.compile(r".*/cv/[0-9a-f-]+/edit/?$")

    def __init__(self, page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", name="Chỉnh sửa CV", level=1)
        self.form = page.locator("main form.card")
        self.title_input = self.form.get_by_label("Tên CV")
        self.parse_badge = self.form.locator(".form-group").filter(has_text="Nội dung CV").locator(".badge")
        self.contact_hint = self.form.locator(".form-group").filter(has_text="Nội dung CV").locator(".field-hint")
        self.reparse_button = self.form.get_by_role("button", name="Đọc lại nội dung CV")
        self.default_badge = self.form.locator(".badge").filter(has_text="Đang là CV chính")
        self.save_button = self.form.locator("button[type='submit']")
        self.form_error = self.form.locator(".alert-error[role='alert']")
        self.load_error = page.get_by_role("alert").filter(has=page.get_by_role("heading", name="Không tải được dữ liệu"))

    def open_cv(self, cv_id: str):
        self.page.goto(f"{self.settings.base_url}{self.PATH_TEMPLATE.format(id=cv_id)}", wait_until="domcontentloaded")
        expect(self.heading.or_(self.load_error)).to_be_visible()
        return self

    def rename(self, title: str):
        self.title_input.fill(title)
        with self.page.expect_response(lambda r: "/candidate/cvs/" in r.url and r.request.method == "PATCH") as info:
            self.save_button.click()
        return info.value
