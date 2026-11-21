"""UI test màn hình "Tạo CV" (/create-cv) – Candidate_97, 98, 103..198.

Nguồn: KBKTCN_ATS_WEB_v1.0.xlsx, sheet "Ứng viên", mục "Tạo CV".
Các textbox (Họ và tên, Vị trí ứng tuyển, Email, Số điện thoại, Tóm tắt nghề nghiệp) dùng chung kịch bản:
mỗi test được parametrize theo trường, mã TC lấy từ test_data/cv.json > builder_fields.
Dữ liệu: 1 tài khoản ứng viên / module; trước mỗi test xóa nội dung CV tự tạo đã lưu (PUT content = {}).
"""
import pytest
from playwright.sync_api import Page, expect

from pages.cv_builder_page import CVBuilderPage
from utils.data_loader import load_test_data
from utils.layout import horizontal_overflow

DATA = load_test_data("cv.json")
MSG = DATA["messages"]
FIELDS = DATA["builder_fields"]
FULL = DATA["builder_full"]

pytestmark = [pytest.mark.ui, pytest.mark.cv, pytest.mark.cv_builder]


def _cases(check: str, *, where=lambda f: True):
    return [pytest.param(f, id=f["tc"][check]) for f in FIELDS if check in f["tc"] and where(f)]


def _format_cases(save: bool):
    out = []
    for f in FIELDS:
        for tc_id, fmt in zip(f["tc"].get("formats", []), DATA["text_formats"]):
            if bool(fmt.get("save")) == save:
                out.append(pytest.param(f, fmt, tc_id, id=tc_id))
    return out


@pytest.fixture(scope="module")
def builder_candidate(candidate_factory):
    return candidate_factory()


@pytest.fixture
def builder(login_as, builder_candidate, page: Page, settings) -> CVBuilderPage:
    builder_candidate.builder_save({})  # trạng thái ban đầu: chưa có nội dung đã lưu
    login_as(builder_candidate)
    return CVBuilderPage(page, settings).open()


def _saved(client, key: str):
    return (client.builder_content() or {}).get(key)


def _validation_message(field) -> str:
    return field.evaluate("el => el.validationMessage")


def _assert_not_saved_with_message(builder: CVBuilderPage, field, message: str):
    sent = builder.save_requests_after_click()
    shown = _validation_message(field) + " " + builder.page.locator("main").inner_text()
    assert message in shown, f"Không hiển thị thông báo '{message}'"
    assert sent == 0, "Dữ liệu không hợp lệ nhưng vẫn gửi yêu cầu lưu CV"


def _save_ok(builder: CVBuilderPage):
    response = builder.save()
    assert response.ok, f"Lưu CV thất bại: {response.status} {response.text()}"
    expect(builder.success_alert).to_have_text(MSG["builder_saved"])


# ---------------------------------------------------------------- giao diện chung
@pytest.mark.smoke
@pytest.mark.testcase("Candidate_97")
def test_candidate_97_default_layout(builder: CVBuilderPage):
    """Candidate_97 - Title "Tạo CV của bạn"; Thông tin cá nhân, Giới thiệu, Kinh nghiệm (Thêm/Xóa), Học vấn
    (Thêm/Xóa), Kỹ năng & dự án; khung Xem trước CV (A4); button Tải CV dạng PDF, Lưu CV; header, footer."""
    expect(builder.heading).to_have_text(MSG["builder_title"])
    for label in ("Họ và tên", "Vị trí ứng tuyển", "Email", "Số điện thoại", "Địa điểm", "Tóm tắt nghề nghiệp",
                  "Kỹ năng", "Dự án tiêu biểu"):
        expect(builder.field(label), f"Thiếu trường {label}").to_be_visible()
    for label in ("Chức danh", "Công ty", "Thời gian", "Mô tả công việc và thành tựu"):
        expect(builder.item_field(builder.experience(1), label)).to_be_visible()
    for label in ("Bằng cấp / chuyên ngành", "Trường học", "Thời gian", "Mô tả thêm"):
        expect(builder.item_field(builder.education(1), label)).to_be_visible()
    expect(builder.add_experience_button).to_be_visible()
    expect(builder.add_education_button).to_be_visible()
    expect(builder.preview).to_be_visible()
    expect(builder.preview).to_contain_text("A4")
    expect(builder.print_button).to_be_visible()
    expect(builder.save_button).to_have_text(MSG["save_button"])
    expect(builder.shell.header).to_be_visible()
    expect(builder.shell.footer).to_be_visible()


