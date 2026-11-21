"""UI test màn hình "Tải CV mới" (/cv/new) – Candidate_42, 43, 48..50, 52, 56..58, 60..63, 67..72, 74..82, 84, 85.

Nguồn: KBKTCN_ATS_WEB_v1.0.xlsx, sheet "Ứng viên", mục "Tải lên CV".
Test ở đây không tải CV lên thành công (trừ khi chặn request) -> dùng chung shared_candidate.
"""
import re

import pytest
from playwright.sync_api import Page, expect

from pages.cv_form_page import CVUploadPage
from utils.cv_files import MB, broken_docx, docx_cv, empty_pdf, invalid_files, pdf_cv
from utils.data_loader import load_test_data

DATA = load_test_data("cv.json")
MSG = DATA["messages"]
TITLE = DATA["upload_title_field"]
FILL_ONLY_FORMATS = [f for f in TITLE["formats"] if not f.get("save")]

pytestmark = [pytest.mark.ui, pytest.mark.cv, pytest.mark.cv_upload]


def _file_title(name: str) -> str:
    """Tên CV gợi ý theo tên file (FE/frontend/src/utils/file.js: fileTitle)."""
    return re.sub(r"\s+", " ", re.sub(r"[_-]+", " ", re.sub(r"\.[^.]+$", "", name))).strip()


@pytest.fixture
def upload_page(login_as, shared_candidate, page: Page, settings) -> CVUploadPage:
    login_as(shared_candidate)
    return CVUploadPage(page, settings).open()


# ---------------------------------------------------------------- giao diện chung
@pytest.mark.smoke
@pytest.mark.testcase("Candidate_42")
def test_candidate_42_default_layout(upload_page: CVUploadPage):
    """Candidate_42 - Title "Tải CV mới"; khu vực tải file (PDF, DOCX · tối đa 5MB); thông báo xử lý bằng AI;
    checkbox Đồng ý xử lý dữ liệu bằng AI (lần đầu); textbox Tên CV; button Tải CV lên; header, footer."""
    expect(upload_page.heading).to_have_text(MSG["upload_title"])
    expect(upload_page.dropzone.root).to_be_visible()
    expect(upload_page.dropzone_hint).to_have_text(MSG["upload_hint"])
    expect(upload_page.title_input).to_be_visible()
    expect(upload_page.submit_button).to_have_text(MSG["upload_button"])
    expect(upload_page.shell.header).to_be_visible()
    expect(upload_page.shell.footer).to_be_visible()
    expect(upload_page.ai_notice, "Thiếu thông báo CV sẽ được xử lý bằng AI").to_be_visible()


@pytest.mark.testcase("Candidate_43")
def test_candidate_43_required_mark(upload_page: CVUploadPage):
    """Candidate_43 (phần tự động) - Trường bắt buộc (File CV) có dấu *. Bố cục/font/chính tả: kiểm tra tay."""
    expect(upload_page.file_label.locator(".required-mark")).to_have_text("*")
    expect(upload_page.page.locator("label[for='title'] .required-mark")).to_have_count(0)


# ---------------------------------------------------------------- upload CV
@pytest.mark.testcase("Candidate_48")
def test_candidate_48_dropzone_display(upload_page: CVUploadPage):
    """Candidate_48 - Khu vực kéo thả/chọn file kèm hướng dẫn "PDF, DOCX · tối đa 5MB"."""
    expect(upload_page.dropzone.root).to_contain_text("Kéo thả file vào đây")
    expect(upload_page.dropzone.choose_link).to_be_visible()
    expect(upload_page.dropzone_hint).to_have_text(MSG["upload_hint"])
    expect(upload_page.dropzone.input).to_have_attribute("accept", ".pdf,.docx")


