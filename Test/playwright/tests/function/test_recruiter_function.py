"""Nhà tuyển dụng – TC nghiệp vụ riêng (KBKTCN sheet "Nhà tuyển dụng", Recruiter_1..766).

Textbox / combobox / ô số / phân trang / popup Hủy-X-Esc / giao diện chung / phân quyền / trạng thái tải:
tests/generic (sinh từ tài liệu theo mẫu).

Dữ liệu: mỗi test làm thay đổi dữ liệu dùng NTD mới (đăng ký qua API: tài khoản + công ty riêng); ứng viên nộp
đơn là `shared_applicant` (1 CV, dùng chung vì backend giới hạn 30 lượt tải CV/giờ).
Tính năng AI sàng lọc (FEATURES.ai = false ở FE, backend chưa có API) và Tìm ứng viên / Thư mời (backend 404)
được đánh dấu tương ứng: test AI -> kiểm tra thành phần giao diện theo tài liệu; Thư mời -> skip lỗi môi trường.
"""
import re
from datetime import date, timedelta

import pytest
from playwright.sync_api import Page, expect

from pages.components import ConfirmDialog
from pages.public_pages import JobListPage
from pages.recruiter_pages import (
    ApplicantDetailPage, ApplicantsPage, CompanyProfileForm, JobFormPage, ManageJobsPage, RecruiterAccountForm,
    RecruiterDashboard,
)
from specs.screens_recruiter import TALENTS_MISSING
from utils.ats_api import CandidateActions, results
from utils.cv_files import CvFile
from utils.feature import require
from utils.helpers import unique_suffix

pytestmark = [pytest.mark.function, pytest.mark.recruiter]


# ---------------------------------------------------------------- fixture
@pytest.fixture
def employer(employer_factory):
    return employer_factory()


@pytest.fixture
def as_employer(login_as, employer, page: Page, settings):
    """Đăng nhập trình duyệt bằng NTD mới; open(PageClass, **kw) -> Page Object đã mở."""

    def _open(cls, **kw):
        po = cls(page, settings)
        po.env = type("Env", (), {"client": employer, "data": kw.pop("data", {}),
                                  "fixtures": None})()
        return po.open(**kw) if kw else po.open()

    login_as(employer)
    return _open


def _apply(employer, public_api, applicant, **job_kw):
    job = employer.create_job(public_api, **job_kw)
    app = applicant.apply(job["id"])
    return job, app


def _image(name: str, size: int, mime: str = "image/png") -> CvFile:
    png = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                        "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082")
    return CvFile(name, mime, png + b"\0" * max(0, size - len(png)))


# ================================================================ Dashboard
@pytest.mark.parametrize("tc_id", ["Recruiter_13", "Recruiter_17"])
def test_recruiter_dashboard_stats(as_employer, employer, public_api, shared_applicant, tc_id, record_testcase):
    """Recruiter_13/17 - Số liệu thẻ thống kê đúng, chỉ tính dữ liệu của công ty NTD; "X hồ sơ trong 7 ngày qua" đúng."""
    record_testcase(tc_id)
    _apply(employer, public_api, shared_applicant)
    employer.create_job(public_api)
    dash = as_employer(RecruiterDashboard)
    api = employer.dashboard()
    assert dash.stat("Tin đang tuyển") == api["jobs"]["published"]
    assert dash.stat("Tổng hồ sơ") == api["applications"]["total"] == 1
    assert dash.stat("Hồ sơ mới chưa xử lý") == 1
    assert f"{api['applications']['new_last_7_days']} hồ sơ trong 7 ngày qua" in dash.hint("Tổng hồ sơ")


@pytest.mark.testcase("Recruiter_14")
def test_recruiter_14_pipeline_link(as_employer, employer, public_api, shared_applicant, page: Page):
    """Recruiter_14 - Nhấn 1 vòng ở Quy trình tuyển dụng: sang màn hình Ứng viên đã lọc theo trạng thái."""
    _apply(employer, public_api, shared_applicant)
    dash = as_employer(RecruiterDashboard)
    dash.pipeline.locator("a.pipeline-step").first.click()
    expect(page).to_have_url(re.compile(r"/recruiter/applicants\?status=\w+"))


@pytest.mark.testcase("Recruiter_15")
def test_recruiter_15_recent_table(as_employer, employer, public_api, shared_applicant, page: Page):
    """Recruiter_15 - Bảng Hồ sơ mới nhận: hồ sơ mới nhất, chưa chấm AI hiển thị "Chưa lọc"; "Xem hồ sơ" -> Chi tiết."""
    job, _ = _apply(employer, public_api, shared_applicant)
    dash = as_employer(RecruiterDashboard)
    row = dash.recent.locator("tbody tr").first
    expect(row).to_contain_text(job["title"])
    expect(row, "Cột Điểm AI ('Chưa lọc') không hiển thị").to_contain_text("Chưa lọc", timeout=3000)
    row.get_by_role("link", name=re.compile("Xem hồ sơ")).click()
    expect(page).to_have_url(re.compile(r"/recruiter/applicants/[\w-]+$"))


@pytest.mark.parametrize("tc_id", ["Recruiter_16", "Recruiter_24"])
def test_recruiter_dashboard_empty(as_employer, tc_id, record_testcase):
    """Recruiter_16/24 - Công ty mới: "Chưa có hồ sơ ứng tuyển" - "Đăng tin tuyển dụng để bắt đầu nhận hồ sơ.";
    số liệu bằng 0, không lỗi chia 0."""
    record_testcase(tc_id)
    dash = as_employer(RecruiterDashboard)
    expect(dash.empty.get_by_role("heading")).to_have_text("Chưa có hồ sơ ứng tuyển")
    expect(dash.empty).to_contain_text("Đăng tin tuyển dụng để bắt đầu nhận hồ sơ.")
    for label in ("Tin đang tuyển", "Tổng hồ sơ", "Hồ sơ mới chưa xử lý", "Đang trong quy trình"):
        assert dash.stat(label) == 0
    expect(dash.page.get_by_text(re.compile("NaN|Infinity"))).to_have_count(0)


@pytest.mark.parametrize("tc_id, action", [("Recruiter_18", "apply"), ("Recruiter_19", "interview"),
                                           ("Recruiter_20", "close"), ("Recruiter_21", "hired")])
def test_recruiter_dashboard_updates(as_employer, employer, public_api, shared_applicant, page: Page, tc_id, action,
                                     record_testcase):
    """Recruiter_18..21 - Hồ sơ mới / chuyển Phỏng vấn / đóng tin / Đã tuyển: tải lại, số liệu thay đổi tương ứng."""
    record_testcase(tc_id)
    job, app = _apply(employer, public_api, shared_applicant)
    dash = as_employer(RecruiterDashboard)
    before = {k: dash.stat(k) for k in ("Tin đang tuyển", "Tổng hồ sơ", "Hồ sơ mới chưa xử lý", "Đang trong quy trình")}
    hired_before = dash.hint("Đang trong quy trình")
    if action == "apply":
        _apply(employer, public_api, shared_applicant)
    elif action == "interview":
        employer.change_status(app["id"], "screening")
        employer.change_status(app["id"], "interview")
    elif action == "close":
        employer.job_action(job["id"], "close")
    else:
        for s in ("screening", "interview", "offer", "hired"):
            employer.change_status(app["id"], s)
    page.reload()
    dash.expect_loaded()
    if action == "apply":
        assert dash.stat("Tổng hồ sơ") == before["Tổng hồ sơ"] + 1
        assert dash.stat("Hồ sơ mới chưa xử lý") == before["Hồ sơ mới chưa xử lý"] + 1
    elif action == "interview":
        assert dash.stat("Hồ sơ mới chưa xử lý") == before["Hồ sơ mới chưa xử lý"] - 1
        assert dash.stat("Đang trong quy trình") == before["Đang trong quy trình"] + 1
    elif action == "close":
        assert dash.stat("Tin đang tuyển") == before["Tin đang tuyển"] - 1
    else:
        assert "1 đã tuyển" in dash.hint("Đang trong quy trình"), f"{hired_before} -> {dash.hint('Đang trong quy trình')}"


