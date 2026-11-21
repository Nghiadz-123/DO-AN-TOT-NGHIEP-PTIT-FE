"""Function test màn hình "CV của tôi" (/cv) – Candidate_17..19, 24, 27, 29..41.

Nguồn: KBKTCN_ATS_WEB_v1.0.xlsx, sheet "Ứng viên", mục "CV của tôi".
Mỗi test làm thay đổi dữ liệu dùng tài khoản ứng viên MỚI (tạo qua API). Phía nhà tuyển dụng kiểm tra qua API:
  employer/talents/{candidate_id}/cv/   -> CV chính của ứng viên công khai (404 khi không được xem)
  employer/applications/{id}/cv/        -> CV đã nộp trong đơn
"""
import re

import pytest
from playwright.sync_api import Page, expect

from pages.cv_analysis_page import CVAnalysisPage
from pages.cv_form_page import CVEditPage, CVUploadPage
from pages.cv_list_page import CVListPage
from utils.cv_files import pdf_cv
from utils.data_loader import load_test_data

DATA = load_test_data("cv.json")
MSG = DATA["messages"]

pytestmark = [pytest.mark.function, pytest.mark.cv, pytest.mark.cv_list]


def _open_list(login_as, client, page, settings) -> CVListPage:
    login_as(client)
    lst = CVListPage(page, settings).open()
    lst.wait_list_ready()
    return lst


def _default_and_other(client):
    cvs = client.list_cvs()
    return next(c for c in cvs if c["is_default"]), next(c for c in cvs if not c["is_default"])


def _open_apply_popup(page: Page, settings, job_id: str):
    """Mở popup Ứng tuyển của 1 tin (JobDetailPage: nút "Ứng tuyển ngay" -> dialog "Ứng tuyển: {title}")."""
    page.goto(f"{settings.base_url}/jobs/{job_id}", wait_until="domcontentloaded")
    page.get_by_role("button", name="Ứng tuyển ngay").first.click()
    dialog = page.get_by_role("dialog")
    expect(dialog).to_be_visible()
    return dialog


def _checked_cv_title(dialog) -> str:
    option = dialog.locator("label.cv-option:has(input[type='radio']:checked)")
    return option.locator("strong").inner_text().strip()


# ---------------------------------------------------------------- menu thao tác
@pytest.mark.testcase("Candidate_17")
def test_candidate_17_download(login_as, candidate_with_cvs, page: Page, settings):
    """Candidate_17 - Chọn "Tải về": file CV gốc được tải về, đúng nội dung."""
    cv = candidate_with_cvs.cvs[0]
    original = candidate_with_cvs.cv_file(cv["id"], download=True).body()
    lst = _open_list(login_as, candidate_with_cvs, page, settings)

    download = lst.download(cv["title"])

    assert download.suggested_filename == cv["original_filename"], download.suggested_filename
    with open(download.path(), "rb") as f:
        assert f.read() == original, "Nội dung file tải về khác file CV gốc"


@pytest.mark.testcase("Candidate_18")
def test_candidate_18_edit_info(login_as, candidate_with_cvs, page: Page, settings):
    """Candidate_18 - Sửa thông tin -> đổi Tên CV -> Lưu thay đổi: thông báo "Đã lưu thay đổi CV", tên mới trong danh sách."""
    cv = candidate_with_cvs.cvs[1]
    new_title = f"{DATA['rename_value']} - 18"
    lst = _open_list(login_as, candidate_with_cvs, page, settings)

    lst.choose_menu(cv["title"], "Sửa thông tin")
    edit = CVEditPage(page, settings)
    expect(edit.heading).to_be_visible()
    response = edit.rename(new_title)

    assert response.ok, f"API đổi tên trả {response.status}"
    lst.expect_loaded()
    expect(lst.flash).to_contain_text(MSG["rename_saved"])
    expect(lst.card_title_link(new_title)).to_be_visible()


@pytest.mark.testcase("Candidate_19")
def test_candidate_19_set_default(login_as, candidate_with_cvs, page: Page, settings):
    """Candidate_19 - "Đặt làm CV chính" trên CV khác: CV đó có nhãn "CV chính", CV cũ mất nhãn."""
    old_default, other = _default_and_other(candidate_with_cvs)
    lst = _open_list(login_as, candidate_with_cvs, page, settings)

    lst.set_default(other["title"])

    expect(lst.card_badge(other["title"], MSG["default_badge"])).to_be_visible()
    expect(lst.card_badge(old_default["title"], MSG["default_badge"])).to_have_count(0)
    assert candidate_with_cvs.default_cv()["id"] == other["id"]