@pytest.mark.testcase("Candidate_49")
def test_candidate_49_choose_file(upload_page: CVUploadPage):
    """Candidate_49 - Chọn file hợp lệ từ máy: hiển thị tên file, dung lượng, "Sẵn sàng tải lên"."""
    file = pdf_cv()
    with upload_page.page.expect_file_chooser() as fc:
        upload_page.dropzone.choose_link.click()
    fc.value.set_files(file.payload())

    expect(upload_page.file_card_name).to_have_text(file.name)
    expect(upload_page.file_card_note).to_contain_text(re.compile(r"\d+(\.\d+)?\s*(B|KB|MB)"))
    expect(upload_page.file_card_note).to_contain_text(MSG["upload_ready"])


@pytest.mark.testcase("Candidate_50")
def test_candidate_50_drag_and_drop(upload_page: CVUploadPage):
    """Candidate_50 - Kéo thả file hợp lệ: hiển thị tên file, dung lượng, "Sẵn sàng tải lên"."""
    file = docx_cv()
    upload_page.dropzone.drop(file)

    expect(upload_page.file_card_name).to_have_text(file.name)
    expect(upload_page.file_card_note).to_contain_text(MSG["upload_ready"])


@pytest.mark.testcase("Candidate_52")
@pytest.mark.parametrize("ext", ["exe", "txt", "xlsx", "zip"])
def test_candidate_52_unsupported_format(upload_page: CVUploadPage, ext):
    """Candidate_52 - File sai định dạng (.exe, .txt, .xlsx, .zip): báo lỗi định dạng ngay, yêu cầu chọn lại."""
    upload_page.choose_file(invalid_files()[ext])

    expect(upload_page.file_error).to_be_visible()
    expect(upload_page.file_error).to_contain_text(re.compile("PDF|DOCX|định dạng", re.I))
    expect(upload_page.file_card).to_have_count(0)
    expect(upload_page.dropzone.root).to_be_visible()


@pytest.mark.testcase("Candidate_56")
def test_candidate_56_file_over_5mb(upload_page: CVUploadPage):
    """Candidate_56 - File > 5MB: báo lỗi "File vượt quá 5MB", yêu cầu chọn lại."""
    upload_page.choose_file(pdf_cv(pad_to=5 * MB + 1))

    expect(upload_page.file_error).to_contain_text(MSG["upload_too_large"])
    expect(upload_page.file_card).to_have_count(0)


@pytest.mark.testcase("Candidate_57")
@pytest.mark.parametrize("kind", ["empty_0_byte", "broken"])
def test_candidate_57_empty_or_broken_file(upload_page: CVUploadPage, kind):
    """Candidate_57 - File 0 byte hoặc hỏng: báo lỗi không đọc được file."""
    file = empty_pdf() if kind == "empty_0_byte" else broken_docx()
    upload_page.choose_file(file)
    if kind == "broken":  # chữ ký ZIP hợp lệ nên FE cho chọn; backend kiểm tra nội dung khi tải lên
        expect(upload_page.file_card).to_be_visible()
        upload_page.submit_and_wait()

    error = upload_page.file_error.or_(upload_page.form_error)
    expect(error).to_be_visible()
    expect(upload_page.page).to_have_url(CVUploadPage.URL_PATTERN)


@pytest.mark.testcase("Candidate_58")
def test_candidate_58_cancel_file_dialog(upload_page: CVUploadPage):
    """Candidate_58 - Mở hộp thoại chọn file rồi Cancel: không có file nào được chọn, giữ nguyên trạng thái."""
    upload_page.dropzone.cancel_chooser()

    expect(upload_page.file_card).to_have_count(0)
    expect(upload_page.file_error).to_have_count(0)
    expect(upload_page.title_input).to_have_value("")


@pytest.mark.testcase("Candidate_60")
def test_candidate_60_replace_selected_file(upload_page: CVUploadPage):
    """Candidate_60 - Chọn file A rồi chọn lại file B: file B thay thế file A."""
    file_a, file_b = pdf_cv(), docx_cv()
    upload_page.choose_file(file_a)
    expect(upload_page.file_card_name).to_have_text(file_a.name)

    upload_page.change_file_button.click()
    upload_page.choose_file(file_b)

    expect(upload_page.file_card).to_have_count(1)
    expect(upload_page.file_card_name).to_have_text(file_b.name)


