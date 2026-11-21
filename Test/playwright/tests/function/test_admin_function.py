"""Admin – TC nghiệp vụ riêng (KBKTCN sheet "Admin", Admin_14..178).

Textbox / combobox / popup Hủy-X-Esc / giao diện chung / phân quyền / trạng thái tải: tests/generic.
Đăng nhập Admin bằng ADMIN_EMAIL / ADMIN_PASSWORD (.env). Mọi thao tác khóa / xác minh / đóng tin chỉ làm trên
tài khoản, công ty, tin do test tạo mới qua API – không đụng dữ liệu demo.
"""
import re

import pytest
from playwright.sync_api import Page, expect

from pages.admin_pages import AdminCompaniesPage, AdminDashboard, AdminJobsPage, AdminUsersPage
from pages.login_page import LoginPage
from pages.recruiter_pages import CompanyProfileForm
from utils.ats_api import results
from utils.helpers import unique_suffix

pytestmark = [pytest.mark.function, pytest.mark.admin]


@pytest.fixture
def as_admin(login_as, admin_client, page: Page, settings):
    def _open(cls):
        login_as(admin_client)
        return cls(page, settings).open()
    return _open


# ================================================================ Tổng quan
@pytest.mark.testcase("Admin_14")
def test_admin_14_stats(as_admin, admin_client):
    """Admin_14 - Thẻ số liệu đúng CSDL: Người dùng (X ứng viên · Y NTD), Doanh nghiệp (X chờ xác minh),
    Tin (X đang tuyển), Lượt ứng tuyển."""
    dash = as_admin(AdminDashboard)
    api = admin_client.overview()
    text = str(api)
    assert str(dash.stat("Người dùng")) in text
    assert str(dash.stat("Doanh nghiệp")) in text
    assert re.search(r"\d+ ứng viên · \d+ nhà tuyển dụng", dash.hint("Người dùng"))
    assert re.search(r"\d+ chờ xác minh", dash.hint("Doanh nghiệp"))
    assert re.search(r"\d+ đang tuyển", dash.hint("Tin tuyển dụng"))


@pytest.mark.testcase("Admin_15")
def test_admin_15_pending_block(as_admin, employer_factory):
    """Admin_15 - Có doanh nghiệp chờ xác minh: hiển thị khối + nút xử lý."""
    emp = employer_factory()
    emp.update_company(tax_code=f"05{unique_suffix()[-8:]}")
    dash = as_admin(AdminDashboard)
    expect(dash.review).to_contain_text("doanh nghiệp đang chờ xác minh")
    expect(dash.review.get_by_role("link")).to_be_visible()


@pytest.mark.parametrize("tc_id, region", [("Admin_16", "recent_users"), ("Admin_17", "recent_companies")])
def test_admin_recent_tables(as_admin, employer_factory, tc_id, region, record_testcase):
    """Admin_16/17 - Bảng Người dùng mới / Doanh nghiệp mới: bản ghi mới nhất; trạng thái; chưa có MST "Chưa có mã số thuế"."""
    record_testcase(tc_id)
    emp = employer_factory(company_name=f"Công ty Mới Nhất {unique_suffix()}")
    dash = as_admin(AdminDashboard)
    table = getattr(dash, region)
    first = table.locator("tbody tr").first
    if region == "recent_users":
        expect(first).to_contain_text(emp.email)
        expect(first).to_contain_text("Đang hoạt động")
    else:
        expect(first).to_contain_text(emp.company()["name"])
        expect(first).to_contain_text("Chưa có mã số thuế")


