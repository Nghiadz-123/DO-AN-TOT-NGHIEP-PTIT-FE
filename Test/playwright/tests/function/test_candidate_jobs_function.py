"""Ứng viên – Việc làm phù hợp, Ứng tuyển việc làm, Đơn ứng tuyển của tôi, Thư mời ứng tuyển, Yêu thích:
TC nghiệp vụ riêng (KBKTCN sheet "Ứng viên", Candidate_256..429).

Textbox/textarea/combobox, giao diện chung, phân quyền, trạng thái tải: tests/generic (sinh từ tài liệu).

Dữ liệu: NTD dùng chung (shared_employer) tạo tin mới cho mỗi test cần ứng tuyển; ứng viên tạo qua API.
Backend chưa bật API AI (gợi ý việc làm, chấm match_score) và API thư mời:
  - Test giao diện Việc làm phù hợp dùng response giả lập (utils/ai_mock.py) để kiểm tra FE hiển thị đúng.
  - Test cần AI thật đánh dấu @pytest.mark.ai, tự skip khi backend chưa có API AI (fixture ai_available).
  - Thư mời ứng tuyển: skip lỗi môi trường (backend không có /candidate/invitations/).
"""
import re

import pytest
from playwright.sync_api import Page, expect

from pages.candidate_pages import FavoritesPage, JobDetailPage, MyApplicationsPage, RecommendedJobsPage
from pages.components import ConfirmDialog
from pages.login_page import LoginPage
from specs.screens_candidate import INVITATIONS_MISSING
from utils import ai_mock
from utils.ats_api import CandidateActions

pytestmark = [pytest.mark.function]


# ---------------------------------------------------------------- fixture chung
@pytest.fixture
def job(shared_employer, public_api) -> dict:
    """Tin đang tuyển mới (của NTD dùng chung) cho test ứng tuyển."""
    return shared_employer.create_job(public_api)


@pytest.fixture(scope="module")
def applicant(candidate_factory):
    """Ứng viên có 2 CV (PDF là CV chính) dùng chung trong module – mỗi test nộp vào tin mới."""
    return candidate_factory(["pdf", "docx"])


def _detail(page: Page, settings, client, job_id: str, login_as) -> JobDetailPage:
    login_as(client)
    detail = JobDetailPage(page, settings)
    detail.env = type("E", (), {"client": client, "candidate": CandidateActions(client)})()
    return detail.open(job_id=job_id)


def _app_for(client, job_id: str) -> dict | None:
    return next((a for a in CandidateActions(client).applications() if a["job"]["id"] == job_id), None)


# ================================================================ Việc làm phù hợp
@pytest.fixture
def reco(login_as, applicant, page: Page, settings):
    def _open(scores: list[int] | None = None, hold: list | None = None) -> RecommendedJobsPage:
        if scores is not None:
            ai_mock.mock_recommendations(page, scores, hold)
        login_as(applicant)
        return RecommendedJobsPage(page, settings).open()

    return _open


@pytest.mark.recommended_jobs
@pytest.mark.testcase("Candidate_265")
def test_candidate_265_no_cv(login_as, candidate, page: Page, settings):
    """Candidate_265 - Chưa có CV: "Bạn chưa có CV" - "Tải CV lên để AI phân tích kỹ năng, kinh nghiệm và gợi ý..."."""
    login_as(candidate)
    page.goto(f"{settings.base_url}/recommended-jobs")
    empty = page.locator(".empty-state")
    expect(empty.get_by_role("heading")).to_have_text("Bạn chưa có CV")
    expect(empty).to_contain_text("Tải CV lên để AI phân tích kỹ năng, kinh nghiệm và gợi ý những công việc phù hợp nhất.")


@pytest.mark.recommended_jobs
@pytest.mark.testcase("Candidate_271")
def test_candidate_271_score_filter_default(reco):
    """Candidate_271 - Bộ lọc mức điểm mặc định "Tất cả"."""
    page = reco([80, 60, 40])
    expect(page.score_filter("Tất cả")).to_have_attribute("aria-pressed", "true")


@pytest.mark.recommended_jobs
@pytest.mark.testcase("Candidate_272")
def test_candidate_272_score_filter(reco):
    """Candidate_272 - "Từ 50 điểm": chỉ tin >= 50; "Từ 70 điểm": chỉ tin >= 70."""
    page = reco([85, 72, 55, 30])
    page.score_filter("Từ 50 điểm").click()
    expect(page.jobs.cards).to_have_count(3)
    expect(page.count).to_contain_text("3")
    page.score_filter("Từ 70 điểm").click()
    expect(page.jobs.cards).to_have_count(2)


@pytest.mark.recommended_jobs
@pytest.mark.testcase("Candidate_273")
def test_candidate_273_no_job_at_level(reco):
    """Candidate_273 - Không tin đạt mức: "Chưa có công việc đạt mức điểm này" - "Hãy hạ mức lọc hoặc cải thiện CV..."."""
    page = reco([45, 30])
    page.score_filter("Từ 70 điểm").click()
    expect(page.empty.get_by_role("heading")).to_have_text("Chưa có công việc đạt mức điểm này")
    expect(page.empty).to_contain_text("Hãy hạ mức lọc hoặc cải thiện CV theo gợi ý của AI.")