# ---------------------------------------------------------------- textbox Tên CV
@pytest.mark.testcase(TITLE["tc"]["display"])
def test_candidate_61_title_display(upload_page: CVUploadPage):
    """Candidate_61 - Textbox Tên CV hiển thị, nhập được (kích thước / màu viền so với thiết kế: kiểm tra tay)."""
    expect(upload_page.title_input).to_be_visible()
    expect(upload_page.title_input).to_be_editable()
    box = upload_page.title_input.bounding_box()
    assert box and box["width"] > 100 and box["height"] >= 24, f"Kích thước textbox bất thường: {box}"


@pytest.mark.testcase(TITLE["tc"]["default"])
def test_candidate_62_title_default_from_file(upload_page: CVUploadPage):
    """Candidate_62 - Giá trị mặc định lấy theo tên file đã chọn."""
    file = pdf_cv("NguyenVanAn_Sales-CV.pdf")
    expect(upload_page.title_input).to_have_value("")

    upload_page.choose_file(file)

    expect(upload_page.title_input).to_have_value(_file_title(file.name))


@pytest.mark.testcase(TITLE["tc"]["placeholder"])
def test_candidate_63_title_placeholder(upload_page: CVUploadPage):
    """Candidate_63 - Placeholder: "VD: CV Nhân viên kinh doanh 2026"."""
    expect(upload_page.title_input).to_have_attribute("placeholder", MSG["title_placeholder"])


@pytest.mark.parametrize("case", FILL_ONLY_FORMATS, ids=[c["tc_id"] for c in FILL_ONLY_FORMATS])
def test_candidate_67_74_title_formats(upload_page: CVUploadPage, case, record_testcase):
    """Candidate_67..72, 74 - Nhập chữ thường / in hoa / không dấu / có dấu / số / ký tự đặc biệt / emoji:
    cho phép nhập, không cảnh báo, hiển thị đúng (Candidate_73 nhập HTML nằm ở test function)."""
    record_testcase(case["tc_id"])
    upload_page.title_input.fill(case["value"])

    expect(upload_page.title_input).to_have_value(case["value"])
    assert upload_page.title_input.evaluate("el => el.checkValidity()"), "Textbox báo không hợp lệ"
    expect(upload_page.form_error).to_have_count(0)


@pytest.mark.testcase(TITLE["tc"]["copy_paste"])
def test_candidate_75_title_copy_paste(upload_page: CVUploadPage, context):
    """Candidate_75 - Copy/paste dữ liệu vào textbox Tên CV thành công."""
    context.grant_permissions(["clipboard-read", "clipboard-write"])
    value = "CV Kế toán tổng hợp 2026"
    upload_page.page.evaluate("t => navigator.clipboard.writeText(t)", value)

    upload_page.title_input.focus()
    upload_page.title_input.press("ControlOrMeta+v")

    expect(upload_page.title_input).to_have_value(value)


@pytest.mark.parametrize(
    "tc_key, length",
    [("max_over", TITLE["maxlength"] + 1), ("max_equal", TITLE["maxlength"]), ("max_under", TITLE["maxlength"] - 1)],
    ids=[TITLE["tc"]["max_over"], TITLE["tc"]["max_equal"], TITLE["tc"]["max_under"]],
)
def test_candidate_76_78_title_maxlength(upload_page: CVUploadPage, tc_key, length, record_testcase):
    """Candidate_76..78 - Maxlength 255: > max bị chặn; = max và < max nhập được đủ."""
    record_testcase(TITLE["tc"][tc_key])
    value = ("CV" * length)[:length]

    upload_page.title_input.fill(value)

    actual = upload_page.title_input.input_value()
    if tc_key == "max_over":
        assert len(actual) <= TITLE["maxlength"], f"Nhập được {len(actual)} ký tự (> {TITLE['maxlength']})"
    else:
        assert actual == value, f"Chỉ nhập được {len(actual)}/{length} ký tự"


