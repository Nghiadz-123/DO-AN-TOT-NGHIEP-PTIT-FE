"""Function test "Chấm điểm & gợi ý sửa CV" (/cv-analysis) – Candidate_226, 231, 236, 238, 242..255.

Nguồn: KBKTCN_ATS_WEB_v1.0.xlsx, sheet "Ứng viên", mục "Chấm điểm & gợi ý sửa CV".
Test @pytest.mark.ai gọi AI thật (Gemini) qua backend; fixture ai_available tự skip khi backend chưa bật API AI.
Kết quả AI có tính ngẫu nhiên -> chỉ kiểm tra cấu trúc, khoảng giá trị và độ lệch cho phép.
"""
import re

import pytest
from playwright.sync_api import Page, expect

from pages.cv_analysis_page import CVAnalysisPage
from utils import ai_mock
from utils.cv_files import CvFile, PDF_MIME, make_pdf, pdf_cv
from utils.data_loader import load_test_data
from utils.helpers import unique_suffix

DATA = load_test_data("cv.json")
MSG = DATA["messages"]
AI_TIMEOUT = 60_000  # AI thường mất 5-15 giây; để dư cho mạng chậm
SCORE_TOLERANCE = 10  # chênh lệch điểm chấp nhận được giữa 2 lần chấm / 2 CV tương đương

pytestmark = [pytest.mark.function, pytest.mark.cv, pytest.mark.cv_analysis]


def _open(login_as, client, page: Page, settings, cv_id=None, tab=None) -> CVAnalysisPage:
    login_as(client)
    return CVAnalysisPage(page, settings).open_cv(cv_id, tab)


def _score_via_ui(analysis: CVAnalysisPage) -> int:
    with analysis.page.expect_response(lambda r: "/analysis/score/" in r.url, timeout=AI_TIMEOUT) as info:
        (analysis.score_button.or_(analysis.rescore_button)).first.click()
    assert info.value.ok, f"Chấm điểm thất bại: {info.value.status} {info.value.text()[:300]}"
    expect(analysis.total_score).to_be_visible()
    return info.value.json()["score"]["total"]


def _score_via_api(client, cv_id: str) -> dict:
    resp = client.post(f"candidate/cvs/{cv_id}/analysis/score/", timeout=AI_TIMEOUT)
    assert resp.ok, f"Chấm điểm thất bại: {resp.status} {resp.text()[:300]}"
    return resp.json()


def _text_cv(lines: list[str], name: str) -> CvFile:
    return CvFile(name, PDF_MIME, make_pdf(lines + [f"Ref: {unique_suffix()}"]))


# ---------------------------------------------------------------- xóa CV
@pytest.mark.testcase("Candidate_242")
def test_candidate_242_confirm_delete(login_as, candidate_with_cvs, page: Page, settings):
    """Candidate_242 - Nhấn "Xóa CV": CV và kết quả AI của CV bị xóa khỏi danh sách."""
    cv = next(c for c in candidate_with_cvs.cvs if not c["is_default"])
    analysis = _open(login_as, candidate_with_cvs, page, settings)

    analysis.delete_button(cv["title"]).click()
    with page.expect_response(lambda r: "/candidate/cvs/" in r.url and r.request.method == "DELETE"):
        analysis.dialog.confirm_button(MSG["delete_confirm"]).click()

    expect(analysis.item(cv["title"])).to_have_count(0)
    expect(analysis.list_count).to_have_text(str(len(candidate_with_cvs.cvs) - 1))
    assert candidate_with_cvs.get_cv_raw(cv["id"]).status == 404


# ---------------------------------------------------------------- chấm điểm (AI thật)
@pytest.mark.ai
@pytest.mark.smoke
@pytest.mark.testcase("Candidate_243")
def test_candidate_243_score_success(ai_available, login_as, candidate_with_cvs, page: Page, settings):
    """Candidate_243 - Chọn CV chưa chấm, nhấn chấm điểm: điểm tổng, 5 tiêu chí kèm lý do, gợi ý cải thiện;
    CV trong danh sách hiển thị điểm thay cho "Chưa chấm"."""
    cv = candidate_with_cvs.cvs[0]
    analysis = _open(login_as, candidate_with_cvs, page, settings, cv["id"])
    expect(analysis.item_status(cv["title"])).to_have_text(MSG["not_scored_label"])

    total = _score_via_ui(analysis)

    assert 0 <= total <= 100
    expect(analysis.criteria).to_have_count(5)
    expect(analysis.weaknesses.locator("li").first).to_be_visible()
    expect(analysis.item_score(cv["title"])).to_have_attribute("aria-label", re.compile(rf"^{total}/100"))
    expect(analysis.item_status(cv["title"])).to_have_count(0)