@pytest.mark.recommended_jobs
@pytest.mark.testcase("Candidate_274")
def test_candidate_274_first_time_progress(reco, page: Page):
    """Candidate_274 - Lần đầu: "AI đang tìm công việc phù hợp, lần đầu có thể mất 10-20 giây..." rồi hiện danh sách."""
    held: list = []
    reco_page = reco([70], hold=held)
    expect(reco_page.progress).to_be_visible()
    page.unroute(ai_mock.RECOMMENDED)
    ai_mock.mock_recommendations(page, [70])
    for route in held:
        ai_mock.fulfill_json(route, [ai_mock.recommendation_dto(1, 70)])
    expect(reco_page.jobs.cards).to_have_count(1)
    expect(reco_page.progress).to_have_count(0)


@pytest.mark.recommended_jobs
@pytest.mark.testcase("Candidate_276")
def test_candidate_276_sorted_by_score(reco):
    """Candidate_276 - Danh sách sắp xếp theo % phù hợp giảm dần."""
    page = reco([40, 90, 65])
    scores = [int(re.search(r"\d+", t).group()) for t in page.jobs.cards.locator(".score-circle").all_inner_texts()]
    assert scores == sorted(scores, reverse=True), f"Thứ tự điểm: {scores}"


@pytest.mark.recommended_jobs
@pytest.mark.testcase("Candidate_277")
def test_candidate_277_match_explanation(reco):
    """Candidate_277 - Mỗi tin có giải thích "Vì sao phù hợp / còn thiếu" và kỹ năng còn thiếu."""
    page = reco([80, 60])
    for i in range(page.jobs.cards.count()):
        card = page.jobs.cards.nth(i)
        expect(card.locator(".match-reasons li").first).to_be_visible()
        expect(card.get_by_text("(còn thiếu)")).to_have_count(1)


@pytest.mark.recommended_jobs
@pytest.mark.testcase("Candidate_278")
def test_candidate_278_ai_evaluate(reco, page: Page):
    """Candidate_278 - "AI đánh giá chi tiết": hiển thị "AI đang đánh giá..." rồi kết quả đánh giá chi tiết."""
    held: list = []
    ai_mock.mock_evaluate(page, hold=held)
    reco_page = reco([80])
    card = reco_page.jobs.cards.first
    reco_page.evaluate_button(card).click()
    expect(card.get_by_role("button", name="AI đang đánh giá...")).to_be_visible()
    for route in held:
        ai_mock.fulfill_json(route, ai_mock.recommendation_dto(1, 88, evaluated=True))
    expect(card.locator(".ai-box")).to_contain_text("AI đánh giá chi tiết: 88/100")


@pytest.mark.recommended_jobs
@pytest.mark.testcase("Candidate_282")
def test_candidate_282_not_interested(reco):
    """Candidate_282 - Nhấn "Không quan tâm" trên 1 tin: tin bị ẩn khỏi danh sách đề xuất."""
    page = reco([80, 60])
    button = page.jobs.cards.first.get_by_role("button", name="Không quan tâm")
    expect(button, "Thẻ việc làm không có nút 'Không quan tâm'").to_be_visible(timeout=3000)
    button.click()
    expect(page.jobs.cards).to_have_count(1)


@pytest.mark.recommended_jobs
@pytest.mark.testcase("Candidate_283")
def test_candidate_283_no_suggestion(reco):
    """Candidate_283 - CV không khớp tin nào: "Chưa có gợi ý phù hợp", gợi ý cập nhật hồ sơ / nới mong muốn."""
    page = reco([])
    expect(page.empty.get_by_role("heading")).to_have_text("Chưa có gợi ý phù hợp")


@pytest.mark.recommended_jobs
@pytest.mark.testcase("Candidate_284")
def test_candidate_284_ai_service_error(reco, page: Page):
    """Candidate_284 - AI Matching lỗi: hiển thị kết quả đã lưu gần nhất hoặc danh sách tin mới nhất (không báo lỗi trắng)."""
    page.route(ai_mock.RECOMMENDED, lambda r: ai_mock.fulfill_json(r, {"detail": "AI lỗi"}, 503))
    reco_page = reco()
    expect(page.get_by_role("heading", name="Không tải được dữ liệu"),
           "AI lỗi -> hiển thị lỗi thay vì kết quả đã lưu / tin mới nhất").to_have_count(0)
    expect(reco_page.jobs.cards.first).to_be_visible()


@pytest.mark.recommended_jobs
@pytest.mark.testcase("Candidate_285")
def test_candidate_285_save_and_open_from_suggestions(reco, page: Page):
    """Candidate_285 - Nhấn icon Yêu thích: tin được lưu; nhấn vào tin: chuyển đến chi tiết tin để ứng tuyển."""
    reco_page = reco([80])
    card = reco_page.jobs.cards.first
    expect(card.get_by_role("button", name="Yêu thích")).to_be_visible()
    card.get_by_role("link").first.click()
    expect(page).to_have_url(re.compile(r"/jobs/[\w-]+$"))


