"""Page Object màn hình "CV của tôi" (route /cv).

Locator lấy từ FE/frontend/src/pages/Candidate/ManageCVsPage.jsx:
  <h1>CV của tôi</h1><p>Quản lý các CV ...</p>
  <a href="/create-cv">Tạo CV</a> <a href="/cv/new">Tải CV mới</a>
  flash: <div class="alert alert-success" role="status">     lỗi thao tác: <div class="alert alert-error" role="alert">
  skeleton: role="status" aria-label="Đang tải danh sách CV"
  <section class="public-cv-panel"><h2 id="public-cv-title">Công khai CV cho nhà tuyển dụng</h2>
     <input type="checkbox" role="switch" aria-labelledby="public-cv-title"><span class="switch-text">Đang bật|Đang tắt</span>
     (chỉ hiển thị khi đã có CV chính)
  <ul aria-label="Danh sách CV"><li class="card cv-card">
     <a class="cv-card-name" href="/cv/{id}/edit">{title}</a> Badge "CV chính" / "Đang công khai"
     <p class="cv-card-meta">{fileName} · {size} · Cập nhật {date}</p>
     Badge trạng thái bóc tách | "Chưa dùng để ứng tuyển" | link "Đã dùng cho N đơn"
     <a href="/cv-analysis?cvId=..">Xem điểm AI | Chấm điểm AI</a>
     <button>Xem</button> <button aria-label="Thao tác khác với CV {title}"> -> .dropdown-menu
        Tải về (button) | Sửa thông tin (link) | Đặt làm CV chính (button, ẩn với CV chính) | Xóa CV (button, ẩn khi CV đã dùng)
  Xem trước: <section aria-labelledby="cv-preview-title"> <iframe title="Xem CV {title}"> hoặc
             <div class="cv-viewer-docx" aria-label="Xem CV {title}"> + lỗi "Không hiển thị được file DOCX..."
  EmptyState: <h2>Bạn chưa có CV nào</h2>
"""
from __future__ import annotations

import re

from playwright.sync_api import Locator, expect

from pages.base_page import BasePage
from pages.components import AppShell, ConfirmDialog, ErrorState


class CVListPage(BasePage):
    PATH = "/cv"
    URL_PATTERN = re.compile(r".*/cv/?(\?.*)?$")

    def __init__(self, page, settings):
        super().__init__(page, settings)
        self.shell = AppShell(page)
        self.heading = page.get_by_role("heading", name="CV của tôi", level=1)
        self.description = page.locator(".page-header p.text-muted")
        # Header chính cũng có link "Tạo CV" -> scope vào phần đầu trang của nội dung chính
        self.page_header = page.locator("main .page-header")
        self.create_button = self.page_header.get_by_role("link", name="Tạo CV", exact=True)
        self.upload_button = self.page_header.get_by_role("link", name="Tải CV mới", exact=True)
        self.flash = page.locator(".alert-success[role='status']")
        self.action_error = page.locator(".alert-error[role='alert']")
        self.skeleton = page.get_by_role("status", name="Đang tải danh sách CV")
        self.error_state = ErrorState(page)
        self.public_switch = page.get_by_role("switch", name="Công khai CV cho nhà tuyển dụng")
        self.public_switch_text = page.locator(".public-cv-panel .switch-text")
        self.cv_list = page.get_by_role("list", name="Danh sách CV")
        self.cards = self.cv_list.locator("> li")
        self.empty_title = page.get_by_role("heading", name="Bạn chưa có CV nào")
        self.empty_state = page.locator(".empty-state").filter(has=self.empty_title)
        self.dialog = ConfirmDialog(page)

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()

    def wait_list_ready(self) -> None:
        """Chờ tải xong danh sách (hiện danh sách hoặc trạng thái trống)."""
        expect(self.cv_list.or_(self.empty_title)).to_be_visible()

    # ---------- Một thẻ CV ----------
    def card(self, title: str) -> Locator:
        return self.cards.filter(has=self.page.get_by_role("link", name=title, exact=True))

    def card_title_link(self, title: str) -> Locator:
        return self.card(title).get_by_role("link", name=title, exact=True)

    def card_badge(self, title: str, text: str) -> Locator:
        return self.card(title).locator(".badge").filter(has_text=text)

    def card_meta(self, title: str) -> Locator:
        return self.card(title).locator(".cv-card-meta")

    def score_link(self, title: str) -> Locator:
        return self.card(title).get_by_role("link", name=re.compile(r"^(Xem điểm AI|Chấm điểm AI)$"))

    def view_button(self, title: str) -> Locator:
        return self.card(title).get_by_role("button", name="Xem", exact=True)

    def menu_button(self, title: str) -> Locator:
        return self.page.get_by_role("button", name=f"Thao tác khác với CV {title}", exact=True)

    def menu(self, title: str) -> Locator:
        return self.card(title).locator(".dropdown-menu")

    def menu_item(self, title: str, label: str) -> Locator:
        # Mục menu là <button> hoặc <a> (Sửa thông tin) cùng class dropdown-item
        return self.menu(title).locator(".dropdown-item").filter(has_text=re.compile(rf"^\s*{re.escape(label)}\s*$"))

    def card_titles(self) -> list[str]:
        return [t.strip() for t in self.cv_list.locator(".cv-card-name").all_inner_texts()]

    # ---------- Hành động ----------
    def open_menu(self, title: str) -> Locator:
        self.menu_button(title).click()
        expect(self.menu(title)).to_be_visible()
        return self.menu(title)

    def choose_menu(self, title: str, label: str) -> None:
        self.open_menu(title)
        self.menu_item(title, label).click()

    def download(self, title: str):
        """Chọn Tải về trong menu; trả về Download của Playwright."""
        self.open_menu(title)
        with self.page.expect_download() as info:
            self.menu_item(title, "Tải về").click()
        return info.value

    def set_default(self, title: str) -> None:
        with self.page.expect_response(lambda r: "/set-default/" in r.url and r.request.method == "POST"):
            self.choose_menu(title, "Đặt làm CV chính")
        expect(self.card_badge(title, "CV chính")).to_be_visible()

    def request_delete(self, title: str) -> None:
        self.choose_menu(title, "Xóa CV")
        expect(self.dialog.root).to_be_visible()

    def delete(self, title: str) -> None:
        self.request_delete(title)
        with self.page.expect_response(lambda r: "/candidate/cvs/" in r.url and r.request.method == "DELETE"):
            self.dialog.confirm_button("Xóa CV").click()

    def toggle_public(self) -> None:
        with self.page.expect_response(lambda r: "/candidate/profile/" in r.url and r.request.method == "PATCH"):
            self.public_switch.click()

    # ---------- Xem trước ----------
    def preview_region(self, title: str) -> Locator:
        return self.page.get_by_role("region", name=title, exact=True)

    def pdf_frame(self, title: str) -> Locator:
        return self.page.locator(f"iframe[title='Xem CV {title}']")

    def docx_viewer(self, title: str) -> Locator:
        return self.page.get_by_label(f"Xem CV {title}", exact=True)
