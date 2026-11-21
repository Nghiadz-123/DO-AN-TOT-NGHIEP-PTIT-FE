"""Function test "Tạo CV" (/create-cv) – Candidate_199..210.

Nguồn: KBKTCN_ATS_WEB_v1.0.xlsx, sheet "Ứng viên", mục "Tạo CV". Mỗi test dùng 1 tài khoản ứng viên mới.
"""
import io
import unicodedata

import pytest
from playwright.sync_api import Page, expect

from pages.cv_builder_page import CVBuilderPage
from pages.cv_list_page import CVListPage
from utils.data_loader import load_test_data

DATA = load_test_data("cv.json")
MSG = DATA["messages"]
FULL = DATA["builder_full"]

pytestmark = [pytest.mark.function, pytest.mark.cv, pytest.mark.cv_builder]


@pytest.fixture
def builder(login_as, candidate, page: Page, settings) -> CVBuilderPage:
    login_as(candidate)
    return CVBuilderPage(page, settings).open()


def _save_ok(builder: CVBuilderPage):
    response = builder.save()
    assert response.ok, f"Lưu CV thất bại: {response.status} {response.text()}"
    expect(builder.success_alert).to_have_text(MSG["builder_saved"])
    return response


def _form_values(builder: CVBuilderPage) -> list[str]:
    return builder.form.locator("input, textarea").evaluate_all("els => els.map(e => e.value)")


def _print_pdf(page: Page) -> bytes:
    """Xuất PDF như "Lưu thành PDF" trong cửa sổ in (CSS @media print, khổ A4) – chỉ Chromium."""
    page.emulate_media(media="print")
    return page.pdf(format="A4", print_background=True)


def _squash(text: str) -> str:
    """pypdf chèn khoảng trắng quanh ký tự có dấu khi trích văn bản -> so sánh sau khi bỏ mọi khoảng trắng."""
    return "".join(unicodedata.normalize("NFC", text).split())


def _pdf_text_and_pages(data: bytes) -> tuple[str, int]:
    pypdf = pytest.importorskip("pypdf", reason="Cần pypdf để đọc nội dung PDF (pip install pypdf)")
    reader = pypdf.PdfReader(io.BytesIO(data))
    return "\n".join(p.extract_text() or "" for p in reader.pages), len(reader.pages)


# ---------------------------------------------------------------- button Lưu CV
@pytest.mark.smoke
@pytest.mark.testcase("Candidate_199")
def test_candidate_199_save_cv(builder: CVBuilderPage, candidate, page: Page, settings):
    """Candidate_199 - Nhấn Lưu CV: "CV đã được lưu thành công.", CV xuất hiện trong danh sách CV của tôi."""
    builder.field("Họ và tên").fill(FULL["fullName"])
    builder.field("Vị trí ứng tuyển").fill(FULL["title"])

    _save_ok(builder)

    assert len(candidate.list_cvs()) == 1, "CV vừa tạo không có trong danh sách CV của tôi"
    lst = CVListPage(page, settings).open()
    expect(lst.cards).to_have_count(1)


@pytest.mark.testcase("Candidate_200")
def test_candidate_200_save_error_offline(builder: CVBuilderPage, context, candidate):
    """Candidate_200 - Ngắt mạng, nhấn Lưu CV: thông báo lỗi "...vui lòng thử lưu lại.", dữ liệu trên form giữ nguyên."""
    builder.fill_cv({k: FULL[k] for k in ("fullName", "title", "email", "summary")})
    before = _form_values(builder)

    context.set_offline(True)
    builder.save_button.click()

    expect(builder.error_alert).to_contain_text(MSG["builder_save_error"])
    assert _form_values(builder) == before, "Dữ liệu trên form bị thay đổi sau khi lưu lỗi"
    context.set_offline(False)
    assert candidate.builder_content() is None


# ---------------------------------------------------------------- nghiệp vụ
@pytest.mark.testcase("Candidate_201")
def test_candidate_201_full_cv(builder: CVBuilderPage, candidate, page: Page, settings):
    """Candidate_201 - Nhập đủ các trường, 2 kinh nghiệm, 1 học vấn, Lưu CV: thành công, CV có trong CV của tôi đủ nội dung."""
    builder.fill_cv(FULL)

    _save_ok(builder)

    saved = candidate.builder_content()
    for key in ("fullName", "title", "email", "phone", "location", "summary", "skills", "projects"):
        assert saved[key] == FULL[key], f"{key}: {saved[key]!r}"
    assert [e["role"] for e in saved["experiences"]] == [e["role"] for e in FULL["experiences"]]
    assert [e["school"] for e in saved["educations"]] == [e["school"] for e in FULL["educations"]]
    cvs = candidate.list_cvs()
    assert len(cvs) == 1, "CV vừa tạo không có trong danh sách CV của tôi"
    detail = candidate.wait_parsed(cvs[0]["id"])
    text = detail.get("raw_text") or ""
    for value in (FULL["fullName"], FULL["experiences"][1]["company"], FULL["educations"][0]["school"]):
        assert value in text, f"Nội dung CV trong 'CV của tôi' thiếu '{value}'"


