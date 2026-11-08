"""Hàm tiện ích dùng chung."""
from __future__ import annotations

import re
import uuid
from datetime import datetime


def unique_suffix() -> str:
    """Chuỗi duy nhất để tạo dữ liệu không trùng giữa các lần chạy (vd: email, mã KH)."""
    return f"{datetime.now():%Y%m%d%H%M%S}{uuid.uuid4().hex[:4]}"


def unique_email(prefix: str = "auto", domain: str = "example.com") -> str:
    return f"{prefix}.{unique_suffix()}@{domain}"


def safe_filename(name: str) -> str:
    """Chuyển node id của pytest thành tên file hợp lệ."""
    return re.sub(r"[^\w.-]+", "_", name)[:150]
