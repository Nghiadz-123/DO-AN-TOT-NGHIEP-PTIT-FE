"""UI / Validation test màn hình Đăng ký – Ứng viên (Login_58..141) và Nhà tuyển dụng (Login_149..249).

Nguồn: FE/Test/KBKTCN_ATS_WEB_v1.0.xlsx, sheet "Đăng nhập, Đăng ký".
Locator: FE/frontend/src/pages/Auth/RegisterPage.jsx (xem pages/register_page.py).
Mã TC theo vai trò + trường: test_data/register.json > roles.

Hai vai trò dùng chung kịch bản -> mỗi test được parametrize theo (vai trò, trường), id = mã TC.
"""
from __future__ import annotations

import re

import pytest
from playwright.sync_api import Page, expect

from pages.login_page import LoginPage
from pages.register_page import RegisterPage
from utils.data_loader import load_test_data
from utils.helpers import unique_suffix
from utils.register_data import valid_register_form

DATA = load_test_data("register.json")
MSG = DATA["messages"]
ROLES = DATA["roles"]
MAXLENGTH = DATA["maxlength"]
MINLENGTH = DATA["minlength"]
VALID_PW = DATA["valid_password"]

pytestmark = [pytest.mark.ui, pytest.mark.register]


# ======================================================================== sinh tham số từ test data
def _role_mark(role: str):
    return getattr(pytest.mark, role)


def general_params(check: str):
    return [pytest.param(role, cfg["general"][check], id=cfg["general"][check], marks=_role_mark(role))
            for role, cfg in ROLES.items()]


def field_params(check: str):
    """(role, field, tc_id) cho mọi trường có khối kiểm tra `check`."""
    return [
        pytest.param(role, field, spec[check], id=f"{spec[check]}-{role}-{field}", marks=_role_mark(role))
        for role, cfg in ROLES.items()
        for field, spec in cfg["fields"].items()
        if check in spec
    ]


def field_list_params(check: str, values: list):
    """Khối có nhiều TC liên tiếp (formats, maxlength, minlength) – ghép từng TC với 1 giá trị."""
    out = []
    for role, cfg in ROLES.items():
        for field, spec in cfg["fields"].items():
            for tc_id, value in zip(spec.get(check, []), values):
                out.append(pytest.param(role, field, tc_id, value, id=f"{tc_id}-{role}-{field}",
                                        marks=_role_mark(role)))
    return out


def single_params(field: str, check: str):
    return [pytest.param(role, cfg["fields"][field][check], id=cfg["fields"][field][check], marks=_role_mark(role))
            for role, cfg in ROLES.items()]


def _form_fields(role: str) -> list[str]:
    return list(ROLES[role]["fields"])


# ======================================================================== Giao diện chung
@pytest.mark.smoke
@pytest.mark.parametrize("role,tc_id", general_params("default_layout"))
def test_default_layout(open_register, role, tc_id, record_testcase):
    """Login_58 / Login_149 - Giao diện mặc định.

    Expected: title "Tạo tài khoản"; đủ textbox Họ và tên, [Tên công ty – NTD], Email, Mật khẩu,
    Xác nhận mật khẩu; button Đăng ký; link Đăng nhập; có header, footer.
    """
    record_testcase(tc_id)
    reg = open_register(role)

    expect(reg.heading, "Title màn hình phải là 'Tạo tài khoản'").to_have_text("Tạo tài khoản")
    for name in _form_fields(role):
        expect(reg.fields[name], f"Thiếu trường {name}").to_be_visible()
    if role == "candidate":
        expect(reg.company_name_input, "Ứng viên không có trường Tên công ty").to_have_count(0)
    expect(reg.submit_button).to_be_visible()
    expect(reg.login_link).to_be_visible()
    expect(reg.header, "Thiếu header").to_be_visible()
    expect(reg.footer, "Thiếu footer").to_be_visible()


@pytest.mark.manual
@pytest.mark.parametrize("role,tc_id", general_params("overall_layout"))
def test_overall_layout(role, tc_id, record_testcase):
    """Login_59 / Login_150 - Bố cục, font chữ, chính tả, màu chữ, dấu * ở trường bắt buộc."""
    record_testcase(tc_id)
    pytest.skip(
        "MANUAL: Expected mang tính cảm quan (bố cục, font, chính tả). Lưu ý khi test tay: "
        "source RegisterPage.jsx hiện KHÔNG có dấu * ở các label bắt buộc."
    )


