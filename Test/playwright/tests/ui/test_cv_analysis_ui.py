"""UI test màn hình "AI chấm điểm & gợi ý sửa CV" (/cv-analysis) – Candidate_211, 220..241.

Nguồn: KBKTCN_ATS_WEB_v1.0.xlsx, sheet "Ứng viên", mục "Chấm điểm & gợi ý sửa CV".
Test hiển thị kết quả AI dùng response giả lập (utils/ai_mock.py) để kiểm tra FE ổn định, không phụ thuộc
Gemini. Chất lượng kết quả AI thật: test @pytest.mark.ai trong tests/function/test_cv_analysis_function.py.
"""
import re

import pytest
from playwright.sync_api import Page, expect

from pages.cv_analysis_page import CVAnalysisPage
from utils import ai_mock
from utils.data_loader import load_test_data

DATA = load_test_data("cv.json")
MSG = DATA["messages"]

pytestmark = [pytest.mark.ui, pytest.mark.cv, pytest.mark.cv_analysis]


@pytest.fixture
def analysis(login_as, shared_candidate, page: Page, settings):
    """Mở màn hình với CV chính của shared_candidate; mock_analyses: danh sách kết quả AI giả lập (mặc định rỗng)."""

    def _open(analyses=None, cv=None, tab=None) -> CVAnalysisPage:
        ai_mock.mock_analyses(page, analyses or [])
        login_as(shared_candidate)
        return CVAnalysisPage(page, settings).open_cv(cv["id"] if cv else None, tab)

    return _open


def _cv(client, default=True):
    return next(c for c in client.cvs if c["is_default"] == default)


# ---------------------------------------------------------------- giao diện chung
@pytest.mark.smoke
@pytest.mark.testcase("Candidate_211")
def test_candidate_211_default_layout(analysis):
    """Candidate_211 - Title "AI chấm điểm & gợi ý sửa CV"; khung danh sách CV + tải CV (PDF, DOCX · tối đa 5MB);
    tab Chấm điểm, Gợi ý sửa CV, Thông tin AI trích xuất; header, footer."""
    page = analysis()

    expect(page.heading).to_have_text(MSG["analysis_title"])
    expect(page.dropzone.root).to_be_visible()
    expect(page.dropzone_hint).to_have_text(MSG["upload_hint"])
    expect(page.list_section).to_be_visible()
    expect(page.tablist.get_by_role("tab")).to_have_text(MSG["tabs"])
    expect(page.shell.header).to_be_visible()
    expect(page.shell.footer).to_be_visible()


# ---------------------------------------------------------------- danh sách CV
@pytest.mark.testcase("Candidate_220")
def test_candidate_220_no_cv(login_as, candidate, page: Page, settings):
    """Candidate_220 - Chưa có CV: "Bạn chưa tải CV nào." và "Chưa có CV để phân tích" - "Tải CV lên ở khung bên trái..."."""
    ai_mock.mock_analyses(page, [])
    login_as(candidate)
    analysis = CVAnalysisPage(page, settings).open_cv()

    expect(analysis.no_cv_text).to_be_visible()
    expect(analysis.empty_panel_title).to_have_text(MSG["analysis_empty_title"])
    expect(analysis.empty_panel).to_contain_text(MSG["analysis_empty_description"])


@pytest.mark.testcase("Candidate_221")
def test_candidate_221_status_labels(analysis, shared_candidate):
    """Candidate_221 - CV chưa chấm có nhãn "Chưa chấm", CV đã chấm hiển thị điểm."""
    scored, unscored = _cv(shared_candidate), _cv(shared_candidate, default=False)
    page = analysis([ai_mock.analysis_dto(scored["id"], score=True)])

    expect(page.item_status(unscored["title"])).to_have_text(MSG["not_scored_label"])
    expect(page.item_score(scored["title"])).to_have_attribute("aria-label", re.compile(rf"^{ai_mock.score_dto()['total']}/100"))
    expect(page.item_status(scored["title"])).to_have_count(0)


@pytest.mark.testcase("Candidate_222")
def test_candidate_222_select_cv(analysis, shared_candidate):
    """Candidate_222 - Chọn lần lượt các CV: kết quả bên phải thay đổi theo CV đã chọn."""
    page = analysis()
    for cv in shared_candidate.cvs:
        page.select(cv["title"])
        expect(page.selected_title).to_have_text(cv["title"])
        expect(page.page).to_have_url(re.compile(rf"cvId={cv['id']}"))
        expect(page.item(cv["title"])).to_have_class(re.compile(r"\bselected\b"))