@pytest.mark.parametrize("tc_id", ["Recruiter_22", "Recruiter_23"])
def test_recruiter_dashboard_ai(as_employer, tc_id, record_testcase):
    """Recruiter_22/23 - "Điểm AI trung bình" và link "Dùng AI sàng lọc để tìm ứng viên tiềm năng"."""
    record_testcase(tc_id)
    dash = as_employer(RecruiterDashboard)
    target = dash.stat_card("Điểm AI trung bình") if tc_id == "Recruiter_22" else \
        dash.page.get_by_role("link", name=re.compile("Dùng AI sàng lọc"))
    require(target, "thẻ Điểm AI trung bình / link Dùng AI sàng lọc (AI sàng lọc đang tắt: FEATURES.ai = false)")


# ================================================================ Hồ sơ công ty: logo
@pytest.mark.testcase("Recruiter_34")
def test_recruiter_34_logo_hint(as_employer):
    """Recruiter_34 - Khu vực tải logo kèm hướng dẫn "JPG, PNG, WEBP · tối đa 2MB"."""
    po = as_employer(CompanyProfileForm)
    expect(po.logo).to_contain_text("JPG, PNG, WEBP · tối đa 2MB")


@pytest.mark.parametrize("tc_id, name, size, mime, ok", [
    ("Recruiter_35", "logo.png", 50_000, "image/png", True), ("Recruiter_37", "logo.jpg", 50_000, "image/jpeg", True),
    ("Recruiter_37", "logo.webp", 50_000, "image/webp", True), ("Recruiter_38", "virus.exe", 2_000, "application/octet-stream", False),
    ("Recruiter_38", "note.txt", 2_000, "text/plain", False), ("Recruiter_39", "fake.png", 2_000, "image/png", False),
    ("Recruiter_40", "small.png", 1024 * 1024, "image/png", True), ("Recruiter_41", "equal.png", 2 * 1024 * 1024, "image/png", True),
    ("Recruiter_42", "big.png", 2 * 1024 * 1024 + 1, "image/png", False), ("Recruiter_43", "empty.png", 0, "image/png", False),
])
def test_recruiter_logo_upload(as_employer, employer, tc_id, name, size, mime, ok, record_testcase):
    """Recruiter_35, 37..43 - Định dạng JPG/PNG/WEBP, tối đa 2MB, file rỗng / giả mạo đuôi: tải được hoặc báo lỗi."""
    record_testcase(tc_id)
    po = as_employer(CompanyProfileForm)
    if name == "fake.png":
        file = CvFile(name, mime, b"MZ\x90\x00" + b"\0" * size)
    elif size == 0:
        file = CvFile(name, mime, b"")
    else:
        file = _image(name, size, mime)
    po.logo_input.set_input_files(file.payload())
    if ok:
        expect(po.logo.get_by_role("button", name="Đổi logo")).to_be_visible()
        assert employer.company()["logo_url"], "Logo chưa được lưu"
    else:
        expect(po.logo_error).to_be_visible()
        if tc_id == "Recruiter_42":
            expect(po.logo_error).to_contain_text("File vượt quá 2MB")
        assert not employer.company()["logo_url"]


@pytest.mark.testcase("Recruiter_36")
def test_recruiter_36_logo_drag_drop(as_employer):
    """Recruiter_36 - Kéo thả file hợp lệ vào khu vực tải lên."""
    po = as_employer(CompanyProfileForm)
    require(po.logo.locator("label.dropzone"), "khu vực kéo thả logo (giao diện chỉ có nút chọn file)")


@pytest.mark.testcase("Recruiter_44")
def test_recruiter_44_cancel_chooser(as_employer, employer):
    """Recruiter_44 - Mở hộp thoại chọn file rồi Cancel: không chọn file, giữ trạng thái cũ."""
    po = as_employer(CompanyProfileForm)
    with po.page.expect_file_chooser() as fc:
        po.logo_button.click()
    fc.value.set_files([])
    expect(po.logo_error).to_have_count(0)
    assert not employer.company()["logo_url"]


@pytest.mark.testcase("Recruiter_45")
def test_recruiter_45_uploading_state(as_employer):
    """Recruiter_45 - Đang tải: nút "Đang tải lên..."; tải xong đổi thành "Đổi logo"."""
    po = as_employer(CompanyProfileForm)
    held = []
    po.page.route("**/employer/company/logo/", lambda r: held.append(r))
    po.logo_input.set_input_files(_image("logo.png", 10_000).payload())
    expect(po.logo.get_by_role("button", name="Đang tải lên...")).to_be_disabled()
    po.page.unroute("**/employer/company/logo/")
    for r in held:
        r.continue_()
    expect(po.logo.get_by_role("button", name="Đổi logo")).to_be_visible()


# ================================================================ Hồ sơ công ty: MST, website, email, lưu
def _save_company(po: CompanyProfileForm, label: str, value: str):
    po.field(label).fill(value)
    return po.submit()


@pytest.mark.parametrize("tc_id, value, ok", [("Recruiter_82", "0101234567", True), ("Recruiter_83", "0101234567-001", True),
                                              ("Recruiter_84", "010123456", False), ("Recruiter_84", "01012345678", False),
                                              ("Recruiter_85", "abc@#$1234", False)])
def test_recruiter_tax_code(as_employer, employer, tc_id, value, ok, record_testcase):
    """Recruiter_82..85 - MST 10 số / 13 số chi nhánh hợp lệ; 9, 11 số, chữ cái: báo định dạng không hợp lệ."""
    record_testcase(tc_id)
    po = as_employer(CompanyProfileForm)
    if ok:
        value = f"{value[:4]}{unique_suffix()[-6:]}{value[10:]}"  # MST là duy nhất trong hệ thống
    resp = _save_company(po, "Mã số thuế", value)
    if ok:
        assert resp is not None and resp.ok, po.messages()
        assert employer.company()["tax_code"] == value
    else:
        assert resp is None or not resp.ok, f"MST '{value}' sai định dạng vẫn được lưu"
        assert "10 chữ số, chi nhánh thêm -XXX" in po.messages() or po.field("Mã số thuế").get_attribute("title") == \
            "10 chữ số, chi nhánh thêm -XXX"


@pytest.mark.testcase("Recruiter_86")
def test_recruiter_86_duplicate_tax_code(as_employer, employer_factory):
    """Recruiter_86 - MST đã được công ty khác đăng ký: báo lỗi mã số thuế đã tồn tại."""
    other = employer_factory()
    tax = f"09{unique_suffix()[-8:]}"
    other.update_company(tax_code=tax)
    po = as_employer(CompanyProfileForm)
    resp = _save_company(po, "Mã số thuế", tax)
    assert resp is not None and not resp.ok
    expect(po.form_root.get_by_role("alert")).to_contain_text("Mã số thuế đã được đăng ký")


@pytest.mark.parametrize("tc_id, value, ok", [("Recruiter_126", "https://viettel.com.vn", True),
                                              ("Recruiter_127", "viettel", False), ("Recruiter_127", "http//abc", False)])
def test_recruiter_website(as_employer, employer, tc_id, value, ok, record_testcase):
    """Recruiter_126/127 - URL hợp lệ: lưu được; URL sai: "Vui lòng nhập URL", không lưu."""
    record_testcase(tc_id)
    po = as_employer(CompanyProfileForm)
    resp = _save_company(po, "Website", value)
    if ok:
        assert resp is not None and resp.ok
    else:
        assert resp is None or not resp.ok
        assert "Vui lòng nhập URL" in po.messages(), po.messages()


@pytest.mark.parametrize("tc_id, value, ok", [
    ("Recruiter_146", "firstname@viettel.com.vn", True), ("Recruiter_146", "firstname.lastname@gmail.com", True),
    ("Recruiter_146", "email@subdomain.domain.com", True), ("Recruiter_147", "plainaddress", False),
    ("Recruiter_147", "@domain.com", False), ("Recruiter_147", "email.domain.com", False),
    ("Recruiter_147", "email@domain@domain.com", False),
])
def test_recruiter_contact_email(as_employer, tc_id, value, ok, record_testcase):
    """Recruiter_146/147 - Email hợp lệ lưu được; sai định dạng: "Vui lòng nhập email hợp lệ", không lưu."""
    record_testcase(tc_id)
    po = as_employer(CompanyProfileForm)
    resp = _save_company(po, "Email liên hệ", value)
    if ok:
        assert resp is not None and resp.ok
    else:
        assert resp is None or not resp.ok
        assert "email" in po.messages().lower(), po.messages()


