"""UI test màn hình Đăng nhập – Login_1 .. Login_48.

Nguồn: FE/Test/KBKTCN_ATS_WEB_v1.0.xlsx, sheet "Đăng nhập, Đăng ký".
Locator: FE/frontend/src/pages/Auth/LoginPage.jsx (xem pages/login_page.py).
"""
import re

import pytest
from playwright.sync_api import Page, expect

from pages.login_page import LoginPage
from utils.data_loader import cases_with_ids, load_test_data

EMAIL_CASES, EMAIL_IDS = cases_with_ids("login.json", "email_formats")
PASSWORD_CASES, PASSWORD_IDS = cases_with_ids("login.json", "password_formats")
MAXLENGTH = load_test_data("login.json")["maxlength"]
MSG = load_test_data("login.json")["messages"]

pytestmark = [pytest.mark.ui, pytest.mark.login]


# ======================================================================== Giao diện chung
@pytest.mark.smoke
@pytest.mark.testcase("Login_1")
def test_login_1_default_layout(login_page: LoginPage):
    """Login_1 - Giao diện mặc định.

    Expected: title "Đăng nhập"; đủ textbox Email (tài liệu ghi "Tên đăng nhập"), textbox Mật khẩu,
    button Đăng nhập, link "Đăng ký ngay"; có header, footer.
    """
    expect(login_page.heading, "Title màn hình phải là 'Đăng nhập'").to_have_text("Đăng nhập")
    expect(login_page.email_input).to_be_visible()
    expect(login_page.password_input).to_be_visible()
    expect(login_page.submit_button).to_be_visible()
    expect(login_page.register_link).to_be_visible()
    expect(login_page.header, "Thiếu header").to_be_visible()
    expect(login_page.footer, "Thiếu footer").to_be_visible()


@pytest.mark.manual
@pytest.mark.testcase("Login_2")
def test_login_2_overall_layout():
    """Login_2 - Bố cục, font chữ, chính tả, màu chữ, dấu * ở trường bắt buộc."""
    pytest.skip(
        "MANUAL: Expected mang tính cảm quan (bố cục, font, chính tả). Lưu ý khi test tay: "
        "source LoginPage.jsx hiện KHÔNG có dấu * ở label Email/Mật khẩu."
    )


@pytest.mark.testcase("Login_3")
@pytest.mark.parametrize("zoom", [50, 200, 300], ids=lambda z: f"zoom_{z}")
def test_login_3_zoom_in_out(page: Page, settings, zoom):
    """Login_3 (bán tự động) - Thu nhỏ / phóng to.

    Ctrl -/+ của trình duyệt không điều khiển được ở chế độ headless; zoom N% tương đương
    viewport CSS = viewport gốc * 100/N. Expected: form hiển thị đủ, không vỡ / tràn ngang.
    """
    base = settings.viewport
    page.set_viewport_size(
        {"width": int(base["width"] * 100 / zoom), "height": int(base["height"] * 100 / zoom)}
    )
    login_page = LoginPage(page, settings).open()

    for el in (login_page.email_input, login_page.password_input, login_page.submit_button):
        expect(el).to_be_visible()
    overflow = page.evaluate(
        "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
    )
    assert overflow <= 0, f"Zoom {zoom}%: trang bị tràn ngang {overflow}px (vỡ giao diện)"


@pytest.mark.testcase("Login_4")
def test_login_4_tab_order(login_page: LoginPage):
    """Login_4 - Nhấn Tab: con trỏ đi từ trái qua phải, trên xuống dưới trong form."""
    order = [
        login_page.email_input,
        login_page.password_input,
        login_page.password_toggle,
        login_page.submit_button,
        login_page.register_link,
    ]
    order[0].focus()
    expect(order[0]).to_be_focused()
    for el in order[1:]:
        login_page.page.keyboard.press("Tab")
        expect(el).to_be_focused()


@pytest.mark.testcase("Login_5")
def test_login_5_shift_tab_order(login_page: LoginPage):
    """Login_5 - Nhấn Shift+Tab: con trỏ đi theo thứ tự ngược lại."""
    order = [
        login_page.register_link,
        login_page.submit_button,
        login_page.password_toggle,
        login_page.password_input,
        login_page.email_input,
    ]
    order[0].focus()
    expect(order[0]).to_be_focused()
    for el in order[1:]:
        login_page.page.keyboard.press("Shift+Tab")
        expect(el).to_be_focused()


