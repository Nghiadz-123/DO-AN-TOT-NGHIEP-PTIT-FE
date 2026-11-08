"""Function test màn hình Đăng ký – Ứng viên (Login_142..148) và Nhà tuyển dụng (Login_250..256).

Nguồn: FE/Test/KBKTCN_ATS_WEB_v1.0.xlsx, sheet "Đăng nhập, Đăng ký".
Mỗi lần đăng ký thành công sẽ tạo 1 tài khoản mới (email duy nhất) trong database của môi trường test.
Backend giới hạn 20 request/phút cho API auth -> đã điều tiết tự động (utils/rate_limit.py).
"""
import re

import pytest
from playwright.sync_api import Playwright, expect

from pages.register_page import RegisterPage
from utils.auth_api import register_candidate
from utils.data_loader import load_test_data
from utils.helpers import unique_suffix
from utils.register_data import valid_register_form

DATA = load_test_data("register.json")
MSG = DATA["messages"]
ROLES = DATA["roles"]

pytestmark = [pytest.mark.function, pytest.mark.register]


def _params(key: str):
    return [pytest.param(role, cfg["function"][key], id=cfg["function"][key], marks=getattr(pytest.mark, role))
            for role, cfg in ROLES.items()]


def _assert_registered(reg: RegisterPage, response, settings, role: str) -> None:
    assert response.status == 201, f"API đăng ký trả {response.status}: {response.text()}"
    home = DATA["home_after_register"][role]
    expect(reg.page, "Đăng ký thành công phải chuyển tới trang chủ của tài khoản").to_have_url(
        re.compile(rf"^{re.escape(settings.base_url)}{home}/?$")
    )
    assert reg.access_token(), "Chưa lưu access token sau khi đăng ký"


def _assert_not_registered(reg: RegisterPage) -> None:
    expect(reg.page, "Đăng ký thất bại phải ở lại màn hình Đăng ký").to_have_url(RegisterPage.URL_PATTERN)
    assert not reg.access_token(), "Không được lưu access token khi đăng ký thất bại"


# ---------------------------------------------------------------- Đăng ký thành công
@pytest.mark.smoke
@pytest.mark.parametrize("role,tc_id", _params("full_fields"))
def test_register_all_fields(open_register, settings, role, tc_id, record_testcase):
    """Login_142 / Login_250 - Nhập hợp lệ tất cả các trường -> đăng ký thành công, về trang chủ."""
    record_testcase(tc_id)
    reg = open_register(role)
    response = reg.register_and_wait_api(valid_register_form(role), role)

    _assert_registered(reg, response, settings, role)


@pytest.mark.parametrize("role,tc_id", _params("required_only"))
def test_register_required_fields_only(open_register, settings, role, tc_id, record_testcase):
    """Login_143 / Login_251 - Chỉ nhập các trường bắt buộc -> đăng ký thành công.

    Form Đăng ký hiện không có trường tùy chọn (mọi trường đều required) nên dữ liệu giống Login_142/250.
    """
    record_testcase(tc_id)
    reg = open_register(role)
    response = reg.register_and_wait_api(valid_register_form(role), role)

    _assert_registered(reg, response, settings, role)


@pytest.mark.parametrize("role,tc_id", _params("confirm_match"))
def test_register_confirm_password_match(open_register, settings, role, tc_id, record_testcase):
    """Login_147 / Login_255 - Xác nhận mật khẩu giống mật khẩu -> đăng ký thành công."""
    record_testcase(tc_id)
    reg = open_register(role)
    form = valid_register_form(role)
    assert form["password"] == form["confirm_password"]
    response = reg.register_and_wait_api(form, role)

    _assert_registered(reg, response, settings, role)


# ---------------------------------------------------------------- Bỏ trống trường bắt buộc
EMPTY_REQUIRED = [
    pytest.param(role, cfg["function"]["empty_required"], field,
                 id=f"{cfg['function']['empty_required']}-{role}-{field}", marks=getattr(pytest.mark, role))
    for role, cfg in ROLES.items()
    for field in cfg["fields"]
]


@pytest.mark.parametrize("role,tc_id,field", EMPTY_REQUIRED)
def test_register_empty_required_focus(open_register, role, tc_id, field, record_testcase):
    """Login_144 / Login_252 - Bỏ trống trường bắt buộc, nhấn Đăng ký -> focus vào trường lỗi."""
    record_testcase(tc_id)
    reg = open_register(role)
    reg.fill_form(valid_register_form(role, **{field: ""}))
    reg.submit()

    el = reg.fields[field]
    expect(el, f"Con trỏ phải được đặt vào trường {field}").to_be_focused()
    assert reg.is_value_missing(el)
    _assert_not_registered(reg)


# ---------------------------------------------------------------- Tính duy nhất của email
@pytest.mark.parametrize("role,tc_id", _params("similar_email"))
def test_register_similar_email(
    open_register, playwright: Playwright, settings, auth_limiter, role, tc_id, record_testcase
):
    """Login_145 / Login_253 - Email gần giống email đã có (chỉ khác chữ hoa/thường,
    vd Pth3011@gmail.com.vn và pth3011@gmail.com.vn) -> "Email đã được sử dụng.", đăng ký không thành công
    (hệ thống không phân biệt hoa/thường của email)."""
    record_testcase(tc_id)
    local = f"Pth{unique_suffix()}"
    existing, similar = f"{local}@gmail.com.vn", f"{local.lower()}@gmail.com.vn"
    api = playwright.request.new_context(base_url=f"{settings.api_url}/")
    try:
        register_candidate(api, auth_limiter, existing, DATA["valid_password"])
    finally:
        api.dispose()

    reg = open_register(role)
    response = reg.register_and_wait_api(valid_register_form(role, email=similar), role)

    assert response.status == 400, (
        f"Đã có '{existing}', đăng ký '{similar}' phải bị từ chối; thực tế API {response.status}"
    )
    _assert_not_registered(reg)
    expect(reg.error_alert).to_contain_text(MSG["email_exists"])


@pytest.mark.parametrize("role,tc_id", _params("duplicate_email"))
def test_register_duplicate_email(open_register, accounts, role, tc_id, record_testcase):
    """Login_146 / Login_254 - Email trùng hoàn toàn với tài khoản đã có -> "Email đã được sử dụng."."""
    record_testcase(tc_id)
    existing = accounts(DATA["duplicate_email_role"])["email"]
    reg = open_register(role)
    response = reg.register_and_wait_api(valid_register_form(role, email=existing), role)

    assert response.status == 400, f"API phải trả 400, thực tế {response.status}"
    _assert_not_registered(reg)
    expect(reg.error_alert).to_contain_text(MSG["email_exists"])


# ---------------------------------------------------------------- Xác nhận mật khẩu
@pytest.mark.parametrize("role,tc_id", _params("confirm_mismatch"))
def test_register_confirm_password_mismatch(open_register, role, tc_id, record_testcase):
    """Login_148 / Login_256 - Xác nhận mật khẩu khác mật khẩu -> "Mật khẩu xác nhận không khớp."."""
    record_testcase(tc_id)
    reg = open_register(role)
    form = valid_register_form(role)
    form["confirm_password"] = form["password"] + "x"
    reg.fill_form(form)
    reg.submit()

    expect(reg.error_alert).to_contain_text(MSG["confirm_mismatch_function"])
    _assert_not_registered(reg)