# ---------------------------------------------------------------- checkbox Đồng ý xử lý dữ liệu bằng AI
@pytest.mark.testcase("Candidate_79")
def test_candidate_79_ai_consent_display(upload_page: CVUploadPage):
    """Candidate_79 - Checkbox "Đồng ý xử lý dữ liệu bằng AI" hiển thị, label đúng chính tả."""
    expect(upload_page.ai_consent_checkbox, "Màn hình chưa có checkbox Đồng ý xử lý dữ liệu bằng AI").to_be_visible()


@pytest.mark.testcase("Candidate_80")
def test_candidate_80_ai_consent_default(login_as, candidate, page: Page, settings):
    """Candidate_80 - Mặc định không được chọn (chỉ hiển thị ở lần tải đầu tiên)."""
    login_as(candidate)
    upload = CVUploadPage(page, settings).open()

    expect(upload.ai_consent_checkbox, "Màn hình chưa có checkbox Đồng ý xử lý dữ liệu bằng AI").to_be_visible()
    expect(upload.ai_consent_checkbox).not_to_be_checked()


@pytest.mark.testcase("Candidate_81")
def test_candidate_81_ai_consent_required(login_as, candidate, page: Page, settings):
    """Candidate_81 - Chọn / bỏ chọn được; khi chưa chọn không cho phép tải CV lên."""
    login_as(candidate)
    upload = CVUploadPage(page, settings).open()
    expect(upload.ai_consent_checkbox, "Màn hình chưa có checkbox Đồng ý xử lý dữ liệu bằng AI").to_be_visible()

    upload.ai_consent_checkbox.check()
    expect(upload.ai_consent_checkbox).to_be_checked()
    upload.ai_consent_checkbox.uncheck()
    expect(upload.ai_consent_checkbox).not_to_be_checked()

    upload.choose_file(pdf_cv())
    upload.submit()
    expect(page).to_have_url(CVUploadPage.URL_PATTERN)
    assert candidate.list_cvs() == [], "Chưa đồng ý xử lý AI nhưng CV vẫn được tải lên"


# ---------------------------------------------------------------- button Tải CV lên
@pytest.mark.testcase("Candidate_82")
def test_candidate_82_submit_label(upload_page: CVUploadPage):
    """Candidate_82 - Label button đúng chính tả: "Tải CV lên"."""
    expect(upload_page.submit_button).to_have_text(MSG["upload_button"])


@pytest.mark.testcase("Candidate_84")
def test_candidate_84_submit_without_file(upload_page: CVUploadPage):
    """Candidate_84 - Không chọn file, nhấn Tải CV lên: "Vui lòng chọn file CV để tải lên."."""
    upload_page.submit()

    expect(upload_page.form_error).to_have_text(MSG["upload_no_file"])
    expect(upload_page.page).to_have_url(CVUploadPage.URL_PATTERN)


@pytest.mark.testcase("Candidate_85")
def test_candidate_85_button_while_uploading(login_as, candidate, page: Page, settings):
    """Candidate_85 - Nhấn Tải CV lên: button hiển thị "Đang tải lên..." và bị disable."""
    held = []
    page.route("**/candidate/cvs/", lambda route: held.append(route) if route.request.method == "POST" else route.continue_())
    login_as(candidate)
    upload = CVUploadPage(page, settings).open()
    upload.choose_file(pdf_cv())

    upload.submit()

    expect(upload.submit_button).to_have_text(MSG["uploading_button"])
    expect(upload.submit_button).to_be_disabled()
    for route in held:
        route.abort()
    page.unroute("**/candidate/cvs/")