@pytest.mark.parametrize("tc_id", ["Admin_18", "Admin_19", "Admin_20", "Admin_21", "Admin_178"])
def test_admin_stats_update(as_admin, page: Page, candidate_factory, employer_factory, shared_employer, public_api,
                            shared_applicant, tc_id, record_testcase):
    """Admin_18..21, 178 - Đăng ký ứng viên + NTD / công ty có MST / đăng 1 tin & đóng 1 tin / nộp đơn / đóng tin:
    tải lại Tổng quan, số liệu thay đổi tương ứng."""
    record_testcase(tc_id)
    closing = shared_employer.create_job(public_api) if tc_id in ("Admin_20", "Admin_178") else None
    dash = as_admin(AdminDashboard)
    before = {k: dash.stat(k) for k in ("Người dùng", "Doanh nghiệp", "Tin tuyển dụng", "Lượt ứng tuyển")}
    published = int(re.search(r"(\d+) đang tuyển", dash.hint("Tin tuyển dụng")).group(1))
    if tc_id == "Admin_18":
        candidate_factory()
        employer_factory()
    elif tc_id == "Admin_19":
        employer_factory().update_company(tax_code=f"04{unique_suffix()[-8:]}")
    elif tc_id == "Admin_20":
        shared_employer.create_job(public_api)
        shared_employer.job_action(closing["id"], "close")
    elif tc_id == "Admin_21":
        shared_applicant.apply(shared_employer.create_job(public_api)["id"])
        before["Tin tuyển dụng"] += 1
    else:
        shared_employer.job_action(closing["id"], "close")
    page.reload()
    dash.expect_loaded()
    now_published = int(re.search(r"(\d+) đang tuyển", dash.hint("Tin tuyển dụng")).group(1))
    if tc_id == "Admin_18":
        assert dash.stat("Người dùng") == before["Người dùng"] + 2
    elif tc_id == "Admin_19":
        assert dash.stat("Doanh nghiệp") == before["Doanh nghiệp"] + 1
    elif tc_id == "Admin_20":
        assert dash.stat("Tin tuyển dụng") == before["Tin tuyển dụng"] + 1
        assert now_published == published
    elif tc_id == "Admin_21":
        assert dash.stat("Lượt ứng tuyển") == before["Lượt ứng tuyển"] + 1
    else:
        assert now_published == published - 1


@pytest.mark.testcase("Admin_22")
def test_admin_22_locked_user_on_dashboard(as_admin, admin_client, candidate_factory, page: Page):
    """Admin_22 - Khóa 1 người dùng mới, tải lại Tổng quan: trạng thái người dùng đó "Đã khóa"."""
    user = candidate_factory()
    uid = results(admin_client.users(q=user.email))[0]["id"]
    admin_client.update_user(uid, is_active=False)
    dash = as_admin(AdminDashboard)
    expect(dash.recent_users.locator("tbody tr").filter(has_text=user.email)).to_contain_text("Đã khóa")


@pytest.mark.parametrize("tc_id", ["Admin_23", "Admin_130"])
def test_admin_pending_decrease(as_admin, employer_factory, page: Page, settings, tc_id, record_testcase):
    """Admin_23/130 - Xác minh / từ chối doanh nghiệp chờ: số "chờ xác minh" giảm 1."""
    record_testcase(tc_id)
    emp = employer_factory()
    emp.update_company(tax_code=f"03{unique_suffix()[-8:]}")
    name = emp.company()["name"]
    dash = as_admin(AdminDashboard)
    before = int(re.search(r"(\d+) chờ xác minh", dash.hint("Doanh nghiệp")).group(1))
    companies = AdminCompaniesPage(page, settings).open()
    companies.search(name)
    companies.act(name, "Xác minh")
    expect(companies.row(name)).to_contain_text("Đã xác minh")
    dash = AdminDashboard(page, settings).open()
    assert int(re.search(r"(\d+) chờ xác minh", dash.hint("Doanh nghiệp")).group(1)) == before - 1


# ================================================================ Người dùng
@pytest.fixture
def user_target(candidate_factory, admin_client):
    user = candidate_factory()
    user.admin_id = results(admin_client.users(q=user.email))[0]["id"]
    return user


@pytest.fixture
def users_page(as_admin) -> AdminUsersPage:
    return as_admin(AdminUsersPage)


@pytest.mark.testcase("Admin_65")
def test_admin_65_table(users_page, user_target):
    """Admin_65 - Bảng: tên, email, vai trò, ngày tham gia, trạng thái."""
    users_page.search(user_target.email)
    row = users_page.row(user_target.email)
    expect(row).to_contain_text(user_target.full_name)
    expect(row).to_contain_text("Ứng viên")
    expect(row).to_contain_text("Đang hoạt động")