@pytest.mark.parametrize("tc_id", ["Recruiter_205", "Recruiter_208"])
def test_recruiter_save_company(as_employer, employer, public_api, page: Page, settings, tc_id, record_testcase):
    """Recruiter_205/208 - Lưu: "Đã lưu hồ sơ công ty.", thông tin mới hiển thị trên các tin tuyển dụng."""
    record_testcase(tc_id)
    job = employer.create_job(public_api)
    po = as_employer(CompanyProfileForm)
    name = f"Công ty Mới {unique_suffix()}"
    resp = _save_company(po, "Tên công ty", name)
    assert resp is not None and resp.ok
    expect(po.status).to_have_text("Đã lưu hồ sơ công ty.")
    page.goto(f"{settings.base_url}/jobs/{job['id']}")
    expect(page.locator("section.job-detail-header a.company-link")).to_have_text(name)


@pytest.mark.testcase("Recruiter_206")
def test_recruiter_206_company_owner(employer, as_employer):
    """Recruiter_206 - Đăng ký NTD + nhập công ty: tạo công ty, người tạo là Chủ sở hữu (owner)."""
    assert employer.profile()["company_role"] == "owner"
    po = as_employer(CompanyProfileForm)
    expect(po.field("Tên công ty")).to_be_editable()


@pytest.mark.testcase("Recruiter_207")
def test_recruiter_207_pending_verification(as_employer, employer):
    """Recruiter_207 - Công ty có MST: thông báo "Công ty đang chờ quản trị viên xác minh (dựa trên mã số thuế)"."""
    employer.update_company(tax_code=f"07{unique_suffix()[-8:]}")
    po = as_employer(CompanyProfileForm)
    expect(po.page.get_by_text("Công ty đang chờ quản trị viên xác minh (dựa trên mã số thuế).")).to_be_visible()


@pytest.mark.parametrize("tc_id", ["Recruiter_209", "Recruiter_211", "Recruiter_212"])
def test_recruiter_company_members(as_employer, tc_id, record_testcase):
    """Recruiter_209/211/212 - Thành viên (recruiter) chỉ xem; gửi yêu cầu tham gia công ty; mời thành viên."""
    record_testcase(tc_id)
    po = as_employer(CompanyProfileForm)
    require(po.page.get_by_role("button", name=re.compile("Mời thành viên|Tham gia công ty")),
            "chức năng quản lý thành viên công ty (mời / tham gia / phân vai)")


@pytest.mark.testcase("Recruiter_210")
def test_recruiter_210_offline_save(as_employer, employer):
    """Recruiter_210 - Mất mạng khi lưu: báo lỗi, không cập nhật, dữ liệu đã nhập giữ trên form."""
    po = as_employer(CompanyProfileForm)
    before = employer.company()["name"]
    po.field("Tên công ty").fill("Tên đang nhập")
    po.page.route("**/employer/company/", lambda r: r.abort() if r.request.method == "PATCH" else r.continue_())
    po.submit_button.click()
    expect(po.status).to_have_class(re.compile("text-danger"))
    expect(po.field("Tên công ty")).to_have_value("Tên đang nhập")
    assert employer.company()["name"] == before


# ================================================================ Tin tuyển dụng
@pytest.fixture
def jobs_of(as_employer, employer, public_api):
    def _open(*specs) -> tuple[ManageJobsPage, list[dict]]:
        created = []
        for spec in specs:
            action = spec.pop("action", None) if isinstance(spec, dict) else None
            job = employer.create_job(public_api, **(spec or {}))
            if action:
                employer.job_action(job["id"], action)
            created.append(job)
        return as_employer(ManageJobsPage), created
    return _open


@pytest.mark.testcase("Recruiter_247")
def test_recruiter_247_status_tabs(jobs_of):
    """Recruiter_247 - Bộ lọc gồm: Tất cả, Bản nháp, Đang tuyển, Tạm dừng, Đã đóng, Hết hạn."""
    po, _ = jobs_of({})
    expect(po.status_tabs.get_by_role("button")).to_have_text(
        ["Tất cả", "Bản nháp", "Đang tuyển", "Tạm dừng", "Đã đóng", "Hết hạn"])


@pytest.mark.testcase("Recruiter_248")
def test_recruiter_248_filter_status(jobs_of):
    """Recruiter_248 - Chọn 1 trạng thái: chỉ tin ở trạng thái đó; không có: "Không có tin nào khớp bộ lọc"."""
    po, jobs = jobs_of({}, {"status": "draft"})
    po.tab("Bản nháp").click()
    po.wait_results()
    assert po.result_keys() == [jobs[1]["title"]]
    po.tab("Hết hạn").click()
    po.wait_results()
    expect(po.empty_state.get_by_role("heading")).to_have_text("Không có tin nào khớp bộ lọc")


@pytest.mark.testcase("Recruiter_249")
def test_recruiter_249_no_jobs(as_employer):
    """Recruiter_249 - Chưa đăng tin: "Bạn chưa đăng tin tuyển dụng nào" - "Đăng tin để bắt đầu nhận hồ sơ ứng viên."."""
    po = as_employer(ManageJobsPage)
    expect(po.empty_state.get_by_role("heading")).to_have_text("Bạn chưa đăng tin tuyển dụng nào")
    expect(po.empty_state).to_contain_text("Đăng tin để bắt đầu nhận hồ sơ ứng viên.")


@pytest.mark.testcase("Recruiter_250")
def test_recruiter_250_table_data(jobs_of, shared_applicant):
    """Recruiter_250 - Tin nháp: Ngày đăng "Chưa đăng"; cột Hồ sơ đúng số hồ sơ."""
    po, jobs = jobs_of({"status": "draft"}, {})
    shared_applicant.apply(jobs[1]["id"])
    po.page.reload()
    po.expect_loaded()
    expect(po.row(jobs[0]["title"])).to_contain_text("Chưa đăng")
    expect(po.row(jobs[1]["title"]).locator("td[data-label='Hồ sơ']")).to_contain_text("1")


@pytest.mark.testcase("Recruiter_251")
def test_recruiter_251_actions_menu(jobs_of):
    """Recruiter_251 - Menu thao tác theo trạng thái: Sửa tin, Ứng viên phù hợp, Xem tin công khai, Tạm dừng, Đóng tin, Xóa tin."""
    po, jobs = jobs_of({})
    menu = po.actions_menu(jobs[0]["title"])
    for label in ("Sửa tin", "Ứng viên phù hợp", "Xem tin công khai", "Tạm dừng", "Đóng tin", "Xóa tin"):
        expect(menu.get_by_text(label, exact=True), f"Thiếu thao tác {label}").to_be_visible()


@pytest.mark.testcase("Recruiter_252")
def test_recruiter_252_view_applicants(jobs_of, page: Page):
    """Recruiter_252 - "Xem hồ sơ": sang màn hình Ứng viên đã lọc theo tin đó."""
    po, jobs = jobs_of({})
    po.row(jobs[0]["title"]).get_by_role("link", name=f"Xem hồ sơ ứng tuyển tin {jobs[0]['title']}").click()
    expect(page).to_have_url(re.compile(rf"/recruiter/applicants\?jobId={jobs[0]['id']}"))


@pytest.mark.testcase("Recruiter_253")
def test_recruiter_253_view_public(jobs_of, page: Page):
    """Recruiter_253 - "Xem tin công khai": mở trang chi tiết tin như ứng viên nhìn thấy."""
    po, jobs = jobs_of({})
    po.action(jobs[0]["title"], "Xem tin công khai")
    expect(page).to_have_url(re.compile(rf"/jobs/{jobs[0]['id']}$"))


