"""Fixture dùng chung cho các test màn hình Đăng nhập."""
import pytest

from pages.login_page import LoginPage
from utils.data_loader import load_test_data


@pytest.fixture(scope="session")
def login_data() -> dict:
    return load_test_data("login.json")


@pytest.fixture
def login_page(driver, settings, network) -> LoginPage:
    """Mở sẵn màn hình Đăng nhập (chưa đăng nhập – mỗi test có trình duyệt mới)."""
    return LoginPage(driver, settings, network).open()