@pytest.mark.ai
@pytest.mark.recommended_jobs
@pytest.mark.parametrize("tc_id", ["Candidate_275", "Candidate_279", "Candidate_280", "Candidate_281"])
def test_candidate_reco_with_real_ai(ai_available, reco, tc_id, record_testcase):
    """Candidate_275/279/280/281 - Lọc cứng theo mong muốn, dùng kết quả đã lưu, tính lại khi có CV mới,
    đổi CV căn cứ: cần AI Matching thật của backend."""
    record_testcase(tc_id)
    page = reco()
    expect(page.heading).to_be_visible()


# ================================================================ Ứng tuyển việc làm
@pytest.fixture
def apply_modal(login_as, applicant, job, page: Page, settings):
    detail = _detail(page, settings, applicant, job["id"], login_as)
    modal = detail.open_apply()
    return detail, modal


@pytest.mark.apply
@pytest.mark.testcase("Candidate_292")
def test_candidate_292_default_cv_selected(apply_modal, applicant):
    """Candidate_292 - Mở popup: CV chính được chọn sẵn, có nhãn "CV chính"."""
    _, modal = apply_modal
    default = applicant.default_cv()
    option = modal.option(default["title"])
    expect(option.get_by_role("radio")).to_be_checked()
    expect(option).to_contain_text("CV chính")


@pytest.mark.apply
@pytest.mark.testcase("Candidate_293")
def test_candidate_293_single_choice(apply_modal, applicant):
    """Candidate_293 - Chọn CV khác: chỉ 1 CV được chọn tại 1 thời điểm."""
    _, modal = apply_modal
    other = next(c for c in applicant.list_cvs() if not c["is_default"])
    modal.option(other["title"]).get_by_role("radio").check()
    checked = [modal.radios.nth(i).is_checked() for i in range(modal.radios.count())]
    assert checked.count(True) == 1, f"Số CV được chọn: {checked.count(True)}"


@pytest.mark.apply
@pytest.mark.testcase("Candidate_294")
def test_candidate_294_no_cv(login_as, candidate, job, page: Page, settings):
    """Candidate_294 - Chưa có CV: "Bạn chưa có CV nào" - "Hãy tải CV lên để ứng tuyển."."""
    detail = _detail(page, settings, candidate, job["id"], login_as)
    modal = detail.open_apply()
    expect(modal.empty.get_by_role("heading")).to_have_text("Bạn chưa có CV nào")
    expect(modal.empty).to_contain_text("Hãy tải CV lên để ứng tuyển.")


@pytest.mark.apply
@pytest.mark.testcase("Candidate_295")
def test_candidate_295_match_preview(apply_modal):
    """Candidate_295 - Chọn CV: "Đang phân tích..." rồi mức phù hợp (lỗi: "Không thể đánh giá lúc này...")."""
    _, modal = apply_modal
    expect(modal.root.get_by_text("AI đánh giá mức độ phù hợp"),
           "Popup ứng tuyển không có khối AI đánh giá mức phù hợp (FEATURES.ai đang tắt)").to_be_visible(timeout=3000)


@pytest.mark.apply
@pytest.mark.parametrize("tc_id", ["Candidate_314", "Candidate_318", "Candidate_319"])
def test_candidate_apply_success(apply_modal, applicant, job, shared_employer, tc_id, record_testcase):
    """Candidate_314/318/319 - Nộp hồ sơ (có / không thư giới thiệu): popup đóng, nút chuyển "Đã ứng tuyển";
    đơn status Mới ứng tuyển gắn CV đã chọn, có lịch sử; NTD thấy đơn trong danh sách ứng viên."""
    record_testcase(tc_id)
    detail, modal = apply_modal
    if tc_id != "Candidate_319":
        modal.cover_letter.fill("Tôi phù hợp với vị trí này")
    resp = modal.submit()
    assert resp is not None and resp.ok, f"Nộp hồ sơ thất bại: {resp and resp.text()}"
    expect(modal.root).to_have_count(0)
    expect(detail.applied_box).to_contain_text("Bạn đã ứng tuyển")
    app = _app_for(applicant, job["id"])
    assert app and app["status"] == "applied", f"Đơn: {app}"
    assert app["cv"]["id"] == applicant.default_cv()["id"]
    employer_apps = shared_employer.applications(job=job["id"])
    assert any(a["id"] == app["id"] for a in employer_apps["results"]), "NTD không thấy đơn mới"
    if tc_id == "Candidate_318":
        detail_app = applicant.json_ok(applicant.get(f"candidate/applications/{app['id']}/"), "Chi tiết đơn")
        assert detail_app["status_history"], "Đơn không có lịch sử trạng thái"