@pytest.mark.parametrize("tc_id", ["Recruiter_254", "Recruiter_269", "Recruiter_270"])
def test_recruiter_pause_resume(jobs_of, employer, public_api, shared_applicant, tc_id, record_testcase):
    """Recruiter_254/269/270 - Tạm dừng: "Tạm dừng", ẩn khỏi tìm kiếm, giữ đơn; Tiếp tục tuyển: "Đang tuyển" lại."""
    record_testcase(tc_id)
    po, jobs = jobs_of({})
    title = jobs[0]["title"]
    shared_applicant.apply(jobs[0]["id"])
    po.action(title, "Tạm dừng")
    expect(po.row(title)).to_contain_text("Tạm dừng")
    assert not results(public_api.jobs(q=title)), "Tin tạm dừng vẫn có trong tìm kiếm công khai"
    assert len(results(employer.applications(job=jobs[0]["id"]))) == 1
    po.action(title, "Tiếp tục tuyển")
    expect(po.row(title)).to_contain_text("Đang tuyển")
    assert results(public_api.jobs(q=title))


@pytest.mark.parametrize("tc_id", ["Recruiter_258", "Recruiter_271", "Recruiter_272"])
def test_recruiter_close_reopen(jobs_of, employer, shared_applicant, tc_id, record_testcase):
    """Recruiter_258/271/272 - Đóng tin: "Đã đóng", không ứng tuyển được, đơn giữ nguyên; "Mở lại": "Đang tuyển"."""
    record_testcase(tc_id)
    po, jobs = jobs_of({})
    title = jobs[0]["title"]
    po.action(title, "Đóng tin")
    po.dialog.confirm_button("Đóng tin").click()
    expect(po.row(title)).to_contain_text("Đã đóng")
    resp = shared_applicant.post("candidate/applications/", data={"job_id": jobs[0]["id"]})
    assert not resp.ok, "Tin đã đóng vẫn ứng tuyển được"
    po.action(title, "Mở lại")
    expect(po.row(title)).to_contain_text("Đang tuyển")


@pytest.mark.testcase("Recruiter_273")
def test_recruiter_273_reopen_expired(jobs_of):
    """Recruiter_273 - "Mở lại" tin đã qua hạn nộp: yêu cầu cập nhật hạn nộp mới (không tạo được tin quá hạn qua API)."""
    pytest.skip("DỮ LIỆU: API không cho tạo / sửa tin có hạn nộp trong quá khứ – cần job hết hạn chạy nền")


@pytest.mark.parametrize("tc_id", ["Recruiter_262", "Recruiter_274"])
def test_recruiter_delete_job(jobs_of, employer, public_api, tc_id, record_testcase):
    """Recruiter_262/274 - Xóa tin chưa có hồ sơ: tin bị xóa khỏi danh sách và trang công khai."""
    record_testcase(tc_id)
    po, jobs = jobs_of({})
    title = jobs[0]["title"]
    po.action(title, "Xóa tin")
    po.dialog.confirm_button("Xóa tin").click()
    expect(po.row(title)).to_have_count(0)
    assert employer.get(f"employer/jobs/{jobs[0]['id']}/").status == 404
    assert not results(public_api.jobs(q=title))


@pytest.mark.testcase("Recruiter_275")
def test_recruiter_275_delete_job_with_applications(jobs_of, employer, shared_applicant):
    """Recruiter_275 - Xóa tin đã có đơn: không cho xóa (gợi ý Đóng tin) hoặc xóa nhưng giữ đơn."""
    po, jobs = jobs_of({})
    app = shared_applicant.apply(jobs[0]["id"])
    resp = employer.delete(f"employer/jobs/{jobs[0]['id']}/")
    detail = shared_applicant.get(f"candidate/applications/{app['id']}/")
    assert not resp.ok or detail.ok, "Xóa tin đã có đơn làm mất đơn của ứng viên"


@pytest.mark.testcase("Recruiter_276")
def test_recruiter_276_publish_draft(jobs_of, employer):
    """Recruiter_276 - "Đăng tin" trên tin Bản nháp: chuyển "Đang tuyển", ghi nhận Ngày đăng."""
    po, jobs = jobs_of({"status": "draft"})
    po.action(jobs[0]["title"], "Đăng tin")
    expect(po.row(jobs[0]["title"])).to_contain_text("Đang tuyển")
    assert employer.job(jobs[0]["id"])["published_at"]


@pytest.mark.testcase("Recruiter_277")
def test_recruiter_277_edit_job(jobs_of, page: Page, settings, employer):
    """Recruiter_277 - "Sửa tin": form có dữ liệu cũ; sửa và lưu -> danh sách hiển thị dữ liệu mới."""
    po, jobs = jobs_of({})
    po.action(jobs[0]["title"], "Sửa tin")
    form = JobFormPage(page, settings)
    form.expect_loaded()
    expect(form.field("Tiêu đề công việc")).to_have_value(jobs[0]["title"])
    new_title = f"Đã sửa {unique_suffix()}"
    form.field("Tiêu đề công việc").fill(new_title)
    assert form.submit().ok
    assert employer.job(jobs[0]["id"])["title"] == new_title


@pytest.mark.testcase("Recruiter_278")
def test_recruiter_278_auto_expire():
    """Recruiter_278 - Chờ qua hạn nộp: tin tự chuyển "Hết hạn" (cần job nền, không giả lập được thời gian qua API)."""
    pytest.skip("MANUAL: cần chờ qua hạn nộp / chạy tác vụ nền chuyển trạng thái Hết hạn")


@pytest.mark.testcase("Recruiter_279")
def test_recruiter_279_applicant_count(jobs_of, shared_applicant):
    """Recruiter_279 - Ứng viên nộp đơn, tải lại: cột Hồ sơ tăng 1."""
    po, jobs = jobs_of({})
    cell = po.row(jobs[0]["title"]).locator("td[data-label='Hồ sơ']")
    expect(cell).to_contain_text("0")
    shared_applicant.apply(jobs[0]["id"])
    po.page.reload()
    po.expect_loaded()
    expect(cell).to_contain_text("1")


@pytest.mark.testcase("Recruiter_280")
def test_recruiter_280_search_and_status(jobs_of):
    """Recruiter_280 - Nhập tiêu đề + chọn trạng thái: kết quả thỏa đồng thời."""
    tag = unique_suffix()
    po, jobs = jobs_of({"title": f"Kết hợp {tag}"}, {"title": f"Kết hợp {tag} nháp", "status": "draft"})
    po.search(tag)
    po.tab("Bản nháp").click()
    po.wait_results()
    assert po.result_keys() == [jobs[1]["title"]]


@pytest.mark.parametrize("tc_id", ["Recruiter_281", "Recruiter_282"])
def test_recruiter_other_company_jobs(jobs_of, employer_factory, public_api, tc_id, record_testcase):
    """Recruiter_281/282 - Không thấy tin công ty khác; sửa / đóng / xóa tin công ty khác qua API: bị từ chối."""
    record_testcase(tc_id)
    other = employer_factory()
    foreign = other.create_job(public_api)
    po, _ = jobs_of({})
    assert foreign["title"] not in po.result_keys()
    me = po.env.client
    for resp in (me.patch(f"employer/jobs/{foreign['id']}/", data={"title": "Hack"}),
                 me.post(f"employer/jobs/{foreign['id']}/close/"), me.delete(f"employer/jobs/{foreign['id']}/")):
        assert resp.status in (403, 404), f"Thao tác tin công ty khác: {resp.status}"
    assert other.job(foreign["id"])["title"] == foreign["title"]


# ================================================================ Đăng tin
@pytest.fixture
def job_form(as_employer) -> JobFormPage:
    return as_employer(JobFormPage)


def _post(form: JobFormPage, **values):
    form.fill_required()
    for label, value in values.items():
        form.field(label).fill(value)
    return form.submit()


@pytest.mark.parametrize("tc_id, lo, hi, ok", [("Recruiter_421", "10", "20", True), ("Recruiter_422", "30", "20", False),
                                               ("Recruiter_423", "", "", True)])
def test_recruiter_salary_range(job_form, employer, tc_id, lo, hi, ok, record_testcase):
    """Recruiter_421..423 - Lương min < max: hợp lệ; min > max: "Mức lương tối thiểu không được lớn hơn tối đa.";
    bỏ trống cả 2: đăng thành công, lương "Thỏa thuận"."""
    record_testcase(tc_id)
    resp = _post(job_form, **{"Lương tối thiểu (triệu)": lo, "Lương tối đa (triệu)": hi})
    if ok:
        assert resp is not None and resp.ok, job_form.messages()
        if tc_id == "Recruiter_423":
            job = employer.job(resp.json()["id"])
            assert job["salary_min"] is None and job["salary_max"] is None
    else:
        assert resp is None
        expect(job_form.form_root.get_by_text("Mức lương tối thiểu không được lớn hơn tối đa.")).to_be_visible()