@pytest.mark.testcase("Admin_66")
def test_admin_66_total(users_page, admin_client):
    """Admin_66 - Dòng tổng: "X mục" hoặc "Hiển thị N mục mới nhất trên tổng X. Tìm kiếm hoặc lọc để thu hẹp danh sách."."""
    total = admin_client.users()["count"]
    expect(users_page.count).to_contain_text(re.compile(rf"(^{total} mục|trên tổng {total}\. Tìm kiếm hoặc lọc để thu hẹp danh sách\.)"))


@pytest.mark.testcase("Admin_67")
def test_admin_67_no_result(users_page):
    """Admin_67 - Lọc không có kết quả: "Không tìm thấy dữ liệu" - "Hãy thử thay đổi từ khóa hoặc bộ lọc."."""
    users_page.search("zzqx khong ton tai 9071")
    expect(users_page.empty_state.get_by_role("heading")).to_have_text("Không tìm thấy dữ liệu")
    expect(users_page.empty_state).to_contain_text("Hãy thử thay đổi từ khóa hoặc bộ lọc.")


@pytest.mark.testcase("Admin_68")
def test_admin_68_admin_row(users_page, admin_credentials):
    """Admin_68 - Dòng tài khoản Admin: nhãn "Tài khoản quản trị", không có thao tác Khóa."""
    users_page.search(admin_credentials["email"])
    row = users_page.row(admin_credentials["email"])
    expect(row).to_contain_text("Tài khoản quản trị")
    expect(row.get_by_role("button", name="Khóa")).to_have_count(0)


def _lock(users_page, user):
    users_page.search(user.email)
    users_page.act(user.email, "Khóa")
    users_page.dialog.confirm_button("Khóa tài khoản").click()
    expect(users_page.row(user.email)).to_contain_text("Đã khóa")


@pytest.mark.testcase("Admin_72")
def test_admin_72_lock(users_page, user_target, admin_client):
    """Admin_72 - Nhấn "Khóa tài khoản": chuyển "Đã khóa", nút đổi thành "Mở khóa"."""
    _lock(users_page, user_target)
    expect(users_page.row(user_target.email).get_by_role("button", name="Mở khóa")).to_be_visible()
    assert results(admin_client.users(q=user_target.email))[0]["is_active"] is False


@pytest.mark.parametrize("tc_id", ["Admin_73", "Admin_80"])
def test_admin_locked_cannot_login(users_page, user_target, employer_factory, admin_client, api_request, browser,
                                   settings, public_api, tc_id, record_testcase):
    """Admin_73/80 - Tài khoản (ứng viên / NTD) bị khóa đăng nhập: bị từ chối, hiển thị hướng dẫn liên hệ hỗ trợ;
    tin đã đăng của công ty NTD không bị ảnh hưởng."""
    record_testcase(tc_id)
    target = user_target
    job = None
    if tc_id == "Admin_80":
        target = employer_factory()
        job = target.create_job(public_api)
    _lock(users_page, target)
    ctx = browser.new_context(base_url=settings.base_url, locale=settings.locale)
    page2 = ctx.new_page()
    login = LoginPage(page2, settings).open()
    login.login(target.email, target.password)
    expect(page2.get_by_role("alert").first).to_be_visible()
    expect(page2.get_by_role("alert").first, "Không có hướng dẫn liên hệ hỗ trợ").to_contain_text(re.compile("hỗ trợ|liên hệ"))
    ctx.close()
    assert not api_request.post("auth/login/", data={"email": target.email, "password": target.password}).ok
    if job:
        assert public_api.job(job["id"])["status"] == "published", "Khóa NTD làm ảnh hưởng tin đã đăng"