# ---------------------------------------------------------------- tab Chấm điểm
@pytest.mark.testcase("Candidate_223")
def test_candidate_223_not_scored(analysis, shared_candidate):
    """Candidate_223 - Chọn CV chưa chấm: "CV chưa được chấm điểm" và nút chấm điểm."""
    page = analysis(cv=_cv(shared_candidate))

    expect(page.empty_heading(MSG["not_scored_title"])).to_be_visible()
    expect(page.score_button).to_be_visible()


@pytest.mark.testcase("Candidate_224")
def test_candidate_224_scoring_in_progress(analysis, shared_candidate):
    """Candidate_224 - Nhấn chấm điểm: "AI đang chấm điểm CV, thường mất 5-15 giây..."."""
    cv = _cv(shared_candidate)
    held: list = []
    page = analysis(cv=cv)
    ai_mock.mock_score(page.page, cv["id"], hold=held)

    page.score_button.click()

    expect(page.ai_progress).to_contain_text(MSG["scoring"])
    expect(page.score_button).to_have_count(0)
    for route in held:
        route.abort()


@pytest.mark.testcase("Candidate_225")
def test_candidate_225_score_result(analysis, shared_candidate):
    """Candidate_225 - Chấm xong: điểm tổng (thang 100), điểm 5 tiêu chí kèm lý do, điểm mạnh, điểm cần cải thiện."""
    cv = _cv(shared_candidate)
    page = analysis(cv=cv)
    ai_mock.mock_score(page.page, cv["id"])

    page.score_button.click()

    expected = ai_mock.score_dto()
    expect(page.total_score).to_have_attribute("aria-label", re.compile(rf"^{expected['total']}/100 điểm"))
    expect(page.criteria).to_have_count(5)
    for i, (_, name, score, mx) in enumerate(ai_mock.CRITERIA):
        expect(page.criteria.nth(i)).to_contain_text(name)
        expect(page.criteria.nth(i)).to_contain_text(f"{score}/{mx}")
    expect(page.strengths).to_contain_text(expected["strengths"][0])
    expect(page.weaknesses).to_contain_text(expected["weaknesses"][0])
    # Tài liệu yêu cầu lý do cho từng tiêu chí
    expect(page.tabpanel, "Không hiển thị lý do chấm cho từng tiêu chí").to_contain_text(expected["breakdown"][0]["reason"])


@pytest.mark.testcase("Candidate_227")
def test_candidate_227_cv_processing(login_as, shared_candidate, page: Page, settings):
    """Candidate_227 - CV parse_status = pending/processing: hiển thị "CV đang được phân tích"."""
    cv = _cv(shared_candidate)

    def processing(route):
        resp = route.fetch()
        data = resp.json()
        for item in data:
            if item["id"] == cv["id"]:
                item["parse_status"] = "processing"
        ai_mock.fulfill_json(route, data)

    page.route("**/candidate/cvs/", processing)
    ai_mock.mock_analyses(page, [])
    login_as(shared_candidate)
    analysis = CVAnalysisPage(page, settings).open_cv(cv["id"])

    expect(analysis.not_ready).to_contain_text(MSG["cv_processing"])
    expect(analysis.score_button).to_be_disabled()


@pytest.mark.testcase("Candidate_228")
def test_candidate_228_cv_parse_failed(login_as, candidate, page: Page, settings):
    """Candidate_228 - CV parse_status = failed: "Phân tích thất bại, vui lòng tải lại CV"."""
    from utils.cv_files import pdf_without_text

    cv = candidate.upload_cv(pdf_without_text(), title="CV lỗi đọc")
    assert cv["parse_status"] == "failed", cv["parse_status"]
    ai_mock.mock_analyses(page, [])
    login_as(candidate)
    analysis = CVAnalysisPage(page, settings).open_cv(cv["id"])

    expect(analysis.not_ready).to_contain_text(MSG["cv_parse_failed"])


# ---------------------------------------------------------------- tab Gợi ý sửa CV
@pytest.mark.testcase("Candidate_229")
def test_candidate_229_suggestion_items(analysis, shared_candidate):
    """Candidate_229 - Mỗi gợi ý gồm: mục, vấn đề, đề xuất, ví dụ viết lại, mức ưu tiên (Ưu tiên cao / Nên sửa / Gợi ý thêm)."""
    cv = _cv(shared_candidate)
    page = analysis([ai_mock.analysis_dto(cv["id"], suggestions=ai_mock.suggestions_dto())], cv=cv, tab="suggestions")

    expect(page.suggestions).to_have_count(3)
    expect(page.suggestions.locator(".badge")).to_have_text(MSG["priorities"])
    first = page.suggestions.first
    expect(first.locator(".suggestion-section")).to_have_text("Kinh nghiệm")
    expect(first.locator(".suggestion-issue")).to_have_text("Thiếu số liệu")
    expect(first).to_contain_text("Bổ sung kết quả đo được")
    expect(first).to_contain_text("Nên sửa thành")