@pytest.mark.testcase("Candidate_98")
def test_candidate_98_required_mark(builder: CVBuilderPage):
    """Candidate_98 (phần tự động) - Trường bắt buộc (Họ và tên) có dấu *. Bố cục/font/chính tả: kiểm tra tay."""
    label = builder.form.locator("label.cv-builder-field").filter(has=builder.field_label("Họ và tên"))
    expect(label, "Trường bắt buộc Họ và tên không có dấu *").to_contain_text("*")


# ---------------------------------------------------------------- textbox / textarea (chung kịch bản)
@pytest.mark.parametrize("f", _cases("display"))
def test_candidate_builder_field_display(builder: CVBuilderPage, f, record_testcase):
    """Candidate_103/121/139/159/173 - Textbox hiển thị, nhập được (kích thước / màu viền: kiểm tra tay)."""
    record_testcase(f["tc"]["display"])
    field = builder.field(f["label"])
    expect(field).to_be_visible()
    expect(field).to_be_editable()


@pytest.mark.parametrize("f", _cases("default"))
def test_candidate_builder_field_default(builder: CVBuilderPage, f, record_testcase):
    """Candidate_104/122/140/160/174 - Giá trị mặc định rỗng."""
    record_testcase(f["tc"]["default"])
    expect(builder.field(f["label"])).to_have_value("")


@pytest.mark.parametrize("f", _cases("placeholder"))
def test_candidate_builder_field_placeholder(builder: CVBuilderPage, f, record_testcase):
    """Candidate_105/123/141/161/175 - Placeholder đúng tài liệu ("" = placeholder trống)."""
    record_testcase(f["tc"]["placeholder"])
    field = builder.field(f["label"])
    actual = field.get_attribute("placeholder") or ""
    assert actual == f["placeholder"], f"Placeholder '{actual}' khác tài liệu '{f['placeholder']}'"


@pytest.mark.parametrize("f", _cases("required"))
def test_candidate_builder_field_required(builder: CVBuilderPage, f, record_testcase):
    """Candidate_106 - Bỏ trống trường bắt buộc, nhấn Lưu CV: "Vui lòng điền vào trường này"."""
    record_testcase(f["tc"]["required"])
    field = builder.field(f["label"])
    field.fill("")

    _assert_not_saved_with_message(builder, field, MSG["required_field"])


@pytest.mark.parametrize("f", _cases("spaces"))
def test_candidate_builder_field_only_spaces(builder: CVBuilderPage, builder_candidate, f, record_testcase):
    """Candidate_107 (bắt buộc: báo "Vui lòng điền vào trường này") /
    Candidate_125/143/163/177 (không bắt buộc: tự trim, lưu giá trị rỗng)."""
    record_testcase(f["tc"]["spaces"])
    field = builder.field(f["label"])
    field.fill("     ")

    if f["required"]:
        _assert_not_saved_with_message(builder, field, MSG["required_field"])
    else:
        _save_ok(builder)
        assert _saved(builder_candidate, f["key"]) == "", f"Giá trị lưu: {_saved(builder_candidate, f['key'])!r}"


@pytest.mark.parametrize("f", _cases("optional"))
def test_candidate_builder_field_optional(builder: CVBuilderPage, f, record_testcase):
    """Candidate_124/142/162/176 - Bỏ trống trường không bắt buộc, nhập hợp lệ các trường khác: cho phép lưu."""
    record_testcase(f["tc"]["optional"])
    builder.field("Họ và tên").fill(FULL["fullName"])
    builder.field(f["label"]).fill("")

    _save_ok(builder)
    expect(builder.error_alert).to_have_count(0)


@pytest.mark.parametrize("f", _cases("trim"))
def test_candidate_builder_field_trim(builder: CVBuilderPage, builder_candidate, f, record_testcase):
    """Candidate_108/126/144/164/178 - Khoảng trắng đầu/cuối được cắt bỏ khi lưu."""
    record_testcase(f["tc"]["trim"])
    value = {"email": "trim@example.com", "phone": "0912345678"}.get(f["key"], "Giá trị có khoảng trắng")
    if f["key"] != "fullName":
        builder.field("Họ và tên").fill(FULL["fullName"])
    builder.field(f["label"]).fill(f"   {value}   ")

    _save_ok(builder)

    assert _saved(builder_candidate, f["key"]) == value, f"Giá trị lưu: {_saved(builder_candidate, f['key'])!r}"