@pytest.mark.apply
@pytest.mark.testcase("Candidate_315")
def test_candidate_315_sending_state(apply_modal, page: Page):
    """Candidate_315 - Nhấn Nộp hồ sơ: nút "Đang gửi..." và bị disable."""
    _, modal = apply_modal
    held: list = []
    page.route("**/candidate/applications/", lambda r: held.append(r) if r.request.method == "POST" else r.continue_())
    modal.submit_button.click()
    busy = modal.root.get_by_role("button", name="Đang gửi...")
    expect(busy).to_be_visible()
    expect(busy).to_be_disabled()
    page.unroute("**/candidate/applications/")
    for r in held:
        r.continue_()


@pytest.mark.apply
@pytest.mark.testcase("Candidate_317")
def test_candidate_317_cancel(apply_modal, applicant, job):
    """Candidate_317 - Nhấn Hủy: popup đóng, không tạo đơn."""
    _, modal = apply_modal
    modal.cancel_button.click()
    expect(modal.root).to_have_count(0)
    assert _app_for(applicant, job["id"]) is None


@pytest.mark.apply
@pytest.mark.testcase("Candidate_320")
def test_candidate_320_notifications(apply_modal):
    """Candidate_320 - Ứng tuyển thành công: ứng viên nhận thông báo xác nhận; NTD nhận thông báo có đơn mới."""
    detail, modal = apply_modal
    assert modal.submit().ok
    bell = detail.shell.header.get_by_role("button", name=re.compile("Thông báo"))
    expect(bell, "Header không có khu vực thông báo cho ứng viên").to_be_visible(timeout=3000)


@pytest.mark.ai
@pytest.mark.apply
@pytest.mark.parametrize("tc_id", ["Candidate_321", "Candidate_324", "Candidate_325"])
def test_candidate_apply_ai_scoring(ai_available, tc_id, record_testcase):
    """Candidate_321/324/325 - AI tính match_score khi nộp / sau khi CV phân tích xong / thử lại nền khi AI lỗi."""
    record_testcase(tc_id)


@pytest.mark.apply
@pytest.mark.testcase("Candidate_322")
def test_candidate_322_duplicate_apply(login_as, applicant, job, page: Page, settings):
    """Candidate_322 - Đã ứng tuyển tin này: không cho nộp trùng ("Bạn đã ứng tuyển vị trí này")."""
    applicant.apply(job["id"])
    detail = _detail(page, settings, applicant, job["id"], login_as)
    expect(detail.apply_button).to_have_count(0)
    expect(detail.applied_box).to_be_visible()
    resp = applicant.post("candidate/applications/", data={"job_id": job["id"]})
    assert resp.status in (400, 409), f"API cho nộp trùng: {resp.status}"
    assert "Bạn đã ứng tuyển vị trí này" in resp.text(), f"Thông báo: {resp.text()}"


@pytest.mark.apply
@pytest.mark.testcase("Candidate_323")
def test_candidate_323_job_closed_meanwhile(apply_modal, applicant, job, shared_employer):
    """Candidate_323 - NTD đóng tin trong lúc mở popup, nhấn Nộp hồ sơ: báo lỗi, không tạo đơn."""
    _, modal = apply_modal
    shared_employer.job_action(job["id"], "close")
    resp = modal.submit()
    assert resp is not None and not resp.ok, "Tin đã đóng vẫn nộp được"
    expect(modal.root.get_by_role("alert")).to_be_visible()
    assert _app_for(applicant, job["id"]) is None


@pytest.mark.apply
@pytest.mark.testcase("Candidate_326")
def test_candidate_326_upload_new_cv_in_form(apply_modal, page: Page, job):
    """Candidate_326 - "Tải CV khác" trong popup: chuyển tới tải CV, xong quay lại tin để ứng tuyển."""
    _, modal = apply_modal
    modal.upload_link.click()
    expect(page).to_have_url(re.compile(rf"/cv/new\?redirect=/jobs/{job['id']}"))


@pytest.mark.apply
@pytest.mark.parametrize("tc_id, role", [("Candidate_327", "employer"), ("Candidate_327", "admin")])
def test_candidate_327_apply_as_non_candidate(login_role, job, page: Page, settings, tc_id, role, record_testcase):
    """Candidate_327 - NTD / Admin mở chi tiết tin: không hiển thị / không cho ứng tuyển."""
    record_testcase(tc_id)
    login_role(role)
    page.goto(f"{settings.base_url}/jobs/{job['id']}")
    detail = JobDetailPage(page, settings)
    if role == "admin":
        expect(page).not_to_have_url(re.compile(rf"/jobs/{job['id']}$"))  # admin chỉ có giao diện quản trị
        return
    detail.expect_loaded()
    expect(detail.apply_button).to_have_count(0)


# ================================================================ Đơn ứng tuyển của tôi
@pytest.fixture
def applied(login_as, applicant, shared_employer, public_api, page: Page, settings):
    """Nộp đơn vào 1 tin mới rồi mở Đơn ứng tuyển của tôi: (page, job, application)."""
    job = shared_employer.create_job(public_api)
    app = applicant.apply(job["id"])
    login_as(applicant)
    my = MyApplicationsPage(page, settings).open()
    return my, job, app


