"""Dữ liệu form Đăng ký hợp lệ, dùng chung cho test UI và function."""
from __future__ import annotations

from utils.data_loader import load_test_data
from utils.helpers import unique_email


def valid_register_form(role: str, **override) -> dict:
    """Bộ dữ liệu đăng ký hợp lệ với email duy nhất; override để thay 1 trường (vd email="")."""
    password = load_test_data("register.json")["valid_password"]
    form = {
        "full_name": "Nguyễn Văn Kiểm Thử",
        "email": unique_email("auto.reg"),
        "password": password,
        "confirm_password": password,
    }
    if role == "recruiter":
        form["company_name"] = "Công ty TNHH Kiểm Thử Tự Động"
    form.update(override)
    return form