# ======================================================================== Textbox Email / Mật khẩu (dùng chung)
def _field(login_page: LoginPage, name: str):
    return login_page.email_input if name == "email" else login_page.password_input


@pytest.mark.parametrize(
    "field_name,tc_id", [("email", "Login_6"), ("password", "Login_23")], ids=["Login_6", "Login_23"]
)
def test_textbox_display(login_page: LoginPage, field_name, tc_id, record_testcase):
    """Login_6, Login_23 (bán tự động) - Textbox hiển thị đúng kích thước, có viền.

    Tự động: textbox hiển thị, có kích thước, có viền. Màu viền đúng thiết kế -> kiểm tra tay.
    """
    record_testcase(tc_id)
    field = _field(login_page, field_name)
    expect(field).to_be_visible()
    box = field.bounding_box()
    assert box and box["width"] > 0 and box["height"] > 0, "Textbox không có kích thước"
    border = field.evaluate("el => parseFloat(getComputedStyle(el).borderTopWidth)")
    assert border > 0, "Textbox không có viền"


@pytest.mark.parametrize(
    "field_name,tc_id", [("email", "Login_7"), ("password", "Login_24")], ids=["Login_7", "Login_24"]
)
def test_textbox_default_empty(login_page: LoginPage, field_name, tc_id, record_testcase):
    """Login_7, Login_24 - Giá trị mặc định rỗng."""
    record_testcase(tc_id)
    expect(_field(login_page, field_name)).to_have_value("")


@pytest.mark.parametrize(
    "field_name,tc_id", [("email", "Login_8"), ("password", "Login_25")], ids=["Login_8", "Login_25"]
)
def test_textbox_placeholder_empty(login_page: LoginPage, field_name, tc_id, record_testcase):
    """Login_8, Login_25 - Placeholder trống."""
    record_testcase(tc_id)
    placeholder = _field(login_page, field_name).get_attribute("placeholder")
    assert not placeholder, f"Placeholder phải trống, thực tế: '{placeholder}'"


@pytest.mark.testcase("Login_9")
def test_login_9_email_required(login_page: LoginPage, accounts):
    """Login_9 - Bỏ trống Email -> "Vui lòng điền vào trường này"."""
    login_page.login("", accounts("candidate")["password"])

    assert login_page.is_value_missing(login_page.email_input), "Email trống phải bị chặn (required)"
    message = login_page.validation_message(login_page.email_input)
    assert MSG["required_field"] in message, f"Thông báo thực tế: '{message}'"
    expect(login_page.page).to_have_url(LoginPage.URL_PATTERN)


@pytest.mark.testcase("Login_10")
def test_login_10_email_only_spaces(login_page: LoginPage, accounts):
    """Login_10 - Email nhập toàn khoảng trắng -> "Vui lòng điền vào trường này"."""
    login_page.login("     ", accounts("candidate")["password"])

    message = login_page.validation_message(login_page.email_input)
    assert MSG["required_field"] in message, f"Thông báo thực tế: '{message}'"
    expect(login_page.page).to_have_url(LoginPage.URL_PATTERN)


@pytest.mark.testcase("Login_26")
def test_login_26_password_required(login_page: LoginPage, accounts):
    """Login_26 - Bỏ trống Mật khẩu, nhấn Enter -> "Vui lòng điền vào trường này"."""
    login_page.fill_credentials(accounts("candidate")["email"], "")
    login_page.submit_by_enter(login_page.password_input)

    assert login_page.is_value_missing(login_page.password_input), "Mật khẩu trống phải bị chặn"
    message = login_page.validation_message(login_page.password_input)
    assert MSG["required_field"] in message, f"Thông báo thực tế: '{message}'"
    expect(login_page.page).to_have_url(LoginPage.URL_PATTERN)