@pytest.mark.testcase("Candidate_24")
def test_candidate_24_confirm_delete(login_as, candidate_with_cvs, page: Page, settings):
    """Candidate_24 - Nhấn "Xóa CV" trong popup: CV bị xóa khỏi danh sách."""
    _, other = _default_and_other(candidate_with_cvs)
    lst = _open_list(login_as, candidate_with_cvs, page, settings)

    lst.delete(other["title"])

    expect(lst.dialog.root).to_be_hidden()
    expect(lst.card(other["title"])).to_have_count(0)
    assert other["id"] not in {c["id"] for c in candidate_with_cvs.list_cvs()}


# ---------------------------------------------------------------- công khai CV
@pytest.mark.testcase("Candidate_27")
def test_candidate_27_toggle_public(login_as, candidate_with_cvs, recruiter, page: Page, settings):
    """Candidate_27 - Bật: CV chính được công khai, NTD xem được. Tắt: CV bị ẩn khỏi Tìm ứng viên của NTD."""
    profile_id = candidate_with_cvs.profile()["id"]
    default, _ = _default_and_other(candidate_with_cvs)
    lst = _open_list(login_as, candidate_with_cvs, page, settings)

    lst.toggle_public()
    expect(lst.public_switch).to_be_checked()
    expect(lst.public_switch_text).to_have_text(MSG["switch_on"])
    status, file_name = recruiter.talent_cv(profile_id)
    assert status == 200 and file_name == default["original_filename"], f"Bật công khai nhưng NTD nhận {status} {file_name}"

    lst.toggle_public()
    expect(lst.public_switch).not_to_be_checked()
    expect(lst.public_switch_text).to_have_text(MSG["switch_off"])
    assert recruiter.talent_cv(profile_id)[0] == 404, "Đã tắt công khai nhưng NTD vẫn xem được CV"


# ---------------------------------------------------------------- nghiệp vụ
@pytest.mark.testcase("Candidate_29")
def test_candidate_29_first_cv_is_default(login_as, candidate, page: Page, settings):
    """Candidate_29 - Chưa có CV, tải lên CV đầu tiên: CV đó tự động là CV chính."""
    login_as(candidate)
    upload = CVUploadPage(page, settings).open()
    file = pdf_cv()

    response = upload.upload(file, title="CV đầu tiên")
    assert response.status == 201, f"Tải lên thất bại: {response.status} {response.text()}"

    lst = CVListPage(page, settings)
    lst.expect_loaded()
    expect(lst.card_badge("CV đầu tiên", MSG["default_badge"])).to_be_visible()
    assert candidate.default_cv()["title"] == "CV đầu tiên"


@pytest.mark.testcase("Candidate_30")
def test_candidate_30_default_preselected_when_apply(login_as, candidate_with_cvs, recruiter_job_id, page: Page, settings):
    """Candidate_30 - Đặt CV B làm CV chính, mở popup ứng tuyển: chỉ CV B có nhãn "CV chính" và được chọn sẵn."""
    _, cv_b = _default_and_other(candidate_with_cvs)
    lst = _open_list(login_as, candidate_with_cvs, page, settings)
    lst.set_default(cv_b["title"])
    expect(lst.cv_list.locator(".badge").filter(has_text=MSG["default_badge"])).to_have_count(1)

    dialog = _open_apply_popup(page, settings, recruiter_job_id)

    assert _checked_cv_title(dialog) == cv_b["title"], "CV chính mới không được chọn sẵn khi ứng tuyển"


@pytest.mark.testcase("Candidate_31")
def test_candidate_31_change_default_while_public(login_as, candidate_with_cvs, recruiter, page: Page, settings):
    """Candidate_31 - Đang công khai với CV A, đặt CV B làm CV chính: NTD xem được CV B, không còn thấy CV A."""
    cv_a, cv_b = _default_and_other(candidate_with_cvs)
    candidate_with_cvs.set_public(True)
    profile_id = candidate_with_cvs.profile()["id"]
    assert recruiter.talent_cv(profile_id)[1] == cv_a["original_filename"]
    lst = _open_list(login_as, candidate_with_cvs, page, settings)

    lst.set_default(cv_b["title"])

    expect(lst.card_badge(cv_b["title"], MSG["public_badge"])).to_be_visible()
    status, file_name = recruiter.talent_cv(profile_id)
    assert status == 200 and file_name == cv_b["original_filename"], f"NTD đang thấy: {status} {file_name}"