@pytest.mark.parametrize("zoom", [50, 200, 300], ids=lambda z: f"zoom_{z}")
@pytest.mark.parametrize("role,tc_id", general_params("zoom"))
def test_zoom_in_out(page: Page, settings, open_register, role, tc_id, zoom, record_testcase):
    """Login_60 / Login_151 (bán tự động) - Thu nhỏ / phóng to không vỡ giao diện.

    Zoom N% của trình duyệt tương đương viewport CSS = viewport gốc * 100/N (headless không có Ctrl -/+).
    """
    record_testcase(tc_id)
    base = settings.viewport
    page.set_viewport_size({"width": int(base["width"] * 100 / zoom), "height": int(base["height"] * 100 / zoom)})
    reg = open_register(role)

    for name in _form_fields(role):
        expect(reg.fields[name]).to_be_visible()
    expect(reg.submit_button).to_be_visible()
    overflow = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    assert overflow <= 0, f"Zoom {zoom}%: trang bị tràn ngang {overflow}px (vỡ giao diện)"


def _tab_order(reg: RegisterPage, role: str):
    order = [reg.role_radio(role), reg.full_name_input]
    if role == "recruiter":
        order.append(reg.company_name_input)
    order += [reg.email_input, reg.password_input, reg.password_toggle,
              reg.confirm_password_input, reg.confirm_password_toggle, reg.submit_button, reg.login_link]
    return order


@pytest.mark.parametrize("role,tc_id", general_params("tab"))
def test_tab_order(open_register, role, tc_id, record_testcase):
    """Login_61 / Login_152 - Nhấn Tab: con trỏ đi từ trái qua phải, trên xuống dưới."""
    record_testcase(tc_id)
    reg = open_register(role)
    order = _tab_order(reg, role)

    order[0].focus()
    expect(order[0]).to_be_focused()
    for el in order[1:]:
        reg.page.keyboard.press("Tab")
        expect(el).to_be_focused()


@pytest.mark.parametrize("role,tc_id", general_params("shift_tab"))
def test_shift_tab_order(open_register, role, tc_id, record_testcase):
    """Login_62 / Login_153 - Nhấn Shift+Tab: con trỏ đi theo thứ tự ngược lại."""
    record_testcase(tc_id)
    reg = open_register(role)
    order = list(reversed(_tab_order(reg, role)))

    order[0].focus()
    expect(order[0]).to_be_focused()
    for el in order[1:]:
        reg.page.keyboard.press("Shift+Tab")
        expect(el).to_be_focused()


# ======================================================================== Textbox – kiểm tra chung mọi trường
@pytest.mark.parametrize("role,field,tc_id", field_params("display"))
def test_textbox_display(open_register, role, field, tc_id, record_testcase):
    """Textbox hiển thị đúng kích thước, có viền (bán tự động – màu viền đúng thiết kế kiểm tra tay)."""
    record_testcase(tc_id)
    el = open_register(role).fields[field]

    expect(el).to_be_visible()
    box = el.bounding_box()
    assert box and box["width"] > 0 and box["height"] > 0, "Textbox không có kích thước"
    border = el.evaluate("e => parseFloat(getComputedStyle(e).borderTopWidth)")
    assert border > 0, "Textbox không có viền"


@pytest.mark.parametrize("role,field,tc_id", field_params("default"))
def test_textbox_default_empty(open_register, role, field, tc_id, record_testcase):
    """Giá trị mặc định rỗng."""
    record_testcase(tc_id)
    expect(open_register(role).fields[field]).to_have_value("")


@pytest.mark.parametrize("role,field,tc_id", field_params("placeholder"))
def test_textbox_placeholder_empty(open_register, role, field, tc_id, record_testcase):
    """Placeholder trống."""
    record_testcase(tc_id)
    placeholder = open_register(role).fields[field].get_attribute("placeholder")
    assert not placeholder, f"Placeholder phải trống, thực tế: '{placeholder}'"


@pytest.mark.parametrize("role,field,tc_id", field_params("required"))
def test_field_required(open_register, role, field, tc_id, record_testcase):
    """Bỏ trống trường (các trường khác hợp lệ), nhấn Đăng ký -> "Vui lòng điền vào trường này"."""
    record_testcase(tc_id)
    reg = open_register(role)
    reg.fill_form(valid_register_form(role, **{field: ""}))
    reg.submit()
    reg.wait_submit_outcome()

    el = reg.fields[field]
    assert reg.is_value_missing(el), f"Trường {field} trống phải bị chặn (required)"
    message = reg.validation_message(el)
    assert MSG["required_field"] in message, f"Thông báo thực tế: '{reg.feedback_for(el)}'"
    expect(reg.page).to_have_url(RegisterPage.URL_PATTERN)