@pytest.mark.testcase("Admin_74")
def test_admin_74_lock_active_session(users_page, user_target, browser, settings):
    """Admin_74 - A đang đăng nhập, Admin khóa A, A thao tác tiếp: bị đăng xuất / từ chối truy cập."""
    from fixtures.cv import _seed_tokens_script
    ctx = browser.new_context(base_url=settings.base_url)
    page2 = ctx.new_page()
    page2.add_init_script(_seed_tokens_script(user_target.access, user_target.refresh))
    page2.goto(f"{settings.base_url}/my-applications")
    expect(page2.get_by_role("heading", name="Đơn ứng tuyển của tôi")).to_be_visible()
    _lock(users_page, user_target)
    page2.reload()
    expect(page2.get_by_role("heading", name="Đơn ứng tuyển của tôi")).to_have_count(0)
    ctx.close()


@pytest.mark.testcase("Admin_75")
def test_admin_75_unlock(users_page, user_target, api_request):
    """Admin_75 - "Mở khóa": "Đang hoạt động"; đăng nhập lại thành công."""
    _lock(users_page, user_target)
    users_page.act(user_target.email, "Mở khóa")
    expect(users_page.row(user_target.email)).to_contain_text("Đang hoạt động")
    assert api_request.post("auth/login/", data={"email": user_target.email, "password": user_target.password}).ok


@pytest.mark.testcase("Admin_76")
def test_admin_76_cannot_lock_self(users_page, admin_client, admin_credentials):
    """Admin_76 - Admin tự khóa chính mình: không cho phép (không có nút Khóa; API từ chối)."""
    users_page.search(admin_credentials["email"])
    expect(users_page.row(admin_credentials["email"]).get_by_role("button", name="Khóa")).to_have_count(0)
    me = results(admin_client.users(q=admin_credentials["email"]))[0]
    resp = admin_client.patch(f"admin/users/{me['id']}/", data={"is_active": False})
    if resp.ok:  # khôi phục ngay để không khóa tài khoản admin demo
        admin_client.patch(f"admin/users/{me['id']}/", data={"is_active": True})
    assert not resp.ok, "API cho phép Admin tự khóa chính mình"


@pytest.mark.testcase("Admin_77")
def test_admin_77_filter_role(users_page, admin_client):
    """Admin_77 - Chọn vai trò "Nhà tuyển dụng": chỉ tài khoản NTD; tổng số đúng."""
    users_page.select_filter("Nhà tuyển dụng")
    for i in range(min(users_page.rows.count(), 20)):
        expect(users_page.rows.nth(i)).to_contain_text("Nhà tuyển dụng")
    total = admin_client.users(role="employer")["count"]
    expect(users_page.count).to_contain_text(str(total))


@pytest.mark.testcase("Admin_78")
def test_admin_78_filter_locked(users_page, user_target):
    """Admin_78 - Khóa 1 tài khoản, lọc "Đã khóa": tài khoản vừa khóa có trong kết quả."""
    _lock(users_page, user_target)
    status = users_page.page.locator("main").get_by_label("Trạng thái", exact=True)
    expect(status, "Màn hình Người dùng không có bộ lọc Trạng thái").to_be_visible(timeout=3000)
    status.select_option(label="Đã khóa")
    expect(users_page.row(user_target.email)).to_be_visible()


@pytest.mark.testcase("Admin_79")
def test_admin_79_search_and_role(users_page, user_target):
    """Admin_79 - Email + vai trò: kết quả thỏa đồng thời."""
    users_page.select_filter("Ứng viên")
    users_page.search(user_target.email)
    assert len(users_page.result_keys()) == 1
    users_page.select_filter("Nhà tuyển dụng")
    expect(users_page.empty_state).to_be_visible()


@pytest.mark.testcase("Admin_81")
def test_admin_81_cancel_lock(users_page, user_target, admin_client):
    """Admin_81 - Nhấn Khóa rồi Hủy: tài khoản vẫn "Đang hoạt động"."""
    users_page.search(user_target.email)
    users_page.act(user_target.email, "Khóa")
    users_page.dialog.cancel_button.click()
    expect(users_page.row(user_target.email)).to_contain_text("Đang hoạt động")
    assert results(admin_client.users(q=user_target.email))[0]["is_active"] is True