@pytest.mark.testcase("Candidate_32")
def test_candidate_32_enable_public(login_as, candidate_with_cvs, recruiter, page: Page, settings):
    """Candidate_32 - Bật công khai: CV chính có nhãn "Đang công khai"; NTD tìm thấy ứng viên.

    Phần "NTD tìm theo kỹ năng và gửi thư mời" kiểm tra ở bộ test Nhà tuyển dụng; ở đây xác nhận NTD
    xem được CV chính qua API Tìm ứng viên.
    """
    default, other = _default_and_other(candidate_with_cvs)
    lst = _open_list(login_as, candidate_with_cvs, page, settings)

    lst.toggle_public()

    expect(lst.card_badge(default["title"], MSG["public_badge"])).to_be_visible()
    expect(lst.card_badge(other["title"], MSG["public_badge"])).to_have_count(0)
    assert recruiter.talent_cv(candidate_with_cvs.profile()["id"])[0] == 200


@pytest.mark.testcase("Candidate_33")
def test_candidate_33_disable_public(login_as, candidate_with_cvs, recruiter, page: Page, settings):
    """Candidate_33 - Tắt công khai: NTD không còn tìm thấy ứng viên."""
    candidate_with_cvs.set_public(True)
    lst = _open_list(login_as, candidate_with_cvs, page, settings)
    expect(lst.public_switch).to_be_checked()

    lst.toggle_public()

    expect(lst.cv_list.locator(".badge").filter(has_text=MSG["public_badge"])).to_have_count(0)
    assert recruiter.talent_cv(candidate_with_cvs.profile()["id"])[0] == 404


@pytest.mark.testcase("Candidate_34")
def test_candidate_34_rename_reflected_everywhere(login_as, candidate_with_cvs, recruiter_job_id, page: Page, settings):
    """Candidate_34 - Đổi tên CV thành "CV Kế toán 2026", F5: tên mới ở danh sách, popup ứng tuyển, màn hình chấm điểm."""
    default, _ = _default_and_other(candidate_with_cvs)
    new_title = DATA["rename_value"]
    login_as(candidate_with_cvs)
    edit = CVEditPage(page, settings).open_cv(default["id"])
    edit.rename(new_title)
    lst = CVListPage(page, settings)
    lst.expect_loaded()

    page.reload(wait_until="domcontentloaded")
    expect(lst.card_title_link(new_title)).to_be_visible()

    dialog = _open_apply_popup(page, settings, recruiter_job_id)
    expect(dialog.locator("label.cv-option strong").filter(has_text=new_title)).to_be_visible()

    analysis = CVAnalysisPage(page, settings).open_cv()
    expect(analysis.item(new_title)).to_be_visible()


@pytest.mark.testcase("Candidate_35")
def test_candidate_35_rename_blank(login_as, candidate_with_cvs, page: Page, settings):
    """Candidate_35 - Xóa trắng tên CV rồi Lưu: báo lỗi hoặc giữ tên mặc định, không lưu tên rỗng."""
    cv = candidate_with_cvs.cvs[0]
    login_as(candidate_with_cvs)
    edit = CVEditPage(page, settings).open_cv(cv["id"])

    edit.title_input.fill("")
    edit.save_button.click()

    message = edit.title_input.evaluate("el => el.validationMessage")
    expect(page).to_have_url(CVEditPage.URL_PATTERN)
    assert message, "Không có thông báo lỗi khi để trống Tên CV"
    assert candidate_with_cvs.get_cv(cv["id"])["title"].strip() == cv["title"], "Tên CV bị lưu rỗng"


@pytest.mark.testcase("Candidate_36")
@pytest.mark.parametrize("kind", ["pdf", "docx"])
def test_candidate_36_download_original(login_as, candidate_with_cvs, page: Page, settings, kind):
    """Candidate_36 - "Tải về" trên CV PDF và CV DOCX: tải đúng file gốc, đúng tên file."""
    cv = next(c for c in candidate_with_cvs.cvs if c["mime_type"].endswith("pdf") == (kind == "pdf"))
    lst = _open_list(login_as, candidate_with_cvs, page, settings)

    download = lst.download(cv["title"])

    assert download.suggested_filename == cv["original_filename"]
    with open(download.path(), "rb") as f:
        assert f.read() == candidate_with_cvs.cv_file(cv["id"], download=True).body()