SPACES_CASES = [
    pytest.param(role, field, spec["spaces"], case,
                 id=f"{spec['spaces']}-{role}-{field}-{case['desc']}", marks=_role_mark(role))
    for role, cfg in ROLES.items()
    for field, spec in cfg["fields"].items()
    for case in DATA["spaces_cases"][field]
]


@pytest.mark.parametrize("role,field,tc_id,case", SPACES_CASES)
def test_field_only_spaces(open_register, role, field, tc_id, case, record_testcase):
    """Nhập toàn khoảng trắng (các trường khác hợp lệ), nhấn Đăng ký -> đăng ký không thành công:
    - Email: trình duyệt chặn, "Vui lòng điền vào trường này."
    - Họ tên / Tên công ty: "Trường này không được bỏ trống."
    - Mật khẩu < 8 space: "Mật khẩu phải có ít nhất 8 ký tự."; >= 8 space (xác nhận giống): "Trường này không được bỏ trống."
    - Xác nhận mật khẩu: "Mật khẩu xác nhận không khớp."
    """
    record_testcase(tc_id)
    reg = open_register(role)
    override = {field: case["value"]}
    if case.get("confirm_same"):
        override["confirm_password"] = case["value"]
    reg.fill_form(valid_register_form(role, **override))
    reg.submit()
    reg.wait_submit_outcome()

    expect(reg.page, f"Trường {field} toàn space nhưng đăng ký thành công").to_have_url(RegisterPage.URL_PATTERN)
    el = reg.fields[field]
    expected = MSG[case["message"]]
    actual = reg.validation_message(el) if case["expect"] == "native" else reg.alert_text()
    assert expected in actual, (
        f"Trường {field} toàn space: mong đợi '{expected}', thực tế '{reg.feedback_for(el) or '(không có thông báo)'}'"
    )


@pytest.mark.parametrize("role,field,tc_id,case", field_list_params("formats", DATA["format_values"]))
def test_field_input_formats(open_register, role, field, tc_id, case, record_testcase):
    """Cho phép nhập chữ thường / in hoa / không dấu / có dấu / số / ký tự đặc biệt / html / emoji,
    không hiển thị cảnh báo."""
    record_testcase(tc_id)
    reg = open_register(role)
    el = reg.fields[field]
    el.fill(case["value"])

    expect(el).to_have_value(case["value"])
    expect(reg.error_alert).to_be_hidden()


@pytest.mark.parametrize("role,field,tc_id", field_params("copy_paste"))
def test_field_copy_paste(open_register, context, role, field, tc_id, record_testcase):
    """Copy nội dung dữ liệu rồi paste vào textbox -> thành công."""
    record_testcase(tc_id)
    context.grant_permissions(["clipboard-read", "clipboard-write"])
    reg = open_register(role)
    el = reg.fields[field]
    value = "copy.paste@example.com" if field == "email" else "CopyPaste Dữ liệu 123"

    reg.write_clipboard(value)
    reg.paste_into(el)

    expect(el).to_have_value(value)


@pytest.mark.parametrize(
    "role,field,tc_id,lengths",
    field_list_params("maxlength", [(MAXLENGTH + 1, MAXLENGTH), (MAXLENGTH, MAXLENGTH), (MAXLENGTH - 1, MAXLENGTH - 1)]),
)
def test_field_maxlength(open_register, role, field, tc_id, lengths, record_testcase):
    """maxlength 255: chặn nhập > 255 ký tự, cho phép = 255 và < 255."""
    record_testcase(tc_id)
    typed, expected_len = lengths
    el = open_register(role).fields[field]
    # Gõ từng phím (không dùng fill) để trình duyệt áp dụng maxlength như người dùng thật
    el.press_sequentially("a" * typed)

    actual = len(el.input_value())
    assert actual == expected_len, (
        f"Nhập {typed} ký tự: mong đợi giữ {expected_len} ký tự (maxlength {MAXLENGTH}), thực tế {actual}"
    )


# ======================================================================== Email
@pytest.mark.parametrize("email", DATA["valid_emails"])
@pytest.mark.parametrize("role,tc_id", single_params("email", "valid_format"))
def test_email_valid_format(open_register, role, tc_id, email, record_testcase):
    """Login_97 / Login_205 - Email đúng định dạng -> nhập thành công, không cảnh báo."""
    record_testcase(tc_id)
    reg = open_register(role)
    reg.email_input.fill(email)

    expect(reg.email_input).to_have_value(email)
    assert reg.is_valid(reg.email_input), f"'{email}' hợp lệ nhưng bị đánh dấu sai: {reg.validation_message(reg.email_input)}"
    expect(reg.error_alert).to_be_hidden()