@pytest.mark.my_applications
@pytest.mark.testcase("Candidate_340")
def test_candidate_340_empty(login_as, candidate, page: Page, settings):
    """Candidate_340 - Chưa nộp đơn: "Bạn chưa ứng tuyển công việc nào", nút "Xem việc làm phù hợp"/"Tìm việc làm"."""
    login_as(candidate)
    my = MyApplicationsPage(page, settings).open()
    expect(my.empty.get_by_role("heading")).to_have_text("Bạn chưa ứng tuyển công việc nào")
    expect(my.empty.get_by_role("link", name=re.compile("Xem việc làm phù hợp|Tìm việc làm"))).to_be_visible()


@pytest.mark.my_applications
@pytest.mark.testcase("Candidate_341")
def test_candidate_341_status_filters(applied):
    """Candidate_341 - Bộ lọc gồm: Tất cả, Mới ứng tuyển, Đang sàng lọc, Phỏng vấn, Đề nghị nhận việc, Đã tuyển,
    Từ chối, Ứng viên đã rút."""
    my, *_ = applied
    labels = [re.sub(r"\s*\(\d+\)$", "", t).strip() for t in my.filters.get_by_role("button").all_inner_texts()]
    wanted = ["Tất cả", "Mới ứng tuyển", "Đang sàng lọc", "Phỏng vấn", "Đề nghị nhận việc", "Đã tuyển", "Từ chối",
              "Ứng viên đã rút"]
    assert labels == wanted, f"Bộ lọc: {labels}"


@pytest.mark.my_applications
@pytest.mark.parametrize("tc_id", ["Candidate_342", "Candidate_382"])
def test_candidate_filter_by_status(applied, applicant, tc_id, record_testcase):
    """Candidate_342/382 - Chọn 1 trạng thái: chỉ hiển thị đơn ở trạng thái đó; số đơn khớp số trên bộ lọc."""
    record_testcase(tc_id)
    my, *_ = applied
    apps = CandidateActions(applicant).applications()
    count = sum(1 for a in apps if a["status"] == "applied")
    my.filter("Mới ứng tuyển").click()
    expect(my.cards).to_have_count(count)
    expect(my.filter("Mới ứng tuyển")).to_contain_text(f"({count})")
    for i in range(my.cards.count()):
        expect(my.cards.nth(i)).to_contain_text("Mới ứng tuyển")


@pytest.mark.my_applications
@pytest.mark.testcase("Candidate_343")
def test_candidate_343_filter_empty(applied):
    """Candidate_343 - Trạng thái không có đơn: "Không có đơn nào ở trạng thái này" - "Chọn trạng thái khác..."."""
    my, *_ = applied
    my.filter("Đã tuyển").click()
    expect(my.empty.get_by_role("heading")).to_have_text("Không có đơn nào ở trạng thái này")
    expect(my.empty).to_contain_text("Chọn trạng thái khác để xem các đơn còn lại.")


@pytest.mark.my_applications
@pytest.mark.testcase("Candidate_344")
def test_candidate_344_application_info(applied, applicant):
    """Candidate_344 - Chọn 1 đơn: phiên bản CV đã nộp, tiến trình trạng thái."""
    my, job, _ = applied
    card = my.card(job["title"])
    expect(card).to_contain_text(applicant.default_cv()["title"])
    expect(card.get_by_role("list", name="Tiến trình hồ sơ")).to_be_visible()
    expect(card.locator("[aria-current='step']")).to_contain_text("Mới ứng tuyển")


@pytest.mark.my_applications
@pytest.mark.parametrize("tc_id", ["Candidate_345", "Candidate_372"])
def test_candidate_status_follows_employer(applied, shared_employer, page: Page, tc_id, record_testcase):
    """Candidate_345/372 - NTD chuyển lần lượt Đang sàng lọc → Phỏng vấn → Đề nghị nhận việc → Đã tuyển:
    trạng thái, tiến trình cập nhật đúng sau mỗi bước."""
    record_testcase(tc_id)
    my, job, app = applied
    steps = [("screening", "Đang sàng lọc"), ("interview", "Phỏng vấn"), ("offer", "Đề nghị nhận việc"), ("hired", "Đã tuyển")]
    if tc_id == "Candidate_345":
        steps = steps[:2]
    for status, label in steps:
        shared_employer.change_status(app["id"], status)
        page.reload()
        my.expect_loaded()
        expect(my.card(job["title"]).locator(".badge").first).to_have_text(label)


@pytest.mark.my_applications
@pytest.mark.parametrize("tc_id, action", [("Candidate_346", "delete"), ("Candidate_380", "close")])
def test_candidate_application_of_removed_job(applied, shared_employer, page: Page, tc_id, action, record_testcase):
    """Candidate_346/380 - NTD xóa / đóng tin: đơn vẫn hiển thị với thông tin đã lưu khi nộp."""
    record_testcase(tc_id)
    my, job, _ = applied
    if action == "close":
        shared_employer.job_action(job["id"], "close")
    else:
        resp = shared_employer.delete(f"employer/jobs/{job['id']}/")
        if not resp.ok:  # tin đã có đơn thì backend không cho xóa -> đóng tin
            shared_employer.job_action(job["id"], "close")
    page.reload()
    my.expect_loaded()
    expect(my.card(job["title"])).to_be_visible()