@pytest.mark.ai
@pytest.mark.testcase("Candidate_244")
def test_candidate_244_total_consistent(ai_available, candidate_with_cvs):
    """Candidate_244 - Điểm tổng trong khoảng 0-100 và khớp với cách tính từ điểm các tiêu chí."""
    score = _score_via_api(candidate_with_cvs, candidate_with_cvs.cvs[0]["id"])["score"]

    assert 0 <= score["total"] <= 100
    max_sum = sum(c["max"] for c in score["breakdown"])
    computed = round(sum(c["score"] for c in score["breakdown"]) * 100 / max_sum)
    assert abs(computed - score["total"]) <= 1, f"Tổng {score['total']} khác tổng tiêu chí quy đổi {computed}"


@pytest.mark.ai
@pytest.mark.testcase("Candidate_245")
def test_candidate_245_score_stable(ai_available, candidate_with_cvs):
    """Candidate_245 - Chấm lại cùng 1 CV 2 lần: điểm chênh lệch không đáng kể."""
    cv_id = candidate_with_cvs.cvs[0]["id"]

    first = _score_via_api(candidate_with_cvs, cv_id)["score"]["total"]
    second = _score_via_api(candidate_with_cvs, cv_id)["score"]["total"]

    assert abs(first - second) <= SCORE_TOLERANCE, f"Lần 1: {first}, lần 2: {second}"


@pytest.mark.ai
@pytest.mark.testcase("Candidate_226")
def test_candidate_226_blind_scoring(ai_available, candidate):
    """Candidate_226 - 2 CV giống nhau chỉ khác tên, ngày sinh, giới tính: điểm tương đương nhau."""
    body = [line for line in pdf_cv_lines() if not line.startswith("NGUYEN")]
    cv_a = candidate.upload_cv(_text_cv(["NGUYEN VAN AN", "Male, born 1990"] + body, "cv_a.pdf"))
    cv_b = candidate.upload_cv(_text_cv(["TRAN THI BICH", "Female, born 1998"] + body, "cv_b.pdf"))

    a = _score_via_api(candidate, cv_a["id"])["score"]["total"]
    b = _score_via_api(candidate, cv_b["id"])["score"]["total"]

    assert abs(a - b) <= SCORE_TOLERANCE, f"Điểm lệch do thông tin nhạy cảm: {a} vs {b}"


def pdf_cv_lines():
    from utils.cv_files import cv_lines

    return cv_lines("blind")


@pytest.mark.ai
@pytest.mark.testcase("Candidate_246")
def test_candidate_246_result_persisted(ai_available, login_as, candidate_with_cvs, page: Page, settings):
    """Candidate_246 - Chấm điểm xong, rời trang rồi quay lại: hiển thị kết quả đã lưu, không chấm lại."""
    cv = candidate_with_cvs.cvs[0]
    total = _score_via_api(candidate_with_cvs, cv["id"])["score"]["total"]
    rescored = []
    page.on("request", lambda r: rescored.append(r.url) if "/analysis/score/" in r.url else None)

    analysis = _open(login_as, candidate_with_cvs, page, settings, cv["id"])

    expect(analysis.total_score).to_have_attribute("aria-label", re.compile(rf"^{total}/100"))
    assert not rescored, "Mở lại màn hình nhưng hệ thống chấm điểm lại"