INVALID_EMAILS = DATA["invalid_emails"]["values"]


@pytest.mark.parametrize("case", INVALID_EMAILS, ids=[c["value"] for c in INVALID_EMAILS])
@pytest.mark.parametrize("role,tc_id", single_params("email", "invalid_format"))
def test_email_invalid_format(open_register, role, tc_id, case, record_testcase):
    """Login_98 / Login_206 - Email sai định dạng, nhấn Đăng ký -> đăng ký không thành công:
    1. Trình duyệt chặn submit, hiện thông báo định dạng email (VD thiếu @: "Vui lòng bao gồm '@' ...").
    2. Giá trị trình duyệt chấp nhận nhưng sai định dạng (VD abc@xyz): "Nhập một địa chỉ email hợp lệ."
    """
    record_testcase(tc_id)
    email = case["value"].replace("{uniq}", unique_suffix())
    reg = open_register(role)
    reg.fill_form(valid_register_form(role, email=email))
    reg.submit()
    reg.wait_submit_outcome()

    expect(reg.page, f"Email '{email}' sai định dạng nhưng đăng ký thành công").to_have_url(RegisterPage.URL_PATTERN)
    if case["expect"] == "browser":
        message = reg.validation_message(reg.email_input)
        assert reg.email_input.evaluate("e => e.validity.typeMismatch"), (
            f"Trình duyệt phải chặn '{email}' vì sai định dạng email, thực tế: '{reg.feedback_for(reg.email_input)}'"
        )
        assert message, f"Không có thông báo định dạng email cho '{email}'"
        if case.get("message"):
            assert message == case["message"], f"Email '{email}': mong đợi '{case['message']}', thực tế '{message}'"
    else:
        feedback = reg.alert_text()
        expected = MSG["invalid_email_server"]
        assert expected in feedback, f"Email '{email}': mong đợi '{expected}', thực tế '{feedback}'"


# ======================================================================== Mật khẩu
@pytest.mark.parametrize(
    "role,field,tc_id,length",
    [p for p in field_list_params("minlength", [MINLENGTH + 1, MINLENGTH, MINLENGTH - 1])],
)
def test_password_minlength(open_register, role, field, tc_id, length, record_testcase):
    """minlength 8: > 8 và = 8 ký tự cho phép nhập; < 8 -> "Mật khẩu phải có ít nhất 8 ký tự"."""
    record_testcase(tc_id)
    reg = open_register(role)
    password = ("Ab1" + "x" * length)[:length]

    if length >= MINLENGTH:
        reg.password_input.fill(password)
        expect(reg.password_input).to_have_value(password)
        expect(reg.error_alert).to_be_hidden()
        return

    reg.fill_form(valid_register_form(role, password=password, confirm_password=password))
    reg.submit()
    reg.wait_submit_outcome()

    expect(reg.page).to_have_url(RegisterPage.URL_PATTERN)
    feedback = reg.feedback_for(reg.password_input)
    assert MSG["password_min"] in feedback, f"Mong đợi '{MSG['password_min']}', thực tế '{feedback}'"


@pytest.mark.parametrize("role,tc_id", single_params("password", "format_valid"))
def test_password_format_valid(open_register, role, tc_id, record_testcase):
    """Login_119 / Login_227 - Mật khẩu có chữ cái và số -> nhập thành công, không báo lỗi."""
    record_testcase(tc_id)
    reg = open_register(role)
    pw = DATA["passwords"]["valid_letters_digits"]
    reg.password_input.fill(pw)

    expect(reg.password_input).to_have_value(pw)
    expect(reg.error_alert).to_be_hidden()


@pytest.mark.parametrize("role,tc_id", single_params("password", "no_letter"))
def test_password_no_letter(open_register, role, tc_id, record_testcase):
    """Login_120 / Login_228 - Mật khẩu không chứa chữ cái, nhấn Đăng ký -> "Mật khẩu này hoàn toàn là số."
    (Dùng chuỗi số không nằm trong danh sách mật khẩu phổ biến, nếu không sẽ ra "Mật khẩu này quá phổ biến.")"""
    record_testcase(tc_id)
    reg = open_register(role)
    pw = DATA["passwords"]["no_letter"]
    reg.fill_form(valid_register_form(role, password=pw, confirm_password=pw))
    reg.submit()
    reg.wait_submit_outcome()

    expect(reg.page, f"Mật khẩu '{pw}' toàn số nhưng đăng ký thành công").to_have_url(RegisterPage.URL_PATTERN)
    feedback = reg.alert_text()
    assert MSG["password_no_letter"] in feedback, f"Mong đợi '{MSG['password_no_letter']}', thực tế '{feedback}'"