@pytest.mark.testcase("Recruiter_424")
def test_recruiter_424_deadline_picker(job_form):
    """Recruiter_424 - Hạn nộp là datepicker (icon lịch), định dạng ngày theo ngôn ngữ (vi-VN: dd/mm/yyyy)."""
    assert job_form.field("Hạn nộp hồ sơ").get_attribute("type") == "date"


@pytest.mark.parametrize("tc_id, typed, valid", [("Recruiter_427", "15082030", True), ("Recruiter_428", "31022030", False),
                                                 ("Recruiter_429", "ab@#", False)])
def test_recruiter_deadline_typing(job_form, tc_id, typed, valid, record_testcase):
    """Recruiter_427..429 - Nhập tay ngày hợp lệ: nhận; ngày không tồn tại / chữ cái: không nhận."""
    record_testcase(tc_id)
    field = job_form.field("Hạn nộp hồ sơ")
    field.click()
    field.press_sequentially(typed)
    if valid:
        expect(field).to_have_value("2030-08-15")
    else:
        assert field.input_value() in ("",), f"Nhận giá trị không hợp lệ: {field.input_value()}"


@pytest.mark.parametrize("tc_id, delta, ok", [("Recruiter_426", 10, True), ("Recruiter_431", -1, False),
                                              ("Recruiter_432", 0, True)])
def test_recruiter_deadline_value(job_form, tc_id, delta, ok, record_testcase):
    """Recruiter_426/431/432 - Chọn ngày: hợp lệ; ngày quá khứ: báo hạn nộp phải >= hôm nay; hôm nay: hợp lệ."""
    record_testcase(tc_id)
    day = (date.today() + timedelta(days=delta)).isoformat()
    resp = _post(job_form, **{"Hạn nộp hồ sơ": day})
    if ok:
        assert resp is not None and resp.ok, job_form.messages()
    else:
        assert resp is None or not resp.ok, "Hạn nộp ở quá khứ vẫn được lưu"
        assert "hôm nay" in job_form.messages() or "ngày" in job_form.messages().lower()


@pytest.mark.parametrize("tc_id", ["Recruiter_433", "Recruiter_435"])
def test_recruiter_skill_tags(job_form, tc_id, record_testcase):
    """Recruiter_433/435 - Nhập kỹ năng + Enter: thêm dạng tag; nhấn X: xóa."""
    record_testcase(tc_id)
    job_form.add_skill("Excel")
    tags = job_form.form_root.get_by_role("list", name="Kỹ năng đã thêm").locator("li")
    expect(tags.filter(has_text="Excel")).to_have_count(1)
    if tc_id == "Recruiter_435":
        tags.filter(has_text="Excel").get_by_role("button").click()
        expect(tags.filter(has_text="Excel")).to_have_count(0)


@pytest.mark.testcase("Recruiter_434")
def test_recruiter_434_skill_suggestions(job_form):
    """Recruiter_434 - Nhập vài ký tự: gợi ý kỹ năng từ danh mục."""
    job_form.skills.fill("Pyt")
    expect(job_form.form_root.get_by_role("option").first.or_(job_form.page.locator("datalist option").first)
           ).to_be_attached()


@pytest.mark.testcase("Recruiter_436")
def test_recruiter_436_skill_duplicate(job_form):
    """Recruiter_436 - Kỹ năng đã có (khác hoa thường): không thêm trùng."""
    job_form.add_skill("Excel")
    job_form.add_skill("EXCEL")
    tags = job_form.form_root.get_by_role("list", name="Kỹ năng đã thêm").locator("li")
    expect(tags.filter(has_text=re.compile("excel", re.I))).to_have_count(1)


@pytest.mark.parametrize("tc_id", ["Recruiter_438", "Recruiter_495", "Recruiter_500", "Recruiter_501", "Recruiter_502"])
def test_recruiter_job_ai(job_form, tc_id, record_testcase):
    """Recruiter_438/495/500..502 - Trọng số kỹ năng, AI tách yêu cầu / hỗ trợ viết JD / tạo lại embedding."""
    record_testcase(tc_id)
    require(job_form.page.get_by_role("button", name=re.compile("AI hỗ trợ viết JD|Trọng số")),
            "tính năng AI cho tin tuyển dụng (AI hỗ trợ viết JD / trọng số kỹ năng)")


@pytest.mark.testcase("Recruiter_473")
def test_recruiter_473_requirements_hint(job_form):
    """Recruiter_473 - Gợi ý dưới Yêu cầu ứng viên: "Mỗi dòng một ý."."""
    expect(job_form.form_root.locator("#requirements-hint")).to_contain_text("Mỗi dòng một ý.")


@pytest.mark.parametrize("tc_id, status", [("Recruiter_492", "published"), ("Recruiter_496", "published"),
                                           ("Recruiter_498", "published"), ("Recruiter_494", "draft")])
def test_recruiter_post_job(job_form, employer, public_api, page: Page, tc_id, status, record_testcase):
    """Recruiter_492/494/496/498 - Đăng tin (chỉ trường bắt buộc): Đang tuyển, về danh sách, ứng viên tìm thấy;
    Lưu nháp: Bản nháp, chưa hiển thị cho ứng viên."""
    record_testcase(tc_id)
    title = f"Auto đăng tin {unique_suffix()}"
    job_form.fill_required()
    job_form.field("Tiêu đề công việc").fill(title)
    if status == "draft":
        with page.expect_response(lambda r: "/employer/jobs/" in r.url and r.request.method == "POST") as info:
            job_form.draft_button.click()
        resp = info.value
    else:
        resp = job_form.submit()
    assert resp.ok, resp.text()
    job = employer.job(resp.json()["id"])
    assert job["status"] == status
    if status == "published":
        expect(page).to_have_url(re.compile(r"/recruiter/jobs/?(\?.*)?$"))
    found = [j["title"] for j in results(public_api.jobs(q=title))]
    assert (title in found) is (status == "published")


@pytest.mark.testcase("Recruiter_497")
def test_recruiter_497_required_focus(job_form):
    """Recruiter_497 - Bỏ trống trường bắt buộc, nhấn Đăng tin: focus vào trường lỗi."""
    assert job_form.submit() is None
    expect(job_form.field("Tiêu đề công việc")).to_be_focused()


@pytest.mark.testcase("Recruiter_499")
def test_recruiter_499_discrimination(job_form):
    """Recruiter_499 - Yêu cầu "Chỉ tuyển nam, dưới 25 tuổi, quê Hà Nội": cảnh báo phân biệt đối xử, yêu cầu sửa."""
    resp = _post(job_form, **{"Yêu cầu ứng viên": "Chỉ tuyển nam, dưới 25 tuổi, quê Hà Nội"})
    assert resp is None or not resp.ok, "JD có tiêu chí phân biệt đối xử vẫn đăng được"


@pytest.mark.testcase("Recruiter_503")
def test_recruiter_503_expire():
    """Recruiter_503 - Qua hạn nộp: tự chuyển Hết hạn, ngừng nhận đơn (cần tác vụ nền / chờ thời gian)."""
    pytest.skip("MANUAL: cần chờ qua hạn nộp / chạy tác vụ nền chuyển trạng thái Hết hạn")


@pytest.mark.testcase("Recruiter_504")
def test_recruiter_504_company_incomplete(job_form):
    """Recruiter_504 - Công ty chưa hoàn thiện hồ sơ, nhấn Đăng tin: yêu cầu hoàn thiện hồ sơ công ty trước."""
    resp = _post(job_form)
    assert resp is None or not resp.ok, "Công ty mới (chưa có MST, ngành, địa chỉ...) vẫn đăng tin được"