@pytest.mark.parametrize("f, fmt, tc_id", _format_cases(save=False))
def test_candidate_builder_field_formats(builder: CVBuilderPage, f, fmt, tc_id, record_testcase):
    """Candidate_109..114,116 / 127..132,134 / 145..150,152 / 179..184,186 - Chữ thường, in hoa, không dấu,
    có dấu, số, ký tự đặc biệt, emoji: cho phép nhập, không cảnh báo, hiển thị đúng (không lỗi font)."""
    record_testcase(tc_id)
    field = builder.field(f["label"])

    field.fill(fmt["value"])

    expect(field).to_have_value(fmt["value"])
    expect(builder.error_alert).to_have_count(0)
    if f["key"] in ("fullName", "title", "summary"):  # hiển thị ở khung xem trước
        expect(builder.paper).to_contain_text(fmt["value"])


@pytest.mark.parametrize("f, fmt, tc_id", _format_cases(save=True))
def test_candidate_builder_field_html(builder: CVBuilderPage, builder_candidate, f, fmt, tc_id, record_testcase):
    """Candidate_115/133/151/185 - Nhập HTML/encode: cho phép nhập; sau khi lưu hiển thị dạng text, không thực thi mã."""
    record_testcase(tc_id)
    page = builder.page
    if f["key"] != "fullName":
        builder.field("Họ và tên").fill(FULL["fullName"])
    builder.field(f["label"]).fill(fmt["value"])

    _save_ok(builder)
    page.reload(wait_until="domcontentloaded")
    builder.wait_ready()

    expect(builder.field(f["label"])).to_have_value(fmt["value"])
    assert page.evaluate("() => window.__xss") is None, "Mã HTML/script đã được thực thi"
    if f["key"] != "email":
        expect(builder.paper).to_contain_text(fmt["value"])
    assert builder.paper.locator("img[src='x'], b").count() == 0, "Thẻ HTML được dựng thành phần tử thật"


@pytest.mark.parametrize("f", _cases("copy_paste"))
def test_candidate_builder_field_copy_paste(builder: CVBuilderPage, context, f, record_testcase):
    """Candidate_117/135/153/165/187 - Copy/paste dữ liệu thành công."""
    record_testcase(f["tc"]["copy_paste"])
    context.grant_permissions(["clipboard-read", "clipboard-write"])
    value = {"email": "copy.paste@example.com", "phone": "0987654321"}.get(f["key"], "Nội dung copy/paste")
    builder.page.evaluate("t => navigator.clipboard.writeText(t)", value)
    field = builder.field(f["label"])

    field.fill("")
    field.focus()
    field.press("ControlOrMeta+v")

    expect(field).to_have_value(value)


def _maxlength_cases():
    out = []
    for f in FIELDS:
        if "maxlength" not in f:
            continue
        m = f["maxlength"]
        out += [pytest.param(f, "max_over", m + 1, id=f["tc"]["max_over"]),
                pytest.param(f, "max_equal", m, id=f["tc"]["max_equal"]),
                pytest.param(f, "max_under", m - 1, id=f["tc"]["max_under"])]
    return out


@pytest.mark.parametrize("f, kind, length", _maxlength_cases())
def test_candidate_builder_field_maxlength(builder: CVBuilderPage, f, kind, length, record_testcase):
    """Candidate_118..120 (150), 136..138 (255), 154..156 (255), 166..168 (20) - > max bị chặn; = max, < max nhập đủ."""
    record_testcase(f["tc"][kind])
    if f["key"] == "email":
        value = ("a" * (length - len("@example.com"))) + "@example.com"
    elif f["key"] == "phone":
        value = ("0912345678" * 5)[:length]
    else:
        value = ("Anh " * length)[:length]
    field = builder.field(f["label"])

    field.fill(value)

    actual = field.input_value()
    if kind == "max_over":
        assert len(actual) <= f["maxlength"], f"Nhập được {len(actual)} ký tự (maxlength {f['maxlength']})"
    else:
        assert actual == value, f"Chỉ nhập được {len(actual)}/{length} ký tự"


# ---------------------------------------------------------------- Email / Số điện thoại
@pytest.mark.testcase("Candidate_157")
@pytest.mark.parametrize("email", DATA["valid_emails"])
def test_candidate_157_valid_email(builder: CVBuilderPage, email):
    """Candidate_157 - Email hợp lệ: nhập thành công, không cảnh báo."""
    field = builder.field("Email")
    builder.field("Họ và tên").fill(FULL["fullName"])
    field.fill(email)

    assert field.evaluate("el => el.checkValidity()"), f"Email hợp lệ '{email}' bị báo lỗi"
    _save_ok(builder)