@pytest.mark.my_applications
@pytest.mark.parametrize("tc_id", ["Candidate_347", "Candidate_378", "Candidate_379"])
def test_candidate_interview_schedule(applied, shared_employer, page: Page, tc_id, record_testcase):
    """Candidate_347/378/379 - Đơn có lịch phỏng vấn: "Xác nhận tham gia" / "Đề nghị đổi lịch"."""
    record_testcase(tc_id)
    my, job, app = applied
    shared_employer.change_status(app["id"], "screening")
    shared_employer.change_status(app["id"], "interview")
    page.reload()
    my.expect_loaded()
    card = my.card(job["title"])
    expect(card.get_by_role("button", name="Xác nhận tham gia"),
           "Đơn ở trạng thái Phỏng vấn không có lịch / nút Xác nhận tham gia").to_be_visible(timeout=3000)


@pytest.mark.my_applications
@pytest.mark.testcase("Candidate_348")
def test_candidate_348_withdraw_popup(applied):
    """Candidate_348 - Rút hồ sơ: popup tiêu đề "Rút hồ sơ ứng tuyển?", nút "Hủy" và "Rút hồ sơ"."""
    my, job, _ = applied
    dialog = my.open_withdraw(job["title"])
    expect(dialog.title).to_have_text("Rút hồ sơ ứng tuyển?")
    expect(dialog.cancel_button).to_be_visible()
    expect(dialog.confirm_button("Rút hồ sơ")).to_be_visible()


@pytest.mark.my_applications
@pytest.mark.parametrize("tc_id, how", [("Candidate_349", "cancel"), ("Candidate_376", "cancel"),
                                        ("Candidate_350", "x"), ("Candidate_350", "esc")])
def test_candidate_withdraw_dismiss(applied, applicant, page: Page, tc_id, how, record_testcase):
    """Candidate_349/350/376 - Hủy / icon X / Esc: popup đóng, trạng thái đơn không đổi."""
    record_testcase(tc_id)
    my, job, _ = applied
    dialog = my.open_withdraw(job["title"])
    {"cancel": dialog.cancel_button.click, "x": dialog.close_icon.click, "esc": lambda: page.keyboard.press("Escape")}[how]()
    expect(dialog.root).to_have_count(0)
    assert _app_for(applicant, job["id"])["status"] == "applied"


@pytest.mark.my_applications
@pytest.mark.parametrize("tc_id", ["Candidate_351", "Candidate_375"])
def test_candidate_withdraw(applied, applicant, shared_employer, page: Page, tc_id, record_testcase):
    """Candidate_351/375 - Rút hồ sơ (kèm lý do): đơn "Ứng viên đã rút", lịch sử ghi lý do; NTD thấy nhãn
    "Ứng viên đã rút", không chuyển trạng thái được."""
    record_testcase(tc_id)
    my, job, app = applied
    dialog = my.open_withdraw(job["title"])
    my.reason.fill("Đã nhận việc nơi khác")
    dialog.confirm_button("Rút hồ sơ").click()
    expect(my.card(job["title"])).to_contain_text("Ứng viên đã rút")
    detail = applicant.json_ok(applicant.get(f"candidate/applications/{app['id']}/"), "Chi tiết đơn")
    assert detail["status"] == "withdrawn"
    assert detail["status_history"][-1]["to_status"] == "withdrawn"
    emp = shared_employer.application(app["id"])
    assert emp["status"] == "withdrawn"
    if tc_id == "Candidate_375":
        resp = shared_employer.post(f"employer/applications/{app['id']}/status/", data={"status": "screening"})
        assert not resp.ok, "NTD vẫn chuyển trạng thái được đơn ứng viên đã rút"


@pytest.mark.my_applications
@pytest.mark.parametrize("tc_id, final", [("Candidate_369", "hired"), ("Candidate_369", "rejected"),
                                          ("Candidate_377", "hired"), ("Candidate_377", "rejected")])
def test_candidate_cannot_withdraw_finished(applied, applicant, shared_employer, page: Page, tc_id, final, record_testcase):
    """Candidate_369/377 - Đơn Đã tuyển / Từ chối: không có nút Rút hồ sơ; gọi API rút không được, trạng thái không đổi."""
    record_testcase(tc_id)
    my, job, app = applied
    path = ["screening", "interview", "offer", "hired"] if final == "hired" else ["rejected"]
    for status in path:
        shared_employer.change_status(app["id"], status, rejection_reason="Không phù hợp" if status == "rejected" else "")
    page.reload()
    my.expect_loaded()
    expect(my.withdraw_button(my.card(job["title"]))).to_have_count(0)
    if tc_id == "Candidate_377":
        resp = CandidateActions(applicant).withdraw(app["id"])
        assert not resp.ok
        assert _app_for(applicant, job["id"])["status"] == final