@pytest.mark.testcase("Candidate_37")
def test_candidate_37_delete_unused_cv(login_as, candidate_with_cvs, page: Page, settings):
    """Candidate_37 - Xóa CV "Chưa dùng để ứng tuyển": CV bị xóa khỏi danh sách, file bị xóa khỏi storage."""
    _, other = _default_and_other(candidate_with_cvs)
    lst = _open_list(login_as, candidate_with_cvs, page, settings)
    expect(lst.card(other["title"])).to_contain_text(MSG["unused_label"])

    lst.delete(other["title"])

    expect(lst.card(other["title"])).to_have_count(0)
    assert candidate_with_cvs.get_cv_raw(other["id"]).status == 404, "Vẫn đọc được CV đã xóa"
    assert candidate_with_cvs.cv_file(other["id"]).status == 404, "File CV đã xóa vẫn tải được"


@pytest.mark.testcase("Candidate_38")
def test_candidate_38_delete_applied_cv(login_as, candidate_with_cvs, recruiter, recruiter_job_id, page: Page, settings):
    """Candidate_38 - Xóa CV đã nộp vào 1 tin: CV bị xóa khỏi danh sách; NTD vẫn xem đúng phiên bản CV đã nộp."""
    _, cv = _default_and_other(candidate_with_cvs)
    application = candidate_with_cvs.apply(recruiter_job_id, cv["id"])
    lst = _open_list(login_as, candidate_with_cvs, page, settings)
    lst.open_menu(cv["title"])
    expect(lst.menu_item(cv["title"], "Xóa CV"), "Không có thao tác 'Xóa CV' cho CV đã dùng ứng tuyển").to_be_visible()
    lst.page.keyboard.press("Escape")

    lst.delete(cv["title"])

    expect(lst.card(cv["title"])).to_have_count(0)
    status, file_name = recruiter.application_cv(application["id"])
    assert status == 200 and file_name == cv["original_filename"], f"NTD không xem được CV đã nộp: {status}"


@pytest.mark.testcase("Candidate_39")
def test_candidate_39_delete_default_cv(login_as, candidate_with_cvs, page: Page, settings):
    """Candidate_39 - Có 2 CV, xóa CV chính: CV còn lại được đặt làm CV chính."""
    default, other = _default_and_other(candidate_with_cvs)
    lst = _open_list(login_as, candidate_with_cvs, page, settings)

    lst.delete(default["title"])

    expect(lst.card(default["title"])).to_have_count(0)
    expect(lst.card_badge(other["title"], MSG["default_badge"])).to_be_visible()
    assert candidate_with_cvs.default_cv()["id"] == other["id"]


@pytest.mark.testcase("Candidate_40")
def test_candidate_40_delete_only_public_cv(login_as, candidate_factory, recruiter, page: Page, settings):
    """Candidate_40 - Xóa CV duy nhất khi đang Công khai: danh sách trống, ứng viên không còn hiển thị với NTD."""
    client = candidate_factory(["pdf"])
    client.set_public(True)
    profile_id = client.profile()["id"]
    assert recruiter.talent_cv(profile_id)[0] == 200
    lst = _open_list(login_as, client, page, settings)

    lst.delete(client.cvs[0]["title"])

    expect(lst.empty_title).to_be_visible()
    assert recruiter.talent_cv(profile_id)[0] == 404, "Đã xóa CV duy nhất nhưng NTD vẫn xem được"


@pytest.mark.testcase("Candidate_41")
def test_candidate_41_access_other_candidate_cv(login_as, candidate, shared_candidate, page: Page, settings):
    """Candidate_41 - Đổi id CV trên URL/API thành CV của ứng viên khác: từ chối truy cập, không tải được file."""
    other_cv = shared_candidate.cvs[0]

    assert candidate.get_cv_raw(other_cv["id"]).status in (403, 404)
    assert candidate.cv_file(other_cv["id"], download=True).status in (403, 404)

    login_as(candidate)
    edit = CVEditPage(page, settings).open_cv(other_cv["id"])
    expect(edit.load_error).to_be_visible()
    expect(edit.title_input).to_have_count(0)
    expect(page.get_by_text(other_cv["title"], exact=True)).to_have_count(0)