@pytest.mark.parametrize("role,tc_id", single_params("password", "no_digit"))
def test_password_no_digit_allowed(open_register, role, tc_id, record_testcase):
    """Login_121 / Login_229 - Mật khẩu không chứa số -> nhập thành công, không báo lỗi
    (hệ thống không bắt buộc mật khẩu chứa chữ số)."""
    record_testcase(tc_id)
    reg = open_register(role)
    pw = DATA["passwords"]["no_digit"]
    reg.password_input.fill(pw)

    expect(reg.password_input).to_have_value(pw)
    expect(reg.error_alert).to_be_hidden()


# ======================================================================== Xác nhận mật khẩu
@pytest.mark.parametrize("role,tc_id", single_params("confirm_password", "match"))
def test_confirm_password_match(open_register, role, tc_id, record_testcase):
    """Login_136 / Login_244 - Xác nhận mật khẩu giống mật khẩu -> nhập thành công, không báo lỗi."""
    record_testcase(tc_id)
    reg = open_register(role)
    reg.fill_form({"password": VALID_PW, "confirm_password": VALID_PW})

    expect(reg.confirm_password_input).to_have_value(VALID_PW)
    expect(reg.error_alert).to_be_hidden()


@pytest.mark.parametrize("role,tc_id", single_params("confirm_password", "mismatch"))
def test_confirm_password_mismatch(open_register, role, tc_id, record_testcase):
    """Login_137 / Login_245 - Xác nhận mật khẩu khác mật khẩu, nhấn Đăng ký -> "Mật khẩu xác nhận không khớp."."""
    record_testcase(tc_id)
    reg = open_register(role)
    reg.fill_form(valid_register_form(role, confirm_password=VALID_PW + "x"))
    reg.submit()
    reg.wait_submit_outcome()

    expect(reg.page).to_have_url(RegisterPage.URL_PATTERN)
    feedback = reg.feedback_for(reg.confirm_password_input)
    assert MSG["confirm_mismatch_field"] in feedback, f"Mong đợi '{MSG['confirm_mismatch_field']}', thực tế '{feedback}'"


# ======================================================================== Button Đăng ký / Link Đăng nhập
def _params(section: str, key: str):
    return [pytest.param(role, cfg[section][key], id=cfg[section][key], marks=_role_mark(role))
            for role, cfg in ROLES.items()]


@pytest.mark.parametrize("role,tc_id", _params("submit", "label"))
def test_submit_button_label(open_register, role, tc_id, record_testcase):
    """Login_138 / Login_246 - Label button hiển thị đúng chính tả: "Đăng ký"."""
    record_testcase(tc_id)
    expect(open_register(role).submit_button).to_have_text("Đăng ký")


@pytest.mark.smoke
@pytest.mark.parametrize("role,tc_id", _params("submit", "click"))
def test_submit_button_click(open_register, settings, role, tc_id, record_testcase):
    """Login_139 / Login_247 - Nhập hợp lệ, nhấn Đăng ký -> màn hình Trang chủ của tài khoản."""
    record_testcase(tc_id)
    reg = open_register(role)
    response = reg.register_and_wait_api(valid_register_form(role), role)

    assert response.status == 201, f"API đăng ký trả {response.status}: {response.text()}"
    home = DATA["home_after_register"][role]
    expect(reg.page).to_have_url(re.compile(rf"^{re.escape(settings.base_url)}{home}/?$"))


@pytest.mark.parametrize("role,tc_id", _params("login_link", "label"))
def test_login_link_label(open_register, role, tc_id, record_testcase):
    """Login_140 / Login_248 - Label text link hiển thị đúng chính tả: "Đăng nhập"."""
    record_testcase(tc_id)
    expect(open_register(role).login_link).to_have_text("Đăng nhập")


@pytest.mark.parametrize("role,tc_id", _params("login_link", "click"))
def test_login_link_click(open_register, settings, role, tc_id, record_testcase):
    """Login_141 / Login_249 - Nhấn link "Đăng nhập" -> màn hình Đăng nhập."""
    record_testcase(tc_id)
    reg = open_register(role)
    reg.go_to_login()

    LoginPage(reg.page, settings).expect_loaded()