@pytest.mark.testcase("Login_27")
def test_login_27_password_only_spaces(login_page: LoginPage, accounts):
    """Login_27 - Email hợp lệ, Mật khẩu toàn khoảng trắng, nhấn Enter
    -> thông báo "Trường này không được bỏ trống.", đăng nhập không thành công."""
    login_page.fill_credentials(accounts("candidate")["email"], "      ")
    with login_page.page.expect_response(lambda r: "/auth/login/" in r.url and r.request.method == "POST"):
        login_page.submit_by_enter(login_page.password_input)

    expect(login_page.error_alert).to_have_text(MSG["blank_field"])
    expect(login_page.page).to_have_url(LoginPage.URL_PATTERN)
    assert not login_page.access_token(), "Không được đăng nhập khi mật khẩu toàn khoảng trắng"


@pytest.mark.parametrize("case", EMAIL_CASES, ids=EMAIL_IDS)
def test_email_input_formats(login_page: LoginPage, case, record_testcase):
    """Login_11..18 - Email: cho phép nhập các loại ký tự, không hiển thị cảnh báo."""
    record_testcase(case["tc_id"])
    login_page.email_input.fill(case["value"])

    expect(login_page.email_input).to_have_value(case["value"])
    expect(login_page.error_alert).to_be_hidden()


@pytest.mark.parametrize("case", PASSWORD_CASES, ids=PASSWORD_IDS)
def test_password_input_formats(login_page: LoginPage, case, record_testcase):
    """Login_28..35 - Mật khẩu: cho phép nhập các loại ký tự, không hiển thị cảnh báo."""
    record_testcase(case["tc_id"])
    login_page.password_input.fill(case["value"])

    expect(login_page.password_input).to_have_value(case["value"])
    expect(login_page.error_alert).to_be_hidden()


@pytest.mark.testcase("Login_19")
def test_login_19_email_copy_paste(login_page: LoginPage, context):
    """Login_19 - Copy/paste dữ liệu vào textbox Email thành công."""
    context.grant_permissions(["clipboard-read", "clipboard-write"])
    value = "copy.paste@example.com"
    login_page.email_input.fill(value)

    login_page.copy_from(login_page.email_input)
    login_page.email_input.fill("")
    login_page.paste_into(login_page.email_input)

    expect(login_page.email_input).to_have_value(value)


@pytest.mark.testcase("Login_36")
def test_login_36_hidden_password_cannot_copy(login_page: LoginPage, context):
    """Login_36 - Mật khẩu đang ẩn thì không copy được."""
    context.grant_permissions(["clipboard-read", "clipboard-write"])
    secret = "Hidden@Pass123"
    login_page.write_clipboard("__CLIPBOARD_SENTINEL__")
    login_page.password_input.fill(secret)
    expect(login_page.password_input).to_have_attribute("type", "password")

    login_page.copy_from(login_page.password_input)

    assert login_page.read_clipboard() != secret, "Copy được mật khẩu khi đang ở trạng thái ẩn"


@pytest.mark.testcase("Login_37")
def test_login_37_visible_password_copy_paste(login_page: LoginPage, context):
    """Login_37 - Mật khẩu đang hiện thì copy/paste thành công."""
    context.grant_permissions(["clipboard-read", "clipboard-write"])
    secret = "Visible@Pass123"
    login_page.password_input.fill(secret)
    login_page.toggle_password_visibility()
    expect(login_page.password_input).to_have_attribute("type", "text")

    login_page.copy_from(login_page.password_input)
    assert login_page.read_clipboard() == secret, "Không copy được mật khẩu khi đang hiện"
    login_page.password_input.fill("")
    login_page.paste_into(login_page.password_input)

    expect(login_page.password_input).to_have_value(secret)


MAXLEN_CASES = [
    ("Login_20", "email", MAXLENGTH + 1, MAXLENGTH),
    ("Login_21", "email", MAXLENGTH, MAXLENGTH),
    ("Login_22", "email", MAXLENGTH - 1, MAXLENGTH - 1),
    ("Login_38", "password", MAXLENGTH + 1, MAXLENGTH),
    ("Login_39", "password", MAXLENGTH, MAXLENGTH),
    ("Login_40", "password", MAXLENGTH - 1, MAXLENGTH - 1),
]