@pytest.mark.my_applications
@pytest.mark.testcase("Candidate_370")
def test_candidate_370_list_three(login_as, candidate_factory, shared_employer, public_api, page: Page, settings):
    """Candidate_370 - Nộp 3 tin: đủ 3 đơn (vị trí, công ty, ngày nộp, "Mới ứng tuyển"), mới nhất trước."""
    client = candidate_factory(["pdf"])
    jobs = [shared_employer.create_job(public_api) for _ in range(3)]
    for j in jobs:
        client.apply(j["id"])
    login_as(client)
    my = MyApplicationsPage(page, settings).open()
    expect(my.cards).to_have_count(3)
    titles = [t.strip() for t in my.cards.locator("h2").all_inner_texts()]
    assert titles == [j["title"] for j in reversed(jobs)], f"Thứ tự: {titles}"
    for i in range(3):
        card = my.cards.nth(i)
        expect(card).to_contain_text("Mới ứng tuyển")
        expect(card).to_contain_text("Nộp ngày")
        expect(card).to_contain_text("Công ty Auto Dùng Chung")


@pytest.mark.my_applications
@pytest.mark.parametrize("tc_id", ["Candidate_371", "Candidate_383"])
def test_candidate_only_own_applications(applied, candidate, tc_id, record_testcase):
    """Candidate_371/383 - Không thấy đơn của ứng viên khác; đổi id đơn trên API thành đơn người khác: bị từ chối."""
    record_testcase(tc_id)
    my, job, app = applied
    assert not CandidateActions(candidate).applications(), "Ứng viên khác thấy đơn không phải của mình"
    resp = candidate.get(f"candidate/applications/{app['id']}/")
    assert resp.status in (403, 404), f"Xem được đơn người khác: {resp.status}"


@pytest.mark.my_applications
@pytest.mark.testcase("Candidate_373")
def test_candidate_373_notification_link(applied):
    """Candidate_373 - Bấm thông báo đổi trạng thái đơn: mở đúng chi tiết đơn."""
    my, *_ = applied
    bell = my.page.get_by_role("banner").get_by_role("button", name=re.compile("Thông báo"))
    expect(bell, "Header không có khu vực thông báo cho ứng viên").to_be_visible(timeout=3000)


@pytest.mark.my_applications
@pytest.mark.testcase("Candidate_374")
def test_candidate_374_submitted_cv_version(applied, applicant, page: Page):
    """Candidate_374 - Tải phiên bản mới cho CV đã nộp: đơn vẫn hiển thị phiên bản CV đã nộp."""
    my, job, app = applied
    cv = applicant.default_cv()
    applicant.rename_cv(cv["id"], "CV đã đổi tên sau khi nộp")
    detail = applicant.json_ok(applicant.get(f"candidate/applications/{app['id']}/"), "Chi tiết đơn")
    assert detail["cv"]["title"] != "CV đã đổi tên sau khi nộp", "Đơn đổi theo phiên bản CV mới"


@pytest.mark.my_applications
@pytest.mark.testcase("Candidate_381")
def test_candidate_381_rejected_no_internal_reason(applied, applicant, shared_employer, page: Page):
    """Candidate_381 - NTD từ chối: trạng thái "Từ chối", ứng viên không thấy lý do nội bộ của NTD."""
    my, job, app = applied
    shared_employer.change_status(app["id"], "rejected", note="Ghi chú nội bộ XYZ", rejection_reason="Lý do nội bộ XYZ")
    page.reload()
    my.expect_loaded()
    card = my.card(job["title"])
    expect(card).to_contain_text("Từ chối")
    expect(page.get_by_text("XYZ")).to_have_count(0)
    detail = applicant.get(f"candidate/applications/{app['id']}/").text()
    assert "nội bộ XYZ" not in detail, "API trả lý do / ghi chú nội bộ của NTD cho ứng viên"


# ================================================================ Thư mời ứng tuyển
@pytest.mark.invitations
@pytest.mark.parametrize("tc_id", [f"Candidate_{n}" for n in (393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403,
                                                              404, 405, 406, 407, 408, 409, 410, 411)])
def test_candidate_invitations(tc_id, record_testcase):
    """Candidate_393..411 - Thư mời ứng tuyển (nhận, đọc, lọc, ứng tuyển, từ chối, thu hồi, badge chưa xem)."""
    record_testcase(tc_id)
    pytest.skip(f"MÔI TRƯỜNG: {INVITATIONS_MISSING}")


# ================================================================ Yêu thích
@pytest.fixture
def favorites(login_as, candidate, page: Page, settings):
    login_as(candidate)
    return FavoritesPage(page, settings).open()


@pytest.mark.favorites
@pytest.mark.testcase("Candidate_421")
def test_candidate_421_jobs_tab_empty(favorites):
    """Candidate_421 - Tab Việc làm trống: "Chưa có việc làm yêu thích" - "Bấm biểu tượng trái tim..." + "Tìm việc làm"."""
    expect(favorites.empty.get_by_role("heading")).to_have_text("Chưa có việc làm yêu thích")
    expect(favorites.empty).to_contain_text("Bấm biểu tượng trái tim")
    expect(favorites.empty.get_by_role("link", name="Tìm việc làm")).to_be_visible()