@pytest.mark.testcase("Candidate_158")
@pytest.mark.parametrize("email", DATA["invalid_emails"])
def test_candidate_158_invalid_email(builder: CVBuilderPage, email):
    """Candidate_158 - Email sai định dạng, nhấn Lưu CV: "Vui lòng nhập email hợp lệ"."""
    builder.field("Họ và tên").fill(FULL["fullName"])
    field = builder.field("Email")
    field.fill(email)

    _assert_not_saved_with_message(builder, field, MSG["invalid_email"])


@pytest.mark.testcase("Candidate_169")
@pytest.mark.parametrize("phone", DATA["valid_phones"])
def test_candidate_169_valid_phone(builder: CVBuilderPage, builder_candidate, phone):
    """Candidate_169 - Số điện thoại hợp lệ (0912345678, +84912345678): nhập thành công, không cảnh báo."""
    builder.field("Họ và tên").fill(FULL["fullName"])
    builder.field("Số điện thoại").fill(phone)

    _save_ok(builder)
    assert _saved(builder_candidate, "phone") == phone


@pytest.mark.parametrize("case", DATA["invalid_phones"], ids=[c["tc_id"] for c in DATA["invalid_phones"]])
def test_candidate_170_172_invalid_phone(builder: CVBuilderPage, case, record_testcase):
    """Candidate_170..172 - SĐT là chữ / có ký tự đặc biệt / quá ngắn: "Số điện thoại không hợp lệ", không lưu."""
    record_testcase(case["tc_id"])
    builder.field("Họ và tên").fill(FULL["fullName"])
    field = builder.field("Số điện thoại")
    field.fill(case["value"])

    _assert_not_saved_with_message(builder, field, MSG["invalid_phone"])


# ---------------------------------------------------------------- textarea Tóm tắt nghề nghiệp
@pytest.mark.testcase("Candidate_188")
def test_candidate_188_textarea_multiline(builder: CVBuilderPage, builder_candidate):
    """Candidate_188 - Nội dung nhiều dòng (Enter): lưu và hiển thị đúng các dòng."""
    builder.field("Họ và tên").fill(FULL["fullName"])
    summary = builder.field("Tóm tắt nghề nghiệp")
    summary.fill("")
    summary.press_sequentially("Dòng 1")
    summary.press("Enter")
    summary.press_sequentially("Dòng 2")
    summary.press("Enter")
    summary.press_sequentially("Dòng 3")

    _save_ok(builder)
    builder.page.reload(wait_until="domcontentloaded")
    builder.wait_ready()

    assert _saved(builder_candidate, "summary") == "Dòng 1\nDòng 2\nDòng 3"
    expect(builder.field("Tóm tắt nghề nghiệp")).to_have_value("Dòng 1\nDòng 2\nDòng 3")
    lines = builder.preview_section("GIỚI THIỆU").locator("p").inner_text().splitlines()
    assert lines == ["Dòng 1", "Dòng 2", "Dòng 3"], f"Xem trước hiển thị: {lines}"


@pytest.mark.testcase("Candidate_189")
def test_candidate_189_textarea_scroll(builder: CVBuilderPage):
    """Candidate_189 - Nội dung dài vượt chiều cao textarea: có thanh cuộn hoặc tự giãn, không vỡ giao diện."""
    summary = builder.field("Tóm tắt nghề nghiệp")
    before = summary.bounding_box()["height"]

    summary.fill("\n".join(f"Dòng nội dung số {i}" for i in range(1, 41)))

    info = summary.evaluate(
        "el => ({sh: el.scrollHeight, ch: el.clientHeight, oy: getComputedStyle(el).overflowY})"
    )
    grew = summary.bounding_box()["height"] > before
    scrollable = info["sh"] > info["ch"] and info["oy"] in ("auto", "scroll")
    assert grew or scrollable, f"Textarea không cuộn / không giãn: {info}"
    assert horizontal_overflow(builder.page) == 0, "Trang bị tràn ngang"


# ---------------------------------------------------------------- Kinh nghiệm / Học vấn / Kỹ năng
@pytest.mark.testcase("Candidate_190")
def test_candidate_190_add_experience(builder: CVBuilderPage):
    """Candidate_190 - Nhấn "Thêm kinh nghiệm": thêm 1 khối Chức danh, Công ty, Thời gian, Mô tả công việc và thành tựu."""
    expect(builder.experience(2)).to_have_count(0)

    builder.add_experience_button.click()

    item = builder.experience(2)
    expect(item).to_be_visible()
    for label in ("Chức danh", "Công ty", "Thời gian", "Mô tả công việc và thành tựu"):
        expect(builder.item_field(item, label)).to_have_value("")