@pytest.mark.testcase("Recruiter_505")
def test_recruiter_505_offline(job_form, employer):
    """Recruiter_505 - Mất mạng khi đăng tin: báo lỗi, không tạo tin, giữ dữ liệu trên form."""
    job_form.fill_required()
    job_form.page.route("**/employer/jobs/", lambda r: r.abort() if r.request.method == "POST" else r.continue_())
    job_form.submit_button.click()
    expect(job_form.form_root.get_by_role("alert").first).to_be_visible()
    expect(job_form.field("Tiêu đề công việc")).to_have_value("Auto Nhân viên kiểm thử")
    assert results(employer.my_jobs()) == []


# ================================================================ Ứng viên (danh sách hồ sơ)
@pytest.fixture
def applicants(as_employer, employer, public_api, shared_applicant):
    def _open(n_jobs: int = 1, query: str = "") -> tuple[ApplicantsPage, list]:
        pairs = [_apply(employer, public_api, shared_applicant) for _ in range(n_jobs)]
        po = as_employer(ApplicantsPage)
        if query:
            po.page.goto(f"{po.settings.base_url}/recruiter/applicants?{query}")
            po.expect_loaded()
        return po, pairs
    return _open


@pytest.mark.parametrize("tc_id", ["Recruiter_556", "Recruiter_559", "Recruiter_560", "Recruiter_562", "Recruiter_571",
                                   "Recruiter_572", "Recruiter_580", "Recruiter_581", "Recruiter_582", "Recruiter_585"])
def test_recruiter_ai_screening(applicants, tc_id, record_testcase):
    """Recruiter_556..562, 571, 572, 580..582, 585 - AI sàng lọc: Điểm AI, phân nhóm, sắp xếp theo match_score,
    kỹ năng yêu cầu của tin, so sánh ứng viên, mời phỏng vấn hàng loạt."""
    record_testcase(tc_id)
    po, _ = applicants()
    require(po.page.get_by_role("button", name=re.compile("Sàng lọc (lại )?bằng AI")),
            'nút "Sàng lọc bằng AI" (AI sàng lọc đang tắt: FEATURES.ai = false, backend chưa có API)')


@pytest.mark.testcase("Recruiter_557")
def test_recruiter_557_no_jobs(as_employer):
    """Recruiter_557 - Công ty chưa có tin: "Chưa có tin tuyển dụng" - "Đăng tin để bắt đầu nhận hồ sơ ứng viên."."""
    po = as_employer(ApplicantsPage)
    expect(po.empty_state.get_by_role("heading")).to_have_text("Chưa có tin tuyển dụng")
    expect(po.empty_state).to_contain_text("Đăng tin để bắt đầu nhận hồ sơ ứng viên.")


@pytest.mark.testcase("Recruiter_558")
def test_recruiter_558_job_without_applications(as_employer, employer, public_api):
    """Recruiter_558 - Chọn tin chưa có đơn: "Chưa có hồ sơ ứng tuyển"."""
    job = employer.create_job(public_api)
    po = as_employer(ApplicantsPage)
    po.job_select.select_option(value=job["id"])
    po.wait_results()
    expect(po.empty_state.get_by_role("heading")).to_have_text("Chưa có hồ sơ ứng tuyển")


@pytest.mark.testcase("Recruiter_561")
def test_recruiter_561_combined_filter(applicants):
    """Recruiter_561 - Tin + trạng thái + từ khóa: thỏa đồng thời; không có: "Không có hồ sơ khớp bộ lọc" - "Thử bỏ bớt bộ lọc."."""
    po, pairs = applicants(2)
    job, _ = pairs[0]
    po.page.goto(f"{po.settings.base_url}/recruiter/applicants?jobId={job['id']}&status=applied")
    po.expect_loaded()
    expect(po.rows).to_have_count(1)
    po.search("zzqx khong ton tai 9071")
    expect(po.empty_state.get_by_role("heading")).to_have_text("Không có hồ sơ khớp bộ lọc")
    expect(po.empty_state).to_contain_text("Thử bỏ bớt bộ lọc.")


@pytest.mark.testcase("Recruiter_563")
def test_recruiter_563_quick_status(applicants, shared_applicant, employer):
    """Recruiter_563 - Combobox trạng thái trên dòng: chỉ trạng thái được phép chuyển; chọn xong trạng thái cập nhật."""
    po, pairs = applicants()
    job, app = pairs[0]
    select = po.row(job["title"]).get_by_role("combobox")
    options = [o.strip() for o in select.locator("option").all_inner_texts()]
    assert "Đã tuyển" not in options, f"Cho chuyển thẳng Mới ứng tuyển -> Đã tuyển: {options}"
    with po.page.expect_response(lambda r: "/status/" in r.url):
        select.select_option(label="Đang sàng lọc")
    assert employer.application(app["id"])["status"] == "screening"


@pytest.mark.testcase("Recruiter_567")
def test_recruiter_567_reject(applicants, shared_applicant, employer):
    """Recruiter_567 - Nhấn "Từ chối hồ sơ": hồ sơ chuyển "Từ chối", lưu lý do nội bộ."""
    po, pairs = applicants()
    job, app = pairs[0]
    po.row(job["title"]).get_by_role("combobox").select_option(label="Từ chối")
    dialog = ConfirmDialog(po.page)
    dialog.root.get_by_label("Lý do từ chối (không bắt buộc)").fill("Chưa đủ kinh nghiệm")
    dialog.confirm_button("Từ chối hồ sơ").click()
    expect(dialog.root).to_have_count(0)
    detail = employer.application(app["id"])
    assert detail["status"] == "rejected"
    assert detail.get("rejection_reason") == "Chưa đủ kinh nghiệm"


@pytest.mark.parametrize("tc_id", ["Recruiter_573"])
def test_recruiter_other_company_application(as_employer, employer_factory, public_api, shared_applicant, page: Page,
                                            settings, tc_id, record_testcase):
    """Recruiter_573 - Đổi id trên URL thành đơn công ty khác: từ chối truy cập."""
    record_testcase(tc_id)
    other = employer_factory()
    _, app = _apply(other, public_api, shared_applicant)
    as_employer(ApplicantsPage)
    page.goto(f"{settings.base_url}/recruiter/applicants/{app['id']}")
    expect(page.locator("#applicant-name")).to_have_count(0)
    expect(page.get_by_role("alert").or_(page.get_by_text(re.compile("Không tải được|không tồn tại"))).first).to_be_visible()


@pytest.mark.testcase("Recruiter_583")
def test_recruiter_583_bulk_status(applicants):
    """Recruiter_583 - Chọn nhiều hồ sơ, chuyển trạng thái hàng loạt."""
    po, _ = applicants(2)
    require(po.rows.first.get_by_role("checkbox"), "chọn nhiều hồ sơ (checkbox) để chuyển trạng thái hàng loạt")


@pytest.mark.testcase("Recruiter_584")
def test_recruiter_584_invalid_transition(employer, public_api, shared_applicant):
    """Recruiter_584 - API chuyển Mới ứng tuyển -> Đã tuyển (bỏ bước): bị từ chối."""
    _, app = _apply(employer, public_api, shared_applicant)
    resp = employer.post(f"employer/applications/{app['id']}/status/", data={"status": "hired"})
    assert not resp.ok, "Cho chuyển thẳng sang Đã tuyển"
    assert employer.application(app["id"])["status"] == "applied"


# ================================================================ Chi tiết hồ sơ ứng viên
@pytest.fixture
def detail(as_employer, employer, public_api, shared_applicant):
    def _open(cover_letter: str = "Thư giới thiệu auto", statuses: tuple = ()) -> tuple[ApplicantDetailPage, dict, dict]:
        job = employer.create_job(public_api)
        app = shared_applicant.apply(job["id"], cover_letter=cover_letter)
        for s in statuses:
            employer.change_status(app["id"], s, rejection_reason="Lý do nội bộ" if s == "rejected" else "")
        po = as_employer(ApplicantDetailPage, application_id=app["id"],
                         data={"application_id": app["id"]})
        return po, job, app
    return _open


@pytest.mark.testcase("Recruiter_595")
def test_recruiter_595_cv_view(detail, shared_applicant):
    """Recruiter_595 - Hiển thị CV gốc đúng phiên bản đã nộp."""
    po, *_ = detail()
    expect(po.cv).to_be_visible()
    expect(po.cv.locator("iframe, object, embed, canvas").first).to_be_visible()