@pytest.mark.testcase("Admin_82")
def test_admin_82_permission(employer_factory, user_target):
    """Admin_82 - NTD gọi API khóa tài khoản: bị từ chối (403)."""
    emp = employer_factory()
    resp = emp.patch(f"admin/users/{user_target.admin_id}/", data={"is_active": False})
    assert resp.status == 403, f"NTD gọi API admin: {resp.status}"


# ================================================================ Doanh nghiệp
@pytest.fixture
def company_target(employer_factory):
    emp = employer_factory(company_name=f"Công ty Admin Test {unique_suffix()}")
    emp.update_company(tax_code=f"02{unique_suffix()[-8:]}")
    return emp, emp.company()


@pytest.fixture
def companies_page(as_admin) -> AdminCompaniesPage:
    return as_admin(AdminCompaniesPage)


@pytest.mark.testcase("Admin_119")
def test_admin_119_company_table(companies_page, employer_factory):
    """Admin_119 - Bảng doanh nghiệp đúng; chưa có MST hiển thị "Chưa có"."""
    emp = employer_factory(company_name=f"Công ty Không MST {unique_suffix()}")
    name = emp.company()["name"]
    companies_page.search(name)
    expect(companies_page.row(name)).to_contain_text("Chưa có")


@pytest.mark.testcase("Admin_120")
def test_admin_120_verify(companies_page, company_target, page: Page, settings, login_as):
    """Admin_120 - Nhấn "Xác minh": "Đã xác minh"; NTD không còn thông báo chờ xác minh."""
    emp, company = company_target
    companies_page.search(company["name"])
    companies_page.act(company["name"], "Xác minh")
    expect(companies_page.row(company["name"])).to_contain_text("Đã xác minh")
    assert emp.company()["verification_status"] == "verified"


@pytest.mark.parametrize("tc_id", ["Admin_124", "Admin_125"])
def test_admin_reject(companies_page, company_target, tc_id, record_testcase):
    """Admin_124/125 - "Từ chối xác minh": "Xác minh bị từ chối"; phía NTD thấy trạng thái tương ứng."""
    record_testcase(tc_id)
    emp, company = company_target
    companies_page.search(company["name"])
    companies_page.act(company["name"], "Từ chối")
    companies_page.dialog.confirm_button("Từ chối xác minh").click()
    expect(companies_page.row(company["name"])).to_contain_text("Xác minh bị từ chối")
    assert emp.company()["verification_status"] == "rejected"


@pytest.mark.testcase("Admin_126")
def test_admin_126_cancel_reject(companies_page, company_target):
    """Admin_126 - Nhấn Từ chối rồi Hủy: trạng thái không đổi."""
    emp, company = company_target
    companies_page.search(company["name"])
    companies_page.act(company["name"], "Từ chối")
    companies_page.dialog.cancel_button.click()
    assert emp.company()["verification_status"] == "pending"


@pytest.mark.testcase("Admin_127")
def test_admin_127_filter_verified(companies_page, company_target):
    """Admin_127 - Xác minh 1 doanh nghiệp, lọc "Đã xác minh": có trong kết quả, không còn trong "Chờ xác minh"."""
    _, company = company_target
    companies_page.search(company["name"])
    companies_page.act(company["name"], "Xác minh")
    companies_page.select_filter("Đã xác minh")
    expect(companies_page.row(company["name"])).to_be_visible()
    companies_page.select_filter("Chờ xác minh")
    expect(companies_page.row(company["name"])).to_have_count(0)


@pytest.mark.testcase("Admin_128")
def test_admin_128_no_tax_code(companies_page, employer_factory):
    """Admin_128 - Doanh nghiệp chưa có MST: "Chưa có", không cho xác minh hoặc cảnh báo thiếu MST."""
    emp = employer_factory(company_name=f"Công ty Thiếu MST {unique_suffix()}")
    name = emp.company()["name"]
    companies_page.search(name)
    row = companies_page.row(name)
    expect(row).to_contain_text("Chưa có")
    expect(row.get_by_role("button", name="Xác minh"), "Vẫn cho xác minh doanh nghiệp chưa có MST").to_have_count(0)