@pytest.mark.testcase("Candidate_191")
def test_candidate_191_remove_experience(builder: CVBuilderPage):
    """Candidate_191 - Nhấn "Xóa" trên khối kinh nghiệm thứ n: khối bị xóa, khung xem trước cập nhật."""
    builder.item_field(builder.experience(1), "Chức danh").fill("Kế toán viên")
    builder.add_experience_button.click()
    builder.item_field(builder.experience(2), "Chức danh").fill("Trưởng phòng kinh doanh")
    expect(builder.paper).to_contain_text("Trưởng phòng kinh doanh")

    builder.remove_experience_button(2).click()

    expect(builder.experience(2)).to_have_count(0)
    expect(builder.paper).not_to_contain_text("Trưởng phòng kinh doanh")
    expect(builder.paper).to_contain_text("Kế toán viên")


@pytest.mark.testcase("Candidate_192")
def test_candidate_192_add_remove_education(builder: CVBuilderPage):
    """Candidate_192 - "Thêm học vấn": thêm khối học vấn; "Xóa": khối bị xóa."""
    builder.add_education_button.click()
    expect(builder.education(2)).to_be_visible()
    builder.item_field(builder.education(2), "Trường học").fill("Đại học Bách khoa")
    expect(builder.paper).to_contain_text("Đại học Bách khoa")

    builder.remove_education_button(2).click()

    expect(builder.education(2)).to_have_count(0)
    expect(builder.paper).not_to_contain_text("Đại học Bách khoa")


@pytest.mark.testcase("Candidate_193")
def test_candidate_193_skills_comma_separated(builder: CVBuilderPage):
    """Candidate_193 - Nhập "Bán hàng, Đàm phán, Excel": khung xem trước hiển thị 3 kỹ năng riêng biệt."""
    builder.field("Kỹ năng").fill("Bán hàng, Đàm phán, Excel")

    expect(builder.preview_skills).to_have_text(["Bán hàng", "Đàm phán", "Excel"])


# ---------------------------------------------------------------- khung Xem trước
@pytest.mark.testcase("Candidate_194")
def test_candidate_194_live_preview(builder: CVBuilderPage):
    """Candidate_194 - Nhập dữ liệu: khung xem trước cập nhật trực tiếp."""
    builder.field("Họ và tên").fill("Trần Thị Bình")
    builder.field("Vị trí ứng tuyển").fill("Kế toán tổng hợp")
    builder.field("Email").fill("binh@example.com")
    builder.field("Tóm tắt nghề nghiệp").fill("5 năm kinh nghiệm kế toán")

    expect(builder.preview_name).to_have_text("Trần Thị Bình")
    expect(builder.preview_title).to_have_text("Kế toán tổng hợp")
    expect(builder.preview_contact).to_contain_text("binh@example.com")
    expect(builder.preview_section("GIỚI THIỆU")).to_contain_text("5 năm kinh nghiệm kế toán")


@pytest.mark.testcase("Candidate_195")
def test_candidate_195_empty_preview(builder: CVBuilderPage):
    """Candidate_195 - Mở lần đầu: "CV của bạn đang dần hoàn thiện" - "Điền các mục bên trái để xem nội dung..."."""
    expect(builder.preview_empty).to_contain_text(MSG["preview_empty_title"])
    expect(builder.preview_empty).to_contain_text(MSG["preview_empty_description"])


# ---------------------------------------------------------------- button
@pytest.mark.testcase("Candidate_196")
def test_candidate_196_print_label(builder: CVBuilderPage):
    """Candidate_196 - Label "Tải CV dạng PDF" đúng chính tả."""
    expect(builder.print_button).to_have_text(MSG["print_button"])


@pytest.mark.testcase("Candidate_197")
def test_candidate_197_print_pdf(builder: CVBuilderPage):
    """Candidate_197 (bán tự động) - Nhấn "Tải CV dạng PDF": mở cửa sổ in.

    Hộp thoại in của hệ điều hành không điều khiển được -> thay window.print bằng hàm đếm để xác nhận đã gọi;
    nội dung PDF xuất ra (đúng xem trước, khổ A4) xem Candidate_207/208.
    """
    builder.stub_print()

    builder.print_button.click()

    assert builder.print_calls() == 1, "Không mở cửa sổ in"


@pytest.mark.testcase("Candidate_198")
def test_candidate_198_save_label(builder: CVBuilderPage):
    """Candidate_198 - Label "Lưu CV" đúng chính tả."""
    expect(builder.save_button).to_have_text(MSG["save_button"])
