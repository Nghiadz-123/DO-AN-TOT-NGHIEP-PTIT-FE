"""Tiện ích cho TC của tính năng mà giao diện hiện chưa có (theo source FE).

Theo nguyên tắc không sửa kỳ vọng để test xanh: TC vẫn được tự động hóa theo Kết quả mong muốn; bước đầu tiên
xác nhận thành phần mà tài liệu mô tả có trên màn hình. Nếu không có -> FAIL với thông điệp "Thiếu tính năng"
(lỗi của ứng dụng so với tài liệu, không phải lỗi script).
"""
from __future__ import annotations

import pytest
from playwright.sync_api import Locator


def require(locator: Locator, what: str, timeout_ms: int = 3000) -> Locator:
    """Chờ thành phần xuất hiện; không có -> fail 'Thiếu tính năng: ...'."""
    try:
        locator.first.wait_for(state="visible", timeout=timeout_ms)
    except Exception:
        pytest.fail(f"Thiếu tính năng theo tài liệu: {what} (không tìm thấy trên màn hình)", pytrace=False)
    return locator.first
