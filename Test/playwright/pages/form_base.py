"""Hành vi dùng chung cho màn hình dạng form (nhập liệu + nút Lưu) và màn hình danh sách có ô tìm kiếm.

Engine test chung (utils/widget_checks.py) chỉ làm việc qua các hàm ở đây, nên mỗi Page Object form chỉ cần
khai báo: form_root, submit_button, WRITE_URL (API ghi), saved() (đọc giá trị đã lưu qua API) và
fill_required() (điền hợp lệ các trường bắt buộc khác).
"""
from __future__ import annotations

import re
from typing import Any

from playwright.sync_api import Locator, Page, Response
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

from pages.base_page import BasePage

# Thời gian chờ request ghi sau khi nhấn Lưu. Hết thời gian mà không có request = form chặn ở phía giao diện.
NO_WRITE_MS = 3000


class FormPage(BasePage):
    WRITE_URL: str = ""                      # chuỗi con của URL API ghi dữ liệu
    WRITE_METHODS: tuple[str, ...] = ("POST", "PUT", "PATCH")

    form_root: Locator
    submit_button: Locator

    # ---------- phần tử
    def field(self, label: str) -> Locator:
        """Ô nhập theo nhãn; nhãn trường bắt buộc có thêm dấu * (span aria-hidden vẫn nằm trong text của label)."""
        return self.form_root.get_by_label(re.compile(rf"^\s*{re.escape(label)}\s*\*?\s*$"))

    @property
    def alerts(self) -> Locator:
        """Thông báo lỗi / thành công của form (role=alert | status)."""
        return self.form_root.locator("[role='alert'], [role='status'], .field-error")

    # ---------- hành động
    def _is_write(self, response: Response) -> bool:
        return self.WRITE_URL in response.url and response.request.method in self.WRITE_METHODS

    def _is_write_request(self, request) -> bool:
        return self.WRITE_URL in request.url and request.method in self.WRITE_METHODS

    def submit(self, timeout_ms: int = NO_WRITE_MS) -> Response | None:
        """Nhấn nút Lưu; trả về response API ghi, hoặc None nếu giao diện chặn (không gửi request).

        Chỉ chờ *request* trong `timeout_ms` (đủ để biết form có gửi hay không); response thì chờ đến khi có
        (một số API chậm, vd. đổi mật khẩu phải băm mật khẩu)."""
        try:
            with self.page.expect_request(self._is_write_request, timeout=timeout_ms) as info:
                self.submit_button.click()
        except PlaywrightTimeoutError:
            return None
        return info.value.response()

    def messages(self) -> str:
        """Toàn bộ thông báo đang hiển thị: validationMessage của trường lỗi + nội dung thông báo của form."""
        invalid = self.form_root.evaluate(
            "root => [...root.querySelectorAll('input,textarea,select')]"
            ".map(e => e.validationMessage).filter(Boolean).join(' | ')"
        )
        shown = " | ".join(t.strip() for t in self.alerts.all_inner_texts() if t.strip())
        return f"{invalid} | {shown}"

    # ---------- override ở Page con
    def saved(self, key: str) -> Any:
        """Giá trị đã lưu của trường `key` (đọc qua API)."""
        raise NotImplementedError

    def fill_required(self, exclude: str = "") -> None:
        """Điền hợp lệ các trường bắt buộc (trừ trường `exclude`) để chỉ trường đang test quyết định kết quả."""


class SearchListPage(BasePage):
    """Màn hình danh sách có ô tìm kiếm."""

    LIST_API: str = ""                       # chuỗi con URL API danh sách (GET)
    search_box: Locator
    empty_state: Locator

    def _is_list(self, response: Response) -> bool:
        return self.LIST_API in response.url and response.request.method == "GET"

    def search(self, keyword: str) -> None:
        """Nhập từ khóa + Enter, chờ danh sách tải lại."""
        self.search_box.fill(keyword)
        try:
            with self.page.expect_response(self._is_list, timeout=NO_WRITE_MS * 2):
                self.search_box.press("Enter")
        except PlaywrightTimeoutError:
            pass  # từ khóa không đổi (vd. toàn space) -> có thể không gọi lại API
        self.wait_results()

    def clear_search(self) -> None:
        try:
            with self.page.expect_response(self._is_list, timeout=NO_WRITE_MS * 2):
                self.search_box.fill("")
                self.search_box.press("Enter")
        except PlaywrightTimeoutError:
            pass
        self.wait_results()

    def wait_results(self) -> None:
        """Chờ danh sách hiển thị xong (không còn skeleton)."""
        from playwright.sync_api import expect

        expect(self.page.locator("[role='status'][aria-label^='Đang tải']")).to_have_count(0)

    def result_keys(self) -> list[str]:
        """Danh sách định danh (tiêu đề) các bản ghi đang hiển thị."""
        raise NotImplementedError

    def has_error(self) -> bool:
        return self.page.get_by_role("heading", name="Không tải được dữ liệu").count() > 0


def page_factory(cls):
    """Screen.page: tạo Page Object từ (page, settings, env)."""

    def _make(page: Page, settings, env):
        po = cls(page, settings)
        po.env = env
        return po

    return _make