@pytest.mark.testcase("Recruiter_596")
def test_recruiter_596_docx_cv():
    """Recruiter_596 - Hồ sơ nộp CV DOCX: hướng dẫn "Tải xuống" để mở bằng Word (cần CV DOCX của ứng viên dùng chung)."""
    pytest.skip("DỮ LIỆU: ứng viên dùng chung chỉ có CV PDF (giới hạn 30 lượt tải CV/giờ); DOCX kiểm tra ở CV builder")


@pytest.mark.testcase("Recruiter_597")
def test_recruiter_597_download(detail):
    """Recruiter_597 - Nhấn "Tải xuống": tải đúng file CV đã nộp."""
    po, *_ = detail()
    with po.page.expect_download() as dl:
        po.cv.get_by_role("button", name="Tải xuống").or_(po.cv.get_by_role("link", name="Tải xuống")).first.click()
    assert dl.value.suggested_filename.lower().endswith(".pdf")


@pytest.mark.parametrize("tc_id", ["Recruiter_598", "Recruiter_599"])
def test_recruiter_ai_report(detail, tc_id, record_testcase):
    """Recruiter_598/599 - Báo cáo AI: kỹ năng đáp ứng / còn thiếu, điểm mạnh, lưu ý (kèm trích dẫn CV), câu hỏi gợi ý."""
    record_testcase(tc_id)
    po, *_ = detail()
    require(po.page.get_by_role("region", name="Đánh giá của AI"), "khối Báo cáo AI trên chi tiết hồ sơ")


@pytest.mark.testcase("Recruiter_600")
def test_recruiter_600_not_scored(detail):
    """Recruiter_600 - Hồ sơ chưa chấm: "Hồ sơ chưa được AI đánh giá mức độ phù hợp với vị trí."."""
    po, *_ = detail()
    expect(po.page.get_by_text("Hồ sơ chưa được AI đánh giá mức độ phù hợp với vị trí.")).to_be_visible()


@pytest.mark.testcase("Recruiter_601")
def test_recruiter_601_rate(detail, employer):
    """Recruiter_601 - Nhấn 4 sao: lưu, hiển thị "4/5 sao. Bấm lại sao đang chọn để bỏ đánh giá."."""
    po, _, app = detail()
    po.rating.get_by_role("radio", name="4 sao").click()
    expect(po.page.get_by_text("4/5 sao. Bấm lại sao đang chọn để bỏ đánh giá.")).to_be_visible()
    assert employer.application(app["id"])["recruiter_rating"] == 4


@pytest.mark.testcase("Recruiter_602")
def test_recruiter_602_unrate(detail, employer):
    """Recruiter_602 - Nhấn lại sao đang chọn: bỏ đánh giá, "Chưa đánh giá. Bấm vào số sao để chấm hồ sơ."."""
    po, _, app = detail()
    star = po.rating.get_by_role("radio", name="4 sao")
    star.click()
    expect(po.page.get_by_text("4/5 sao.", exact=False)).to_be_visible()
    star.click()
    expect(po.page.get_by_text("Chưa đánh giá. Bấm vào số sao để chấm hồ sơ.")).to_be_visible()
    assert employer.application(app["id"])["recruiter_rating"] in (None, 0)


@pytest.mark.testcase("Recruiter_620")
def test_recruiter_620_note_visibility(detail, employer, shared_applicant):
    """Recruiter_620 - Ghi chú nội bộ: NTD cùng công ty xem được; ứng viên không xem được."""
    po, _, app = detail()
    po.open_transition("Chuyển sàng lọc")
    po.form_root.get_by_label("Ghi chú nội bộ").fill("Ghi chú bí mật 620")
    assert po.submit().ok
    assert "Ghi chú bí mật 620" in str(employer.application(app["id"]))
    assert "Ghi chú bí mật 620" not in shared_applicant.get(f"candidate/applications/{app['id']}/").text()


@pytest.mark.testcase("Recruiter_621")
def test_recruiter_621_viewed_on_open(detail, employer):
    """Recruiter_621 - Mở hồ sơ mới lần đầu: ghi nhận thời điểm xem, chuyển Đã xem / Đang sàng lọc."""
    _, _, app = detail()
    assert employer.application(app["id"])["status"] != "applied", "Mở hồ sơ không chuyển trạng thái Đã xem/Đang sàng lọc"


@pytest.mark.testcase("Recruiter_622")
def test_recruiter_622_change_status(detail, employer, shared_applicant):
    """Recruiter_622 - Chọn trạng thái mới, Xác nhận: cập nhật, ghi lịch sử (người đổi, thời điểm, cũ -> mới)."""
    po, _, app = detail()
    po.open_transition("Chuyển sàng lọc")
    assert po.submit().ok
    expect(po.header).to_contain_text("Đang sàng lọc")
    history = employer.application(app["id"])["status_history"]
    assert history[-1]["from_status"] == "applied" and history[-1]["to_status"] == "screening"
    assert history[-1]["changed_by"], "Lịch sử không ghi người đổi"


@pytest.mark.testcase("Recruiter_623")
def test_recruiter_623_interview_schedule(detail):
    """Recruiter_623 - Chuyển sang Phỏng vấn: mở form lên lịch (thời gian, hình thức, link/địa điểm, người phỏng vấn)."""
    po, *_ = detail(statuses=("screening",))
    po.open_transition("Mời phỏng vấn")
    require(po.form_root.get_by_label(re.compile("Thời gian|Ngày phỏng vấn")), "form lên lịch phỏng vấn")


@pytest.mark.testcase("Recruiter_624")
def test_recruiter_624_reject_with_reason(detail, employer):
    """Recruiter_624 - Từ chối + nhập lý do + Xác nhận: lý do lưu nội bộ, hiển thị "Lý do từ chối: ..."."""
    po, _, app = detail()
    po.open_transition("Từ chối")
    po.form_root.get_by_label("Lý do từ chối").fill("Không phù hợp văn hóa")
    assert po.submit().ok
    expect(po.page.get_by_text("Lý do từ chối:")).to_be_visible()
    expect(po.page.get_by_text("Không phù hợp văn hóa")).to_be_visible()


@pytest.mark.testcase("Recruiter_625")
def test_recruiter_625_interview_result(detail):
    """Recruiter_625 - Ghi kết quả phỏng vấn đạt / không đạt và nhận xét."""
    po, *_ = detail(statuses=("screening", "interview"))
    require(po.page.get_by_text(re.compile("Kết quả phỏng vấn")), "ghi kết quả phỏng vấn")


@pytest.mark.parametrize("tc_id, statuses, label", [
    ("Recruiter_626", ("screening", "interview", "offer", "hired"), "Hồ sơ đã kết thúc quy trình"),
    ("Recruiter_626", ("rejected",), "Hồ sơ đã kết thúc quy trình"),
])
def test_recruiter_626_finished(detail, tc_id, statuses, label, record_testcase):
    """Recruiter_626 - Đơn Đã tuyển / Từ chối: "Hồ sơ đã kết thúc quy trình", không cho chuyển tiếp."""
    record_testcase(tc_id)
    po, *_ = detail(statuses=statuses)
    expect(po.header).to_contain_text(label)
    expect(po.header.get_by_role("button", name=re.compile("Chuyển sàng lọc|Mời phỏng vấn|Gửi đề nghị|Xác nhận tuyển"))).to_have_count(0)


@pytest.mark.testcase("Recruiter_627")
def test_recruiter_627_withdrawn(as_employer, employer, public_api, shared_applicant):
    """Recruiter_627 - Đơn ứng viên đã rút: nhãn "Ứng viên đã rút", không cho chuyển trạng thái."""
    job, app = _apply(employer, public_api, shared_applicant)
    CandidateActions(shared_applicant).withdraw(app["id"], "Đổi ý")
    po = as_employer(ApplicantDetailPage, application_id=app["id"], data={"application_id": app["id"]})
    expect(po.header).to_contain_text("Ứng viên đã rút")
    expect(po.header.get_by_role("button", name=re.compile("Chuyển sàng lọc|Từ chối"))).to_have_count(0)