@pytest.mark.parametrize(
    "tc_id,field_name,typed,expected_len", MAXLEN_CASES, ids=[c[0] for c in MAXLEN_CASES]
)
def test_textbox_maxlength(login_page: LoginPage, tc_id, field_name, typed, expected_len, record_testcase):
    """Login_20..22, Login_38..40 - maxlength 255: chặn nhập > 255, cho phép = 255 và < 255."""
    record_testcase(tc_id)
    field = _field(login_page, field_name)
    # Gõ từng phím (không dùng fill) để trình duyệt áp dụng maxlength như người dùng thật
    field.press_sequentially("a" * typed)

    actual = len(field.input_value())
    assert actual == expected_len, (
        f"Nhập {typed} ký tự: mong đợi giữ {expected_len} ký tự (maxlength {MAXLENGTH}), thực tế {actual}"
    )


# ======================================================================== Icon Ẩn/Hiện mật khẩu
@pytest.mark.manual
@pytest.mark.testcase("Login_41")
def test_login_41_toggle_icon_matches_design():
    """Login_41 - Icon khớp với thiết kế."""
    pytest.skip("MANUAL: so sánh icon với thiết kế mang tính cảm quan (cần ảnh thiết kế chuẩn).")


@pytest.mark.testcase("Login_42")
def test_login_42_password_hidden_by_default(login_page: LoginPage):
    """Login_42 - Mặc định mật khẩu ở trạng thái Ẩn."""
    expect(login_page.password_input).to_have_attribute("type", "password")
    expect(login_page.password_toggle).to_have_attribute("aria-pressed", "false")
    expect(login_page.password_toggle).to_have_accessible_name("Hiện mật khẩu")


@pytest.mark.testcase("Login_43")
def test_login_43_toggle_icon_state(login_page: LoginPage):
    """Login_43 - Nhấn icon: icon chuyển trạng thái (Ẩn: mắt / Hiện: mắt gạch chéo).

    PasswordInput.jsx render <EyeOff/> khi visible=true, <Eye/> khi false; trạng thái này phản ánh
    qua aria-pressed/aria-label của nút.
    """
    login_page.toggle_password_visibility()
    expect(login_page.password_toggle).to_have_attribute("aria-pressed", "true")
    expect(login_page.password_toggle).to_have_accessible_name("Ẩn mật khẩu")

    login_page.toggle_password_visibility()
    expect(login_page.password_toggle).to_have_attribute("aria-pressed", "false")
    expect(login_page.password_toggle).to_have_accessible_name("Hiện mật khẩu")


@pytest.mark.testcase("Login_44")
def test_login_44_toggle_shows_hides_password(login_page: LoginPage):
    """Login_44 - Mật khẩu ẩn/hiện tương ứng với icon."""
    login_page.password_input.fill("Toggle@123")

    login_page.toggle_password_visibility()
    expect(login_page.password_input).to_have_attribute("type", "text")
    expect(login_page.password_input).to_have_value("Toggle@123")

    login_page.toggle_password_visibility()
    expect(login_page.password_input).to_have_attribute("type", "password")


# ======================================================================== Button / Link
@pytest.mark.testcase("Login_45")
def test_login_45_submit_button_label(login_page: LoginPage):
    """Login_45 - Label button hiển thị đúng chính tả: "Đăng nhập"."""
    expect(login_page.submit_button).to_have_text("Đăng nhập")


@pytest.mark.smoke
@pytest.mark.testcase("Login_46")
def test_login_46_click_submit_goes_home(login_page: LoginPage, accounts, settings):
    """Login_46 - Nhập đúng tài khoản ứng viên, nhấn Đăng nhập -> màn hình Trang chủ."""
    acc = accounts("candidate")
    login_page.login(acc["email"], acc["password"])

    expect(login_page.page).to_have_url(re.compile(rf"^{re.escape(settings.base_url)}/?$"))


@pytest.mark.testcase("Login_47")
def test_login_47_register_link_label(login_page: LoginPage):
    """Login_47 - Label text link hiển thị đúng chính tả: "Đăng ký ngay"."""
    expect(login_page.register_link).to_have_text("Đăng ký ngay")


@pytest.mark.testcase("Login_48")
def test_login_48_click_register_link(login_page: LoginPage):
    """Login_48 - Nhấn link "Đăng ký ngay" -> màn hình Đăng ký."""
    login_page.go_to_register()

    page = login_page.page
    expect(page).to_have_url(re.compile(r".*/register/?$"))
    expect(page.get_by_role("heading", name="Tạo tài khoản", level=1)).to_be_visible()