@pytest.mark.testcase("Candidate_230")
def test_candidate_230_suggesting_in_progress(analysis, shared_candidate):
    """Candidate_230 - Yêu cầu tạo gợi ý: "AI đang đối chiếu CV với các tin tuyển dụng, thường mất 5-15 giây..."."""
    cv = _cv(shared_candidate)
    page = analysis(cv=cv, tab="suggestions")
    held: list = []
    ai_mock.mock_suggestions(page.page, cv["id"], hold=held)

    page.suggest_button.click()

    expect(page.ai_progress).to_contain_text(MSG["suggesting"])
    for route in held:
        route.abort()


@pytest.mark.manual
@pytest.mark.parametrize("tc_id, feature", [
    pytest.param("Candidate_232", "lọc gợi ý theo mức ưu tiên", id="Candidate_232"),
    pytest.param("Candidate_233", "đánh dấu gợi ý 'Đã sửa' / 'Bỏ qua'", id="Candidate_233"),
    pytest.param("Candidate_234", "chọn tin tuyển dụng mục tiêu", id="Candidate_234"),
])
def test_candidate_232_234_missing_features(tc_id, feature, record_testcase):
    """Candidate_232..234 - Chức năng theo tài liệu nhưng FE chưa có giao diện."""
    record_testcase(tc_id)
    pytest.skip(f"MANUAL: FE chưa có giao diện {feature} (CVSuggestionList.jsx) – cần DOM khi tính năng được triển khai.")


@pytest.mark.testcase("Candidate_235")
def test_candidate_235_no_suggestions(analysis, shared_candidate):
    """Candidate_235 - CV không có gợi ý nào: hiển thị "CV của bạn đã rất tốt"."""
    cv = _cv(shared_candidate)
    page = analysis([ai_mock.analysis_dto(cv["id"], suggestions=ai_mock.suggestions_dto(items=[]))], cv=cv, tab="suggestions")

    expect(page.suggestions).to_have_count(0)
    expect(page.tabpanel).to_contain_text(MSG["no_suggestions"])


# ---------------------------------------------------------------- tab Thông tin AI trích xuất
@pytest.mark.testcase("Candidate_237")
def test_candidate_237_no_extracted_info(analysis, shared_candidate):
    """Candidate_237 - CV chưa chấm: "Chưa có thông tin trích xuất" - "Chấm điểm CV để AI trích xuất thông tin."."""
    page = analysis(cv=_cv(shared_candidate))

    page.open_tab("Thông tin AI trích xuất")

    expect(page.empty_heading(MSG["no_profile_title"])).to_be_visible()
    expect(page.tabpanel).to_contain_text(MSG["no_profile_description"])


# ---------------------------------------------------------------- popup xác nhận Xóa CV
@pytest.mark.testcase("Candidate_239")
def test_candidate_239_delete_popup_display(analysis, shared_candidate):
    """Candidate_239 - Popup xác nhận: tiêu đề "Xóa CV?", button "Hủy" và "Xóa CV"."""
    cv = _cv(shared_candidate, default=False)
    page = analysis()

    page.delete_button(cv["title"]).click()

    expect(page.dialog.title).to_have_text(MSG["delete_title"])
    expect(page.dialog.cancel_button).to_be_visible()
    expect(page.dialog.confirm_button(MSG["delete_confirm"])).to_be_visible()


@pytest.mark.testcase("Candidate_240")
def test_candidate_240_delete_popup_cancel(analysis, shared_candidate):
    """Candidate_240 - Nhấn Hủy: popup đóng, dữ liệu không thay đổi."""
    cv = _cv(shared_candidate, default=False)
    page = analysis()
    page.delete_button(cv["title"]).click()

    page.dialog.cancel_button.click()

    expect(page.dialog.root).to_be_hidden()
    expect(page.items).to_have_count(len(shared_candidate.cvs))
    assert len(shared_candidate.list_cvs()) == len(shared_candidate.cvs)


@pytest.mark.testcase("Candidate_241")
@pytest.mark.parametrize("how", ["icon_x", "esc"])
def test_candidate_241_delete_popup_close(analysis, shared_candidate, how):
    """Candidate_241 - Nhấn icon X / phím Esc: popup đóng, dữ liệu không thay đổi."""
    cv = _cv(shared_candidate, default=False)
    page = analysis()
    page.delete_button(cv["title"]).click()

    if how == "icon_x":
        page.dialog.close_icon.click()
    else:
        page.page.keyboard.press("Escape")

    expect(page.dialog.root).to_be_hidden()
    expect(page.item(cv["title"])).to_be_visible()
    assert len(shared_candidate.list_cvs()) == len(shared_candidate.cvs)