@pytest.mark.testcase("Recruiter_628")
def test_recruiter_628_history(detail, page: Page):
    """Recruiter_628 - Chuyển nhiều lần: lịch sử đủ "Ứng viên nộp hồ sơ", "<người> chuyển từ <cũ> sang <mới>" kèm thời gian."""
    po, *_ = detail(statuses=("screening", "interview"))
    expect(po.history).to_contain_text("Ứng viên nộp hồ sơ")
    expect(po.history).to_contain_text(re.compile(r'chuyển từ "Mới ứng tuyển"'))
    expect(po.history).to_contain_text(re.compile(r'chuyển từ "Đang sàng lọc"'))


@pytest.mark.testcase("Recruiter_629")
def test_recruiter_629_offline_status(detail, employer):
    """Recruiter_629 - Mất mạng khi chuyển trạng thái: báo lỗi, trạng thái giữ nguyên."""
    po, _, app = detail()
    po.page.route("**/status/", lambda r: r.abort())
    po.open_transition("Chuyển sàng lọc")
    po.submit_button.click()
    expect(po.page.get_by_role("alert").first).to_be_visible()
    assert employer.application(app["id"])["status"] == "applied"


@pytest.mark.testcase("Recruiter_630")
def test_recruiter_630_notification_failure():
    """Recruiter_630 - Notification Service lỗi khi chuyển trạng thái: vẫn lưu, gửi lại nền (cần giả lập dịch vụ phía backend)."""
    pytest.skip("MANUAL: cần giả lập Notification Service lỗi ở backend (không điều khiển được từ trình duyệt)")


@pytest.mark.testcase("Recruiter_631")
def test_recruiter_631_no_cover_letter(detail):
    """Recruiter_631 - Đơn không có thư giới thiệu: "Ứng viên không gửi thư giới thiệu."."""
    po, *_ = detail(cover_letter="")
    expect(po.page.get_by_text("Ứng viên không gửi thư giới thiệu.")).to_be_visible()


# ================================================================ Tìm ứng viên & Thư mời
@pytest.mark.parametrize("tc_id", [f"Recruiter_{n}" for n in (*range(672, 681), *range(684, 695))])
def test_recruiter_talents_invitations(tc_id, record_testcase):
    """Recruiter_672..680, 684..694 - Tìm ứng viên, Ứng viên phù hợp với tin, Thư mời đã gửi, Thu hồi thư mời
    (giao diện chung / textbox / combobox của màn hình này: tests/generic, cũng skip cùng lý do)."""
    record_testcase(tc_id)
    pytest.skip(f"MÔI TRƯỜNG: {TALENTS_MISSING}")


# ================================================================ Tài khoản NTD
@pytest.fixture
def account(as_employer) -> RecruiterAccountForm:
    return as_employer(RecruiterAccountForm)


@pytest.mark.testcase("Recruiter_754")
def test_recruiter_754_role(account):
    """Recruiter_754 - Hiển thị đúng vai trò: Chủ sở hữu / Quản trị / Thành viên."""
    expect(account.page.locator("main").get_by_text(re.compile("Chủ sở hữu|Quản trị|Thành viên")).first).to_be_visible()


@pytest.mark.parametrize("tc_id", ["Recruiter_756", "Recruiter_760"])
def test_recruiter_save_account(account, employer, page: Page, tc_id, record_testcase):
    """Recruiter_756/760 - Lưu thông tin hợp lệ: "Đã lưu thông tin cá nhân.", F5 giữ dữ liệu, tên mới trên header."""
    record_testcase(tc_id)
    name = f"NTD Mới {unique_suffix()[-4:]}"
    account.field("Họ và tên").fill(name)
    account.field("Số điện thoại").fill("0912345678")
    account.field("Chức danh").fill("Trưởng phòng")
    assert account.submit().ok
    expect(account.status).to_have_text("Đã lưu thông tin cá nhân.")
    page.reload()
    account.expect_loaded()
    expect(account.field("Họ và tên")).to_have_value(name)
    expect(account.field("Chức danh")).to_have_value("Trưởng phòng")
    expect(page.get_by_role("banner").or_(page.locator("aside")).first).to_contain_text(name)


@pytest.mark.parametrize("tc_id, new, confirm, message", [
    ("Recruiter_758", "Aa@1234", "Aa@1234", "Mật khẩu mới phải có ít nhất 8 ký tự."),
    ("Recruiter_759", "NewAuto@12345", "Khac@12345", "Mật khẩu xác nhận không khớp."),
])
def test_recruiter_password_validation(account, employer, tc_id, new, confirm, message, record_testcase):
    """Recruiter_758/759 - Mật khẩu mới < 8 ký tự / xác nhận không khớp: thông báo tương ứng."""
    record_testcase(tc_id)
    pw = account.password
    assert pw.change(employer.password, new, confirm) is None
    expect(pw.form_root.get_by_role("alert")).to_have_text(message)


@pytest.mark.parametrize("tc_id", ["Recruiter_757", "Recruiter_763"])
def test_recruiter_change_password(account, employer, api_request, tc_id, record_testcase):
    """Recruiter_757/763 - Đổi mật khẩu hợp lệ: thông báo; đăng nhập được bằng mật khẩu mới, không được bằng mật khẩu cũ."""
    record_testcase(tc_id)
    pw = account.password
    resp = pw.change(employer.password, "NewAuto@12345")
    assert resp is not None and resp.ok
    expect(pw.form_root.get_by_role("status")).to_have_text("Đã đổi mật khẩu. Các phiên đăng nhập khác đã bị đăng xuất.")
    assert api_request.post("auth/login/", data={"email": employer.email, "password": "NewAuto@12345"}).ok
    assert not api_request.post("auth/login/", data={"email": employer.email, "password": employer.password}).ok


@pytest.mark.testcase("Recruiter_764")
def test_recruiter_764_other_sessions_logged_out(account, employer, browser, settings):
    """Recruiter_764 - Đăng nhập 2 trình duyệt, đổi mật khẩu ở trình duyệt 1: trình duyệt 2 bị đăng xuất."""
    from fixtures.cv import _seed_tokens_script
    other = browser.new_context(base_url=settings.base_url)
    page2 = other.new_page()
    page2.add_init_script(_seed_tokens_script(employer.access, employer.refresh))
    page2.goto(f"{settings.base_url}/recruiter/account")
    expect(page2.get_by_role("heading", name="Tài khoản")).to_be_visible()
    assert account.password.change(employer.password, "NewAuto@12345").ok
    page2.reload()
    expect(page2).to_have_url(re.compile(r"/login"))
    other.close()


@pytest.mark.testcase("Recruiter_765")
def test_recruiter_765_wrong_current(account):
    """Recruiter_765 - Sai mật khẩu hiện tại: thông báo, không đổi."""
    resp = account.password.change("Sai@123456", "NewAuto@12345")
    assert resp is not None and not resp.ok
    expect(account.password.form_root.get_by_role("alert")).to_be_visible()


@pytest.mark.testcase("Recruiter_761")
def test_recruiter_761_empty_name(account):
    """Recruiter_761 - Xóa trắng Họ và tên, Lưu: focus vào Họ và tên, không lưu."""
    account.field("Họ và tên").fill("")
    assert account.submit() is None
    expect(account.field("Họ và tên")).to_be_focused()


@pytest.mark.testcase("Recruiter_762")
def test_recruiter_762_bad_phone(account, employer):
    """Recruiter_762 - SĐT "abc123": báo lỗi tại trường SĐT, không lưu."""
    account.field("Số điện thoại").fill("abc123")
    resp = account.submit()
    assert resp is None or not resp.ok
    assert employer.profile()["phone"] in ("", None)


@pytest.mark.testcase("Recruiter_766")
def test_recruiter_766_offline(account, employer):
    """Recruiter_766 - Mất mạng khi lưu: báo lỗi, dữ liệu không đổi, form giữ dữ liệu đang nhập."""
    before = employer.profile()["full_name"]
    account.field("Họ và tên").fill("Đang nhập dở")
    account.page.route("**/employer/profile/", lambda r: r.abort() if r.request.method == "PATCH" else r.continue_())
    account.submit_button.click()
    expect(account.status).to_have_class(re.compile("text-danger"))
    expect(account.field("Họ và tên")).to_have_value("Đang nhập dở")
    assert employer.profile()["full_name"] == before