@pytest.mark.testcase("Admin_129")
def test_admin_129_search_and_status(companies_page, company_target):
    """Admin_129 - Tên + trạng thái xác minh: kết quả thỏa đồng thời."""
    _, company = company_target
    companies_page.select_filter("Chờ xác minh")
    companies_page.search(company["name"])
    assert companies_page.result_keys() and all(company["name"] in k for k in companies_page.result_keys())
    companies_page.select_filter("Đã xác minh")
    expect(companies_page.row(company["name"])).to_have_count(0)


# ================================================================ Tin tuyển dụng
@pytest.fixture
def job_target(shared_employer, public_api):
    return shared_employer.create_job(public_api)


@pytest.fixture
def jobs_page(as_admin) -> AdminJobsPage:
    return as_admin(AdminJobsPage)


def _close(jobs_page, job):
    jobs_page.search(job["title"])
    jobs_page.act(job["title"], "Đóng tin")
    jobs_page.dialog.confirm_button("Đóng tin").click()
    expect(jobs_page.row(job["title"])).to_contain_text("Đã đóng")


@pytest.mark.testcase("Admin_167")
def test_admin_167_jobs_table(jobs_page, job_target):
    """Admin_167 - Bảng tin đúng dữ liệu (tiêu đề, doanh nghiệp, trạng thái)."""
    jobs_page.search(job_target["title"])
    row = jobs_page.row(job_target["title"])
    expect(row).to_contain_text("Công ty Auto Dùng Chung")
    expect(row).to_contain_text("Đang tuyển")


@pytest.mark.parametrize("tc_id", ["Admin_171", "Admin_173", "Admin_175"])
def test_admin_close_job(jobs_page, job_target, public_api, shared_employer, tc_id, record_testcase):
    """Admin_171/173/175 - Đóng tin: "Đã đóng", nút "Mở lại"; ứng viên không tìm thấy / không ứng tuyển được;
    NTD thấy "Đã đóng"."""
    record_testcase(tc_id)
    _close(jobs_page, job_target)
    expect(jobs_page.row(job_target["title"]).get_by_role("button", name="Mở lại"),
           "Tin Admin đóng không có nút 'Mở lại'").to_be_visible(timeout=3000)
    assert job_target["title"] not in [j["title"] for j in results(public_api.jobs(q=job_target["title"]))]
    assert shared_employer.job(job_target["id"])["status"] == "closed"


@pytest.mark.testcase("Admin_172")
def test_admin_172_reopen(jobs_page, job_target, admin_client):
    """Admin_172 - "Mở lại" tin đã đóng: "Đang tuyển", hiển thị lại với ứng viên."""
    _close(jobs_page, job_target)
    jobs_page.act(job_target["title"], "Mở lại")
    expect(jobs_page.row(job_target["title"])).to_contain_text("Đang tuyển")


@pytest.mark.testcase("Admin_174")
def test_admin_174_cancel_close(jobs_page, job_target, shared_employer):
    """Admin_174 - Nhấn Đóng tin rồi Hủy: tin giữ trạng thái cũ."""
    jobs_page.search(job_target["title"])
    jobs_page.act(job_target["title"], "Đóng tin")
    jobs_page.dialog.cancel_button.click()
    assert shared_employer.job(job_target["id"])["status"] == "published"


@pytest.mark.testcase("Admin_176")
def test_admin_176_filter_closed(jobs_page, job_target):
    """Admin_176 - Đóng 1 tin, lọc "Đã đóng": tin vừa đóng có trong kết quả."""
    _close(jobs_page, job_target)
    jobs_page.select_filter("Đã đóng")
    expect(jobs_page.row(job_target["title"])).to_be_visible()


@pytest.mark.testcase("Admin_177")
def test_admin_177_search_and_status(jobs_page, job_target):
    """Admin_177 - Tiêu đề + trạng thái: kết quả thỏa đồng thời."""
    jobs_page.select_filter("Đang tuyển")
    jobs_page.search(job_target["title"])
    assert jobs_page.result_keys() == [job_target["title"]]
    jobs_page.select_filter("Đã đóng")
    expect(jobs_page.row(job_target["title"])).to_have_count(0)
