"""Component dùng chung giữa nhiều màn hình.

Nguồn DOM:
  FE/frontend/src/components/common/Modal.jsx + ConfirmDialog.jsx
    <div role="dialog" aria-modal aria-labelledby><h2>{title}</h2><button aria-label="Đóng">
    footer: <button>Hủy</button> <button class="btn-danger">{confirmLabel}</button>
  FE/frontend/src/components/common/ErrorState.jsx
    <div class="empty-state" role="alert"><h2>Không tải được dữ liệu</h2> ... <button>Thử lại</button>
  FE/frontend/src/components/common/FileDropzone.jsx
    <label class="dropzone"><input type="file" class="visually-hidden" accept> ... "chọn file từ máy" <span>{hint}</span>
"""
from __future__ import annotations

from playwright.sync_api import Locator, Page

from utils.cv_files import CvFile


class ConfirmDialog:
    def __init__(self, page: Page):
        self.root = page.get_by_role("dialog")
        self.title = self.root.get_by_role("heading", level=2)
        self.close_icon = self.root.get_by_role("button", name="Đóng", exact=True)
        self.cancel_button = self.root.get_by_role("button", name="Hủy", exact=True)

    def confirm_button(self, label: str) -> Locator:
        return self.root.get_by_role("button", name=label, exact=True)


class ErrorState:
    def __init__(self, page: Page):
        self.root = page.get_by_role("alert").filter(has=page.get_by_role("heading", name="Không tải được dữ liệu"))
        self.retry_button = self.root.get_by_role("button", name="Thử lại")


class FileDropzone:
    def __init__(self, scope: Page | Locator, page: Page):
        self.page = page
        self.root = scope.locator("label.dropzone")
        # input ẩn bằng visually-hidden (không display:none) -> set_input_files trực tiếp
        self.input = self.root.locator("input[type='file']")
        self.choose_link = self.root.get_by_text("chọn file từ máy", exact=True)

    def choose(self, file: CvFile) -> None:
        self.input.set_input_files(file.payload())

    def drop(self, file: CvFile) -> None:
        """Kéo thả file: tạo DataTransfer trong trang rồi phát sự kiện dragover + drop vào vùng tải."""
        data = self.page.evaluate_handle(
            """([name, mime, bytes]) => {
                 const dt = new DataTransfer();
                 dt.items.add(new File([new Uint8Array(bytes)], name, { type: mime }));
                 return dt;
               }""",
            [file.name, file.mime, list(file.content)],
        )
        self.root.dispatch_event("dragover", {"dataTransfer": data})
        self.root.dispatch_event("drop", {"dataTransfer": data})

    def cancel_chooser(self) -> None:
        """Mở hộp thoại chọn file rồi nhấn Cancel (không chọn file nào)."""
        with self.page.expect_file_chooser() as fc:
            self.choose_link.click()
        fc.value.set_files([])


class AppShell:
    """Header / footer của MainLayout."""

    def __init__(self, page: Page):
        self.header = page.get_by_role("banner")
        self.footer = page.get_by_role("contentinfo")
        self.main = page.locator("main#main-content")