@pytest.mark.favorites
@pytest.mark.testcase("Candidate_422")
def test_candidate_422_companies_tab_empty(favorites):
    """Candidate_422 - Tab Công ty trống: "Chưa có công ty yêu thích" + "Xem các công ty"."""
    favorites.tab("Công ty").click()
    expect(favorites.empty.get_by_role("heading")).to_have_text("Chưa có công ty yêu thích")
    expect(favorites.empty.get_by_role("link", name="Xem các công ty")).to_be_visible()


@pytest.mark.favorites
@pytest.mark.parametrize("tc_id", ["Candidate_423", "Candidate_424", "Candidate_429"])
def test_candidate_save_job(login_as, candidate, job, page: Page, settings, tc_id, record_testcase):
    """Candidate_423/424/429 - Lưu tin (trái tim): thêm vào Yêu thích, icon "Đã lưu"; nhấn lại: bỏ lưu;
    lưu ở danh sách -> chi tiết tin hiển thị đã lưu."""
    record_testcase(tc_id)
    login_as(candidate)
    page.goto(f"{settings.base_url}/jobs?q={job['title']}")
    card = page.locator("article.job-card").filter(has=page.get_by_role("link", name=job["title"]))
    heart = card.get_by_role("button", name="Yêu thích")
    heart.click()
    expect(card.get_by_role("button", name="Bỏ yêu thích")).to_have_attribute("aria-pressed", "true")
    assert any(j["id"] == job["id"] for j in CandidateActions(candidate).favorite_jobs())
    if tc_id == "Candidate_429":
        card.get_by_role("link", name=job["title"]).click()
        detail = JobDetailPage(page, settings)
        detail.expect_loaded()
        expect(detail.favorite).to_have_text("Đã yêu thích")
    if tc_id == "Candidate_424":
        card.get_by_role("button", name="Bỏ yêu thích").click()
        expect(card.get_by_role("button", name="Yêu thích")).to_have_attribute("aria-pressed", "false")
        assert not any(j["id"] == job["id"] for j in CandidateActions(candidate).favorite_jobs())


@pytest.mark.favorites
@pytest.mark.testcase("Candidate_425")
def test_candidate_425_sorted_by_saved_date(login_as, candidate, shared_employer, public_api, page: Page, settings):
    """Candidate_425 - Lưu A, B, C: danh sách theo ngày lưu mới nhất C, B, A."""
    jobs = [shared_employer.create_job(public_api) for _ in range(3)]
    actions = CandidateActions(candidate)
    for j in jobs:
        actions.favorite_job(j["id"])
    login_as(candidate)
    fav = FavoritesPage(page, settings).open()
    assert fav.jobs.titles()[:3] == [j["title"] for j in reversed(jobs)], f"Thứ tự: {fav.jobs.titles()}"


@pytest.mark.favorites
@pytest.mark.testcase("Candidate_426")
def test_candidate_426_saved_job_closed(login_as, candidate, job, shared_employer, page: Page, settings):
    """Candidate_426 - Tin đã lưu bị đóng: vẫn hiển thị, nhãn "Đã đóng", ẩn nút ứng tuyển."""
    CandidateActions(candidate).favorite_job(job["id"])
    shared_employer.job_action(job["id"], "close")
    login_as(candidate)
    fav = FavoritesPage(page, settings).open()
    card = fav.jobs.card(job["title"])
    expect(card).to_contain_text("Đã đóng")
    expect(card.get_by_role("button", name=re.compile("Ứng tuyển"))).to_have_count(0)


@pytest.mark.favorites
@pytest.mark.testcase("Candidate_427")
def test_candidate_427_apply_from_favorites(login_as, applicant, job, page: Page, settings):
    """Candidate_427 - Nhấn "Ứng tuyển" trên tin đã lưu: hiển thị popup ứng tuyển."""
    CandidateActions(applicant).favorite_job(job["id"])
    login_as(applicant)
    fav = FavoritesPage(page, settings).open()
    card = fav.jobs.card(job["title"])
    button = card.get_by_role("button", name=re.compile("Ứng tuyển"))
    expect(button, "Thẻ tin đã lưu không có nút Ứng tuyển").to_be_visible(timeout=3000)
    button.click()
    expect(page.get_by_role("dialog").filter(has_text="Ứng tuyển:")).to_be_visible()


@pytest.mark.favorites
@pytest.mark.testcase("Candidate_428")
def test_candidate_428_save_as_guest(job, page: Page, settings, candidate):
    """Candidate_428 - Chưa đăng nhập, nhấn Lưu: chuyển đến đăng nhập rồi quay lại tin đó."""
    page.goto(f"{settings.base_url}/jobs/{job['id']}")
    detail = JobDetailPage(page, settings)
    detail.expect_loaded()
    detail.favorite.click()
    login = LoginPage(page, settings)
    login.expect_loaded()
    login.login_and_wait_api(candidate.email, candidate.password)
    expect(page).to_have_url(re.compile(rf"/jobs/{job['id']}$"))