@pytest.mark.testcase("Candidate_202")
def test_candidate_202_only_required(builder: CVBuilderPage, candidate):
    """Candidate_202 - Chỉ nhập Họ và tên, Lưu CV: lưu thành công, khung xem trước bỏ qua các mục trống."""
    builder.field("Họ và tên").fill(FULL["fullName"])

    _save_ok(builder)

    assert candidate.builder_content()["fullName"] == FULL["fullName"]
    for heading in ("GIỚI THIỆU", "KINH NGHIỆM LÀM VIỆC", "HỌC VẤN", "KỸ NĂNG", "DỰ ÁN"):
        expect(builder.preview_section(heading)).to_have_count(0)


@pytest.mark.testcase("Candidate_203")
def test_candidate_203_missing_required(builder: CVBuilderPage, candidate):
    """Candidate_203 - Bỏ trống Họ và tên, Lưu CV: focus vào trường Họ và tên, không lưu."""
    builder.field("Họ và tên").fill("")
    builder.field("Vị trí ứng tuyển").fill(FULL["title"])

    sent = builder.save_requests_after_click()

    expect(builder.field("Họ và tên")).to_be_focused()
    assert sent == 0 and candidate.builder_content() is None, "Thiếu Họ và tên nhưng CV vẫn được lưu"


@pytest.mark.testcase("Candidate_204")
def test_candidate_204_apply_with_created_cv(builder: CVBuilderPage, candidate, recruiter_job_id, page: Page, settings):
    """Candidate_204 - Tạo và lưu CV, ứng tuyển 1 tin: CV vừa tạo có trong danh sách chọn CV, nộp thành công."""
    builder.fill_cv(FULL)
    _save_ok(builder)

    page.goto(f"{settings.base_url}/jobs/{recruiter_job_id}", wait_until="domcontentloaded")
    page.get_by_role("button", name="Ứng tuyển ngay").first.click()
    dialog = page.get_by_role("dialog")
    expect(dialog.locator("label.cv-option")).to_have_count(1)
    with page.expect_response(lambda r: "/candidate/applications/" in r.url and r.request.method == "POST") as info:
        dialog.get_by_role("button", name="Nộp hồ sơ").click()
    assert info.value.status == 201, f"Nộp hồ sơ thất bại: {info.value.status} {info.value.text()}"


@pytest.mark.ai
@pytest.mark.testcase("Candidate_205")
def test_candidate_205_score_created_cv(ai_available, builder: CVBuilderPage, candidate):
    """Candidate_205 - Tạo và lưu CV, vào Chấm điểm CV chọn CV vừa tạo: AI chấm điểm và trích xuất được thông tin."""
    builder.fill_cv(FULL)
    _save_ok(builder)
    cvs = candidate.list_cvs()
    assert cvs, "CV vừa tạo không có trong danh sách CV của tôi"

    resp = candidate.post(f"candidate/cvs/{cvs[0]['id']}/analysis/score/")

    assert resp.ok, f"Chấm điểm thất bại: {resp.status} {resp.text()[:300]}"
    body = resp.json()
    assert body["score"]["total"] is not None and body["profile"], "Không có điểm / thông tin trích xuất"


@pytest.mark.testcase("Candidate_206")
def test_candidate_206_edit_saved_cv(login_as, candidate, page: Page, settings):
    """Candidate_206 - Mở lại CV đã tạo: "Đang tải CV đã lưu…" rồi điền đúng dữ liệu cũ; sửa + Lưu: cập nhật, không tạo CV mới."""
    candidate.builder_save({**FULL})
    cv_count = len(candidate.list_cvs())
    held = []
    page.route("**/candidate/cv-builder/", lambda r: held.append(r) if r.request.method == "GET" else r.continue_())
    login_as(candidate)
    builder = CVBuilderPage(page, settings)
    page.goto(f"{settings.base_url}{builder.PATH}", wait_until="domcontentloaded")

    expect(builder.loading).to_have_text(MSG["builder_loading"])
    for route in held:
        route.continue_()
    page.unroute("**/candidate/cv-builder/")
    builder.wait_ready()
    expect(builder.field("Họ và tên")).to_have_value(FULL["fullName"])
    expect(builder.item_field(builder.experience(2), "Công ty")).to_have_value(FULL["experiences"][1]["company"])

    builder.field("Vị trí ứng tuyển").fill("Trưởng phòng kinh doanh")
    _save_ok(builder)

    assert candidate.builder_content()["title"] == "Trưởng phòng kinh doanh"
    assert len(candidate.list_cvs()) == cv_count, "Lưu lại CV đã tạo nhưng lại sinh thêm CV mới"


