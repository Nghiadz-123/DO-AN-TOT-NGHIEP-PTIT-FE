"""Fixture dùng chung cho các test màn hình Đăng nhập / Đăng ký."""
import pytest
from playwright.sync_api import Page

from pages.login_page import LoginPage
from pages.register_page import RegisterPage
from utils.data_loader import load_test_data


@pytest.fixture
def open_register(page: Page, settings):
    """Mở màn hình Đăng ký và chọn vai trò: open_register("candidate" | "recruiter")."""

    def _open(role: str) -> RegisterPage:
        reg = RegisterPage(page, settings).open()
        if role == "recruiter":
            reg.select_role("recruiter")
        return reg

    return _open


@pytest.fixture(scope="session")
def login_data() -> dict:
    return load_test_data("login.json")


@pytest.fixture
def login_page(page: Page, settings) -> LoginPage:
    """Mở sẵn màn hình Đăng nhập (chưa đăng nhập – mỗi test có browser context mới)."""
    return LoginPage(page, settings).open()