@pytest.mark.ai
@pytest.mark.testcase("Candidate_247")
def test_candidate_247_leave_while_scoring(ai_available, login_as, candidate_with_cvs, page: Page, settings):
    """Candidate_247 - Nhấn chấm điểm, chuyển trang khác, quay lại: quá trình chấm vẫn chạy nền, có kết quả khi xong."""
    cv = candidate_with_cvs.cvs[0]
    analysis = _open(login_as, candidate_with_cvs, page, settings, cv["id"])
    analysis.score_button.click()
    expect(analysis.ai_progress).to_be_visible()

    page.goto(f"{settings.base_url}/cv", wait_until="domcontentloaded")
    analysis.open_cv(cv["id"])

    expect(analysis.total_score).to_be_visible(timeout=AI_TIMEOUT)


@pytest.mark.manual
@pytest.mark.testcase("Candidate_248")
def test_candidate_248_notification_when_done():
    """Candidate_248 - Nhận thông báo CV đã phân tích xong; bấm vào mở đúng kết quả của CV."""
    pytest.skip("MANUAL: FE chưa có thông báo 'CV đã phân tích xong' cho ứng viên – cần DOM khi tính năng được triển khai.")


@pytest.mark.ai
@pytest.mark.testcase("Candidate_249")
def test_candidate_249_not_a_cv(ai_available, candidate):
    """Candidate_249 - File không phải CV (hóa đơn): báo không nhận diện được CV hoặc cho điểm thấp kèm giải thích."""
    invoice = _text_cv([
        "INVOICE No. 2026-0001", "Seller: ABC Trading Co., Ltd", "Buyer: XYZ Corp",
        "Item: Office chairs x 10 - 15,000,000 VND", "VAT 10%: 1,500,000 VND", "Total: 16,500,000 VND",
    ], "invoice.pdf")
    cv = candidate.upload_cv(invoice)

    resp = candidate.post(f"candidate/cvs/{cv['id']}/analysis/score/", timeout=AI_TIMEOUT)

    if resp.ok:
        score = resp.json()["score"]
        assert score["total"] <= 30 and score["weaknesses"], f"File hóa đơn được chấm {score['total']} điểm"
    else:
        assert resp.status in (400, 422), f"Lỗi không mong đợi: {resp.status}"


@pytest.mark.ai
@pytest.mark.testcase("Candidate_250")
def test_candidate_250_english_cv(ai_available, candidate):
    """Candidate_250 - CV tiếng Anh: AI chấm điểm và trích xuất thông tin bình thường."""
    cv = candidate.upload_cv(pdf_cv())  # CV mẫu viết bằng tiếng Anh

    body = _score_via_api(candidate, cv["id"])

    assert 0 <= body["score"]["total"] <= 100
    profile = body["profile"] or {}
    assert "auto.cv@example.com" in str(profile), "Không trích xuất được email từ CV tiếng Anh"


@pytest.mark.testcase("Candidate_251")
def test_candidate_251_ai_error(login_as, shared_candidate, page: Page, settings):
    """Candidate_251 - AI lỗi khi chấm điểm: hiển thị thông báo lỗi, cho phép thử lại; không hiển thị điểm sai."""
    cv = next(c for c in shared_candidate.cvs if c["is_default"])
    ai_mock.mock_analyses(page, [])
    ai_mock.mock_score(page, cv["id"], status=503)
    analysis = _open(login_as, shared_candidate, page, settings, cv["id"])

    analysis.score_button.click()

    expect(analysis.action_error).to_be_visible()
    expect(analysis.total_score).to_have_count(0)
    expect(analysis.score_button).to_be_enabled()


@pytest.mark.ai
@pytest.mark.testcase("Candidate_252")
def test_candidate_252_suggestions_reference_open_jobs(ai_available, candidate_with_cvs, api_request):
    """Candidate_252 - Gợi ý tham chiếu yêu cầu của các tin đang tuyển phù hợp, không tham chiếu tin đã đóng."""
    resp = candidate_with_cvs.post(f"candidate/cvs/{candidate_with_cvs.cvs[0]['id']}/analysis/suggestions/",
                                   timeout=AI_TIMEOUT)
    assert resp.ok, f"Gợi ý thất bại: {resp.status}"
    refs = resp.json()["suggestions"].get("reference_jobs", [])

    for job in refs:
        detail = api_request.get(f"jobs/{job['id']}/")
        assert detail.ok and detail.json().get("status", "published") == "published", \
            f"Gợi ý tham chiếu tin không còn tuyển: {job['title']}"