@pytest.mark.testcase("Candidate_207")
def test_candidate_207_pdf_vietnamese(builder: CVBuilderPage, browser_name):
    """Candidate_207 (bán tự động) - Tiếng Việt có dấu + ký tự đặc biệt, Tải PDF: đúng nội dung, không mất ký tự.

    Xuất PDF bằng Chromium (tương đương "Lưu thành PDF" của cửa sổ in) rồi đọc lại văn bản.
    Lỗi font hiển thị (ô vuông, sai nét) vẫn cần xem bằng mắt.
    """
    if browser_name != "chromium":
        pytest.skip("page.pdf() chỉ hỗ trợ Chromium")
    data = {**FULL, "fullName": "Nguyễn Thị Ánh Tuyết", "summary": "Kỹ năng: đàm phán & thuyết trình (C#, 100%) – “tốt”"}
    builder.fill_cv(data)

    text, _ = _pdf_text_and_pages(_print_pdf(builder.page))

    normalized = _squash(text)
    for value in (data["fullName"], "đàm phán & thuyết trình (C#, 100%)", FULL["educations"][0]["school"]):
        assert _squash(value) in normalized, f"PDF thiếu / sai ký tự: '{value}'"


@pytest.mark.testcase("Candidate_208")
def test_candidate_208_multi_page_pdf(builder: CVBuilderPage, browser_name):
    """Candidate_208 (bán tự động) - 6 kinh nghiệm mô tả dài, Tải PDF: tự sang trang, không bị cắt chữ."""
    if browser_name != "chromium":
        pytest.skip("page.pdf() chỉ hỗ trợ Chromium")
    long_desc = "\n".join(f"• Thành tựu số {i}: hoàn thành dự án trọng điểm, vượt kế hoạch {i * 10}%." for i in range(1, 9))
    experiences = [{"role": f"Vị trí {n}", "company": f"Công ty số {n}", "period": "2015 – 2016", "description": long_desc}
                   for n in range(1, 7)]
    builder.fill_cv({"fullName": FULL["fullName"], "experiences": experiences})

    text, pages = _pdf_text_and_pages(_print_pdf(builder.page))

    assert pages > 1, "CV dài nhưng PDF chỉ có 1 trang (nội dung có thể bị cắt)"
    normalized = _squash(text)
    for n in range(1, 7):
        assert _squash(f"Công ty số {n}") in normalized, f"PDF mất nội dung kinh nghiệm {n}"
    assert _squash("vượt kế hoạch 80%") in normalized, "Dòng mô tả cuối bị cắt"


@pytest.mark.testcase("Candidate_209")
def test_candidate_209_save_after_reconnect(builder: CVBuilderPage, context, candidate):
    """Candidate_209 - Ngắt mạng, Lưu CV: báo lỗi, giữ dữ liệu; bật mạng, lưu lại: thành công."""
    builder.fill_cv({k: FULL[k] for k in ("fullName", "title", "summary")})

    context.set_offline(True)
    builder.save_button.click()
    expect(builder.error_alert).to_be_visible()
    expect(builder.field("Họ và tên")).to_have_value(FULL["fullName"])

    context.set_offline(False)
    _save_ok(builder)
    assert candidate.builder_content()["summary"] == FULL["summary"]


@pytest.mark.testcase("Candidate_210")
def test_candidate_210_leave_without_save(builder: CVBuilderPage, candidate, page: Page, settings):
    """Candidate_210 - Nhập dữ liệu, chuyển trang khác không lưu: không tạo CV mới trong danh sách."""
    builder.fill_cv({k: FULL[k] for k in ("fullName", "title")})

    lst = CVListPage(page, settings).open()
    lst.wait_list_ready()

    expect(lst.empty_title).to_be_visible()
    assert candidate.list_cvs() == [] and candidate.builder_content() is None
