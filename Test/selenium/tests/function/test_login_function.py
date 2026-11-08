"""Function test màn hình Đăng nhập (Selenium) – Login_49 .. Login_57.

Nguồn: FE/Test/KBKTCN_ATS_WEB_v1.0.xlsx, sheet "Đăng nhập, Đăng ký".
Backend giới hạn 20 request/phút cho nhóm API auth -> đã điều tiết tự động (utils/rate_limit.py).
"""
import re

import pytest

from pages.login_page import LoginPage
from utils.auth_api import change_password, register_candidate
from utils.data_loader import load_test_data
from utils.expect import expect, expect_page
from utils.helpers import unique_email

DATA = load_test_data("login.json")
MSG = DATA["messages"]
L = LoginPage

pytestmark = [pytest.mark.function, pytest.mark.login]


def _home_url(settings, path: str) -> re.Pattern:
    return re.compile(rf"^{re.escape(settings.base_url)}{re.escape(path.rstrip('/'))}/?$")


def _assert_login_failed(login_page: LoginPage) -> None:
    expect_page(login_page.driver, "Đăng nhập thất bại phải ở lại màn hình Đăng nhập").to_have_url(
        LoginPage.URL_PATTERN
    )
    assert not login_page.access_token(), "Không được lưu access token khi đăng nhập thất bại"


# ---------------------------------------------------------------- tiền điều kiện đổi mật khẩu
@pytest.fixture(scope="module")
def changed_password_account(settings, auth_limiter):
    """Tạo tài khoản ứng viên mới qua API rồi đổi mật khẩu (tiền điều kiện Login_50, Login_51)."""
    pw = DATA["change_password"]
    email = unique_email("auto.login")
    session = register_candidate(settings.api_url, auth_limiter, email, pw["old_password"], "Auto Login Test")
    change_password(settings.api_url, session["access"], pw["old_password"], pw["new_password"])
    return {"email": email, **pw}


# ---------------------------------------------------------------- Đăng nhập thành công
@pytest.mark.smoke
@pytest.mark.parametrize("case", DATA["role_home"], ids=[f"Login_49-{c['role']}" for c in DATA["role_home"]])
def test_login_49_valid_credentials(login_page: LoginPage, accounts, settings, case, record_testcase):
    """Login_49 - Tài khoản + mật khẩu đúng -> đăng nhập thành công, tới Trang chủ theo vai trò.

    Ứng viên -> "/", Nhà tuyển dụng -> "/recruiter", Admin -> "/admin" (LoginPage.jsx: homeOf).
    """
    record_testcase(case["tc_id"])
    acc = accounts(case["role"])

    response = login_page.login_and_wait_api(acc["email"], acc["password"])

    assert response.status == 200, f"API đăng nhập trả {response.status}: {response.text()}"
    expect_page(login_page.driver).to_have_url(_home_url(settings, case["path"]))
    assert login_page.access_token(), "Chưa lưu access token sau khi đăng nhập"


@pytest.mark.testcase("Login_50")
def test_login_50_old_password_after_change(login_page: LoginPage, changed_password_account):
    """Login_50 - Sau khi đổi mật khẩu, đăng nhập bằng mật khẩu cũ -> thất bại + thông báo lỗi."""
    acc = changed_password_account
    login_page.login_and_wait_api(acc["email"], acc["old_password"])

    _assert_login_failed(login_page)
    expect(login_page.driver, L.ERROR_ALERT).to_have_text(MSG["invalid_credentials"])


@pytest.mark.testcase("Login_51")
def test_login_51_new_password_after_change(login_page: LoginPage, changed_password_account, settings):
    """Login_51 - Sau khi đổi mật khẩu, đăng nhập bằng mật khẩu mới -> thành công."""
    acc = changed_password_account
    response = login_page.login_and_wait_api(acc["email"], acc["new_password"])

    assert response.status == 200, f"API đăng nhập trả {response.status}: {response.text()}"
    expect_page(login_page.driver).to_have_url(_home_url(settings, "/"))


# ---------------------------------------------------------------- Sai thông tin
WRONG_CASES = [
    ("Login_52", "wrong_email", "valid_password"),
    ("Login_53", "valid_email", "wrong_password"),
    ("Login_54", "wrong_email", "wrong_password"),
]


@pytest.mark.parametrize("tc_id,email_kind,password_kind", WRONG_CASES, ids=[c[0] for c in WRONG_CASES])
def test_login_wrong_credentials(login_page: LoginPage, accounts, tc_id, email_kind, password_kind, record_testcase):
    """Login_52..54 - Sai tài khoản và/hoặc mật khẩu -> thông báo lỗi, đăng nhập không thành công."""
    record_testcase(tc_id)
    acc = accounts("candidate")
    email = DATA["wrong_email"] if email_kind == "wrong_email" else acc["email"]
    password = DATA["wrong_password"] if password_kind == "wrong_password" else acc["password"]

    response = login_page.login_and_wait_api(email, password)

    assert response.status == 401, f"API phải trả 401, thực tế {response.status}"
    _assert_login_failed(login_page)
    expect(login_page.driver, L.ERROR_ALERT).to_have_text(MSG["invalid_credentials"])


# ---------------------------------------------------------------- Bỏ trống trường bắt buộc
REQUIRED_CASES = [
    ("Login_55", "", "valid", "email", "email_required"),
    ("Login_56", "valid", "", "password", "password_required"),
    ("Login_57", "", "", "email", "email_required"),
]


@pytest.mark.parametrize(
    "tc_id,email_kind,password_kind,focus_field,msg_key", REQUIRED_CASES, ids=[c[0] for c in REQUIRED_CASES]
)
def test_login_required_fields(
    login_page: LoginPage, accounts, tc_id, email_kind, password_kind, focus_field, msg_key, record_testcase
):
    """Login_55..57 - Bỏ trống trường bắt buộc -> thông báo tại trường (trường đầu tiên nếu trống cả hai)."""
    record_testcase(tc_id)
    acc = accounts("candidate")
    email = acc["email"] if email_kind == "valid" else ""
    password = acc["password"] if password_kind == "valid" else ""

    login_page.login(email, password)

    field = L.EMAIL if focus_field == "email" else L.PASSWORD
    _assert_login_failed(login_page)
    expect(login_page.driver, field, "Con trỏ phải ở trường bị lỗi đầu tiên").to_be_focused()
    message = login_page.validation_message(field)
    assert MSG[msg_key] in message, f"Mong đợi '{MSG[msg_key]}', thực tế '{message}'"