@pytest.mark.ai
@pytest.mark.testcase("Candidate_231")
def test_candidate_231_rewrite_placeholders(ai_available, candidate_with_cvs):
    """Candidate_231 - Ví dụ viết lại dùng chỗ trống dạng [X%] để ứng viên tự điền, không bịa số liệu."""
    resp = candidate_with_cvs.post(f"candidate/cvs/{candidate_with_cvs.cvs[0]['id']}/analysis/suggestions/",
                                   timeout=AI_TIMEOUT)
    assert resp.ok, f"Gợi ý thất bại: {resp.status}"
    afters = [i.get("example_after") or "" for i in resp.json()["suggestions"]["items"]]

    numeric = [a for a in afters if re.search(r"\d", a)]
    assert all(re.search(r"\[[^\]]+\]", a) for a in numeric), f"Ví dụ có số liệu không dùng chỗ trống: {numeric}"


@pytest.mark.ai
@pytest.mark.testcase("Candidate_238")
def test_candidate_238_extracted_profile(ai_available, login_as, candidate_with_cvs, page: Page, settings):
    """Candidate_238 - CV đã chấm: liên hệ, học vấn, kinh nghiệm, kỹ năng được trích xuất đúng (đối chiếu CV gốc)."""
    cv = candidate_with_cvs.cvs[0]
    _score_via_api(candidate_with_cvs, cv["id"])
    analysis = _open(login_as, candidate_with_cvs, page, settings, cv["id"], tab="profile")

    info = analysis.parsed_info
    expect(info).to_contain_text("auto.cv@example.com")
    expect(info).to_contain_text(re.compile("ABC Trading", re.I))
    expect(info).to_contain_text(re.compile("National Economics University", re.I))
    expect(info).to_contain_text(re.compile("Negotiation", re.I))


@pytest.mark.manual
@pytest.mark.parametrize("tc_id", ["Candidate_236", "Candidate_253"])
def test_candidate_236_253_version_compare(tc_id, record_testcase):
    """Candidate_236/253 - Tải phiên bản mới của CV đã chấm: chấm lại, hiển thị điểm mới và mức tăng/giảm."""
    record_testcase(tc_id)
    pytest.skip("MANUAL: FE/BE chưa có chức năng phiên bản CV (không thể thay file của CV đã tải lên).")


@pytest.mark.ai
@pytest.mark.testcase("Candidate_254")
def test_candidate_254_delete_scored_cv(ai_available, login_as, candidate_with_cvs, page: Page, settings):
    """Candidate_254 - Xóa CV đã chấm điểm: CV và kết quả AI bị xóa, không còn trong danh sách."""
    cv = candidate_with_cvs.cvs[1]
    _score_via_api(candidate_with_cvs, cv["id"])
    analysis = _open(login_as, candidate_with_cvs, page, settings, cv["id"])

    analysis.delete_button(cv["title"]).click()
    analysis.dialog.confirm_button(MSG["delete_confirm"]).click()

    expect(analysis.item(cv["title"])).to_have_count(0)
    analyses = candidate_with_cvs.json_ok(candidate_with_cvs.get("candidate/cv-analyses/"), "Lấy kết quả AI")
    assert cv["id"] not in {a["cv_id"] for a in analyses}, "Kết quả AI của CV đã xóa vẫn còn"


@pytest.mark.testcase("Candidate_255")
def test_candidate_255_other_candidate_cv(login_as, candidate_with_cvs, shared_candidate, page: Page, settings):
    """Candidate_255 - Đổi id CV trên URL/API thành CV của ứng viên khác: từ chối truy cập."""
    other = shared_candidate.cvs[0]

    assert candidate_with_cvs.post(f"candidate/cvs/{other['id']}/analysis/score/").status in (403, 404)
    analysis = _open(login_as, candidate_with_cvs, page, settings, other["id"])

    # Tên CV mẫu có thể trùng giữa 2 tài khoản -> nhận diện CV bằng tên file gốc (duy nhất)
    expect(analysis.selected_title).to_be_visible()
    expect(page.locator("main")).not_to_contain_text(other["original_filename"])

