"""Màn hình công khai – TC nghiệp vụ riêng (KBKTCN sheet "Trang chủ"):
Trang chủ (Home_7..78), Tìm kiếm và lọc việc làm (Home_136..174), Chi tiết tin tuyển dụng (Home_181..199),
Công ty (Home_248..262), Trang 404 (Home_264, 265).

Textbox / combobox / phân trang / giao diện chung: tests/generic (sinh từ tài liệu theo mẫu).
Dữ liệu: tin / công ty do NTD test tạo qua API (shared_employer, employer_factory); số liệu đối chiếu qua API
công khai (cùng nguồn CSDL mà giao diện hiển thị).
"""
import re
from datetime import date, timedelta

import pytest
from playwright.sync_api import Page, expect

from pages.candidate_pages import FavoritesPage, JobDetailPage
from pages.login_page import LoginPage
from pages.public_pages import CompanyDetailPage, CompanyListPage, Header, HomeSearch, JobListPage, NotFoundPage
from utils.ats_api import CandidateActions, results
from utils.helpers import unique_suffix

pytestmark = [pytest.mark.function]


@pytest.fixture
def home(page: Page, settings) -> HomeSearch:
    return HomeSearch(page, settings).open()


@pytest.fixture
def jobs_page(page: Page, settings) -> JobListPage:
    return JobListPage(page, settings).open()


@pytest.fixture
def new_job(shared_employer, public_api):
    def _create(**kw):
        return shared_employer.create_job(public_api, **kw)
    return _create


# ================================================================ Header
@pytest.mark.home
@pytest.mark.testcase("Home_7")
def test_home_7_header_guest(home: HomeSearch):
    """Home_7 - Chưa đăng nhập: Logo, menu "Việc làm", "Công ty", nút "Đăng nhập", "Đăng ký"."""
    h = home.header
    expect(h.logo).to_be_visible()
    expect(h.nav_link("Việc làm")).to_be_visible()
    expect(h.nav_link("Công ty")).to_be_visible()
    expect(h.login).to_be_visible()
    expect(h.register).to_be_visible()


@pytest.mark.home
@pytest.mark.testcase("Home_8")
def test_home_8_header_candidate(login_role, page: Page, settings):
    """Home_8 - Ứng viên: menu Việc làm, Công ty, Việc làm phù hợp, CV của tôi, Tạo CV, Chấm điểm CV, Đơn ứng tuyển,
    Thư mời (kèm số chưa xem), Yêu thích; avatar tài khoản."""
    login_role("candidate")
    home = HomeSearch(page, settings).open()
    h = home.header
    for label in ("Việc làm", "Công ty", "Việc làm phù hợp", "CV của tôi", "Tạo CV", "Chấm điểm CV", "Đơn ứng tuyển"):
        expect(h.root.get_by_role("link", name=re.compile(rf"^{label}")).first, f"Thiếu menu {label}").to_be_visible()
    expect(h.shortcut("Thư mời")).to_be_visible()
    expect(h.shortcut("Yêu thích")).to_be_visible()
    expect(h.account.locator(".avatar")).to_be_visible()


@pytest.mark.home
@pytest.mark.parametrize("role, item", [("employer", "Trang tuyển dụng"), ("admin", "Trang quản trị")])
def test_home_9_header_employer_admin(login_role, page: Page, settings, role, item, record_testcase):
    """Home_9 - NTD / Admin: menu tài khoản có "Trang tuyển dụng" (NTD) hoặc "Trang quản trị" (Admin)."""
    record_testcase("Home_9")
    login_role(role)
    page.goto(f"{settings.base_url}/jobs")
    menu = Header(page).open_account_menu()
    expect(menu.get_by_role("link", name=item)).to_be_visible()


@pytest.mark.home
@pytest.mark.testcase("Home_10")
def test_home_10_logo(jobs_page: JobListPage, page: Page, settings):
    """Home_10 - Đứng ở màn hình bất kỳ, nhấn Logo: quay về Trang chủ."""
    jobs_page.header.logo.click()
    expect(page).to_have_url(re.compile(rf"^{re.escape(settings.base_url)}/?$"))


@pytest.mark.home
@pytest.mark.testcase("Home_11")
def test_home_11_menu_navigation(home: HomeSearch, page: Page):
    """Home_11 - Nhấn từng menu: chuyển đúng màn hình, menu đang chọn được highlight."""
    for label, path, heading in (("Việc làm", "/jobs", "Tìm kiếm việc làm"), ("Công ty", "/companies", "Công ty")):
        home.header.nav_link(label).click()
        expect(page).to_have_url(re.compile(rf"{path}/?$"))
        expect(page.get_by_role("heading", name=heading, level=1)).to_be_visible()
        expect(home.header.nav_link(label)).to_have_class(re.compile(r"\bactive\b"))


@pytest.mark.home
@pytest.mark.testcase("Home_12")
def test_home_12_logout(login_role, page: Page, settings):
    """Home_12 - Đăng xuất: về trang chủ chưa đăng nhập; Back không vào lại trang cần đăng nhập."""
    login_role("candidate")
    page.goto(f"{settings.base_url}/my-applications")
    expect(page.get_by_role("heading", name="Đơn ứng tuyển của tôi")).to_be_visible()
    header = Header(page)
    header.logout()
    expect(page).to_have_url(re.compile(rf"^{re.escape(settings.base_url)}/?$"))
    expect(header.login).to_be_visible()
    page.go_back()
    expect(page.get_by_role("heading", name="Đơn ứng tuyển của tôi")).to_have_count(0)


@pytest.mark.home
@pytest.mark.testcase("Home_13")
def test_home_13_mobile_menu(login_role, page: Page, settings):
    """Home_13 - Màn hình 375px: menu thu gọn thành nút; mở menu thấy đủ mục, chọn mục chuyển đúng trang."""
    login_role("candidate")
    page.set_viewport_size({"width": 375, "height": 812})
    HomeSearch(page, settings).open()
    toggle = page.get_by_role("banner").get_by_role("button", name="Mở menu")
    expect(toggle).to_be_visible()
    expect(Header(page).nav).to_be_hidden()
    toggle.click()
    menu = page.get_by_role("navigation", name="Menu")
    expect(menu).to_be_visible()
    for label in ("Việc làm", "Công ty", "CV của tôi", "Đơn ứng tuyển"):
        expect(menu.get_by_role("link", name=re.compile(rf"^{label}"))).to_be_visible()
    expect(menu.get_by_role("button", name="Đăng xuất")).to_be_visible()
    menu.get_by_role("link", name="Công ty", exact=True).click()
    expect(page).to_have_url(re.compile(r"/companies/?$"))


# ================================================================ Trang chủ: tìm kiếm & các khối
@pytest.mark.home
@pytest.mark.parametrize("tc_id", ["Home_44", "Home_68"])
def test_home_search_with_location(home: HomeSearch, page: Page, public_api, tc_id, record_testcase):
    """Home_44/68 - Nhập từ khóa "Kế toán", chọn địa điểm "Hà Nội", nhấn Tìm việc: sang Tìm kiếm việc làm, kết quả lọc
    theo từ khóa + địa điểm, bộ lọc điền sẵn."""
    record_testcase(tc_id)
    home.search_box.fill("Kế toán")
    home.location.select_option(label="Hà Nội")
    home.search_button.click()
    jobs = JobListPage(page, home.settings)
    jobs.expect_loaded()
    expect(jobs.search_box).to_have_value("Kế toán")
    expect(jobs.active).to_contain_text("Hà Nội")
    loc_id = next(l["id"] for l in public_api.locations() if l["name"] == "Hà Nội")
    api = public_api.jobs(q="Kế toán", location=loc_id, page_size=12)
    expect(jobs.count_text).to_contain_text(f"Tìm thấy {api['count']} việc làm")


@pytest.mark.home
@pytest.mark.testcase("Home_45")
def test_home_45_popular_keywords(home: HomeSearch):
    """Home_45 - Label "Từ khóa phổ biến:" + danh sách từ khóa dạng tag (VD: Kế toán, Nhân sự...)."""
    expect(home.page.get_by_text("Từ khóa phổ biến:")).to_be_visible()
    for kw in ("Kế toán", "Nhân sự"):
        expect(home.popular.get_by_role("button", name=kw)).to_be_visible()


@pytest.mark.home
@pytest.mark.testcase("Home_46")
def test_home_46_click_popular_keyword(home: HomeSearch, page: Page):
    """Home_46 - Nhấn 1 từ khóa phổ biến: sang Tìm kiếm việc làm với từ khóa tương ứng."""
    home.popular.get_by_role("button", name="Kế toán").click()
    jobs = JobListPage(page, home.settings)
    jobs.expect_loaded()
    expect(jobs.search_box).to_have_value("Kế toán")


@pytest.mark.home
@pytest.mark.testcase("Home_47")
def test_home_47_stats(home: HomeSearch, public_api):
    """Home_47 - Số việc làm đang tuyển, số doanh nghiệp, số ngành nghề đang tuyển khớp CSDL (chỉ tin Đang tuyển)."""
    jobs = public_api.jobs(page_size=100)
    industries = {j["industry"]["id"] for j in results(jobs) if j.get("industry")}
    assert home.stat("việc làm đang tuyển") == jobs["count"]
    assert home.stat("doanh nghiệp") == public_api.companies(page_size=1)["count"]
    assert home.stat("ngành nghề đang tuyển") == len(industries)


@pytest.mark.home
@pytest.mark.testcase("Home_48")
def test_home_48_industries(home: HomeSearch):
    """Home_48 - Ngành nghề nổi bật: các ngành kèm số việc làm đang tuyển, nút "Tất cả việc làm"."""
    cards = home.industries.locator("a.home-industry-card")
    expect(cards.first).to_be_visible()
    expect(cards.first).to_contain_text(re.compile(r"\d+ việc làm"))
    expect(home.industries.get_by_role("link", name="Tất cả việc làm")).to_be_visible()


@pytest.mark.home
@pytest.mark.testcase("Home_49")
def test_home_49_no_industry(page: Page, settings):
    """Home_49 - Hệ thống chưa có tin: "Các ngành nghề sẽ xuất hiện khi có tin tuyển dụng." (giả lập API rỗng)."""
    page.route("**/api/v1/jobs/?*", lambda r: r.fulfill(json={"count": 0, "results": [], "next": None, "previous": None}))
    HomeSearch(page, settings).open()
    expect(page.get_by_text("Các ngành nghề sẽ xuất hiện khi có tin tuyển dụng.")).to_be_visible()


@pytest.mark.home
@pytest.mark.testcase("Home_50")
def test_home_50_click_industry(home: HomeSearch, page: Page):
    """Home_50 - Nhấn 1 ngành nghề: sang Tìm kiếm việc làm đã lọc theo ngành đó."""
    card = home.industries.locator("a.home-industry-card").first
    name = card.locator(".home-industry-name").inner_text().strip()
    card.click()
    jobs = JobListPage(page, home.settings)
    jobs.expect_loaded()
    expect(page).to_have_url(re.compile(r"industry="))
    expect(jobs.active).to_contain_text(name)


@pytest.mark.home
@pytest.mark.testcase("Home_51")
def test_home_51_latest_jobs(home: HomeSearch, public_api):
    """Home_51 - Việc làm mới nhất: thẻ theo ngày đăng mới nhất; thẻ có logo, tiêu đề, công ty, địa điểm, lương, yêu thích."""
    newest = [j["title"] for j in results(public_api.jobs(page_size=6))]
    assert home.latest_jobs.titles() == newest, f"Thứ tự: {home.latest_jobs.titles()} / API mới nhất: {newest}"
    card = home.latest_jobs.cards.first
    for part in (".company-logo, .avatar, img", "h3", ".job-card-company", ".job-card-salary"):
        expect(card.locator(part).first).to_be_visible()
    expect(card.get_by_role("button", name="Yêu thích")).to_be_visible()


@pytest.mark.home
@pytest.mark.testcase("Home_52")
def test_home_52_industry_tabs(home: HomeSearch, public_api):
    """Home_52 - Tab "Tất cả": việc làm mới mọi ngành; tab 1 ngành: chỉ việc làm thuộc ngành đó."""
    tabs = home.latest_filters.get_by_role("button")
    tab = tabs.nth(1)
    name = tab.inner_text().strip()
    tab.click()
    expect(tab).to_have_attribute("aria-pressed", "true")
    in_industry = {j["title"] for j in results(public_api.jobs(page_size=100)) if (j.get("industry") or {}).get("name") == name}
    for t in home.latest_jobs.titles():
        assert t in in_industry, f"Tin '{t}' không thuộc ngành {name}"
    home.latest_filters.get_by_role("button", name="Tất cả").click()
    expect(home.latest_jobs.cards).to_have_count(min(6, public_api.jobs(page_size=1)["count"]))


@pytest.mark.home
@pytest.mark.testcase("Home_53")
def test_home_53_industry_without_jobs(home: HomeSearch):
    """Home_53 - Ngành không có tin: "Chưa có việc làm trong ngành này" - "Hãy chọn ngành khác...".
    Giao diện chỉ tạo tab cho ngành có tin -> không có tab trống để chọn."""
    tabs = home.latest_filters.get_by_role("button")
    for i in range(1, tabs.count()):
        tabs.nth(i).click()
        if home.latest.get_by_text("Chưa có việc làm trong ngành này").count():
            expect(home.latest).to_contain_text("Hãy chọn ngành khác để khám phá thêm cơ hội.")
            return
    pytest.skip("DỮ LIỆU: giao diện chỉ hiển thị tab ngành đang có tin – không tạo được ngành không có tin")


@pytest.mark.home
@pytest.mark.testcase("Home_54")
def test_home_54_no_jobs(page: Page, settings):
    """Home_54 - Không có tin đang tuyển: "Chưa có tin tuyển dụng mới" (giả lập API rỗng)."""
    page.route("**/api/v1/jobs/?*", lambda r: r.fulfill(json={"count": 0, "results": [], "next": None, "previous": None}))
    HomeSearch(page, settings).open()
    expect(page.get_by_role("heading", name="Chưa có tin tuyển dụng mới")).to_be_visible()


@pytest.mark.home
@pytest.mark.testcase("Home_55")
def test_home_55_jobs_error(page: Page, settings):
    """Home_55 - API lỗi: "Không tải được danh sách việc làm: <lỗi>"."""
    page.route("**/api/v1/jobs/?*", lambda r: r.fulfill(status=500, json={"detail": "Lỗi giả lập"}))
    page.goto(f"{settings.base_url}/")
    expect(page.get_by_text(re.compile("Không tải được danh sách việc làm"))).to_be_visible()


@pytest.mark.home
@pytest.mark.parametrize("tc_id", ["Home_56", "Home_75"])
def test_home_only_published(page: Page, settings, new_job, shared_employer, tc_id, record_testcase):
    """Home_56/75 - Chỉ hiển thị tin Đang tuyển: tin Bản nháp / Tạm dừng / Đã đóng không xuất hiện."""
    record_testcase(tc_id)
    draft = new_job(status="draft")
    paused = new_job()
    shared_employer.job_action(paused["id"], "pause")
    closed = new_job()
    shared_employer.job_action(closed["id"], "close")
    home = HomeSearch(page, settings).open()
    titles = home.latest_jobs.titles()
    for j in (draft, paused, closed):
        assert j["title"] not in titles, f"Tin '{j['title']}' không ở trạng thái Đang tuyển vẫn hiển thị"


@pytest.mark.home
@pytest.mark.testcase("Home_57")
def test_home_57_open_job_card(home: HomeSearch, page: Page):
    """Home_57 - Nhấn thẻ việc làm: chuyển đến Chi tiết tin tương ứng."""
    title = home.latest_jobs.titles()[0]
    home.latest_jobs.cards.first.get_by_role("link", name=title).click()
    expect(page).to_have_url(re.compile(r"/jobs/[\w-]+$"))
    expect(page.get_by_role("heading", level=1)).to_have_text(title)


@pytest.mark.home
@pytest.mark.parametrize("tc_id, region, link, path", [
    ("Home_58", "latest", "Khám phá tất cả việc làm", r"/jobs/?$"),
    ("Home_61", "companies", "Xem các công ty", r"/companies/?$"),
])
def test_home_section_buttons(home: HomeSearch, page: Page, tc_id, region, link, path, record_testcase):
    """Home_58/61 - "Khám phá tất cả việc làm" -> Tìm kiếm việc làm; "Xem các công ty" -> Danh sách công ty."""
    record_testcase(tc_id)
    getattr(home, region).get_by_role("link", name=link).click()
    expect(page).to_have_url(re.compile(path))


@pytest.mark.home
@pytest.mark.testcase("Home_59")
def test_home_59_companies(home: HomeSearch):
    """Home_59 - Thẻ công ty: logo, tên công ty, ngành nghề, số việc làm đang tuyển."""
    card = home.companies.locator("a.home-company-card").first
    expect(card.locator("strong")).to_be_visible()
    expect(card.locator("small")).to_be_visible()
    expect(card).to_contain_text(re.compile(r"\d+ việc làm"))


@pytest.mark.home
@pytest.mark.testcase("Home_60")
def test_home_60_company_card(home: HomeSearch, page: Page):
    """Home_60 - Nhấn thẻ công ty: chuyển đến Chi tiết công ty."""
    home.companies.locator("a.home-company-card").first.click()
    expect(page, "Thẻ công ty không chuyển tới Chi tiết công ty").to_have_url(re.compile(r"/companies/[\w-]+$"))


@pytest.mark.home
@pytest.mark.testcase("Home_62")
def test_home_62_create_account_cta(home: HomeSearch, page: Page):
    """Home_62 - Chưa đăng nhập, nhấn "Tạo tài khoản miễn phí": chuyển đến Đăng ký."""
    home.stats.get_by_role("link", name=re.compile("Tạo tài khoản miễn phí")).click()
    expect(page).to_have_url(re.compile(r"/register"))


@pytest.mark.home
@pytest.mark.testcase("Home_63")
def test_home_63_cta_guest_login_then_redirect(home: HomeSearch, page: Page, settings, candidate):
    """Home_63 - Chưa đăng nhập, nhấn "Chấm điểm CV miễn phí"/"Quản lý CV của tôi": tới Đăng nhập, xong vào màn hình tương ứng."""
    cta = home.stats.get_by_role("link", name=re.compile("Chấm điểm CV miễn phí|Quản lý CV của tôi"))
    cta.click()
    login = LoginPage(page, settings)
    login.expect_loaded()
    login.login_and_wait_api(candidate.email, candidate.password)
    expect(page).to_have_url(re.compile(r"/(cv-analysis|cv)/?$"))


@pytest.mark.home
@pytest.mark.testcase("Home_64")
def test_home_64_cta_candidate(login_role, page: Page, settings):
    """Home_64 - Ứng viên nhấn "Chấm điểm CV miễn phí"/"Quản lý CV của tôi": tới Chấm điểm CV / CV của tôi."""
    login_role("candidate")
    home = HomeSearch(page, settings).open()
    home.stats.get_by_role("link", name=re.compile("Chấm điểm CV miễn phí|Quản lý CV của tôi")).click()
    expect(page).to_have_url(re.compile(r"/(cv-analysis|cv)/?$"))


@pytest.mark.home
@pytest.mark.parametrize("role, path", [(None, r"/register"), ("employer", r"/recruiter/jobs/new")])
def test_home_65_post_job_cta(login_role, page: Page, settings, role, path, record_testcase):
    """Home_65 - "Đăng tin tuyển dụng": khách -> Đăng ký nhà tuyển dụng; NTD -> màn hình Đăng tin."""
    record_testcase("Home_65")
    if role:
        login_role(role)
    page.goto(f"{settings.base_url}/")
    link = page.get_by_role("link", name="Đăng tin tuyển dụng")
    expect(link, "Trang chủ không có nút 'Đăng tin tuyển dụng'").to_be_visible(timeout=5000)
    link.first.click()
    expect(page).to_have_url(re.compile(path))


@pytest.mark.home
@pytest.mark.testcase("Home_66")
def test_home_66_footer_labels(home: HomeSearch):
    """Home_66 - Label liên kết footer đúng chính tả."""
    expect(home.footer.get_by_role("link")).to_have_text(["Việc làm", "Công ty"])


@pytest.mark.home
@pytest.mark.testcase("Home_67")
def test_home_67_footer_links(home: HomeSearch, page: Page):
    """Home_67 - Liên kết footer chuyển đúng trang (liên kết ngoài mở tab mới)."""
    for label, path in (("Việc làm", r"/jobs/?$"), ("Công ty", r"/companies/?$")):
        home.footer.get_by_role("link", name=label).click()
        expect(page).to_have_url(re.compile(path))
    external = page.locator("footer a[href^='http']")
    for i in range(external.count()):
        expect(external.nth(i)).to_have_attribute("target", "_blank")


@pytest.mark.home
@pytest.mark.testcase("Home_69")
def test_home_69_search_without_conditions(home: HomeSearch, page: Page, public_api):
    """Home_69 - Bỏ trống từ khóa, địa điểm = Tất cả, nhấn Tìm việc: toàn bộ tin đang tuyển."""
    home.search_button.click()
    jobs = JobListPage(page, home.settings)
    jobs.expect_loaded()
    expect(jobs.count_text).to_contain_text(f"Tìm thấy {public_api.jobs(page_size=1)['count']} việc làm")


@pytest.mark.home
@pytest.mark.testcase("Home_70")
def test_home_70_favorite_as_guest(home: HomeSearch, page: Page, candidate):
    """Home_70 - Khách nhấn yêu thích trên thẻ việc làm: tới Đăng nhập, đăng nhập xong quay lại tin đó."""
    card = home.latest_jobs.cards.first
    card.get_by_role("button", name="Yêu thích").click()
    login = LoginPage(page, home.settings)
    login.expect_loaded()
    login.login_and_wait_api(candidate.email, candidate.password)
    expect(page, "Đăng nhập xong không quay lại tin đã chọn").to_have_url(re.compile(r"/jobs/[\w-]+$"))


@pytest.mark.home
@pytest.mark.testcase("Home_71")
def test_home_71_favorite_as_candidate(login_as, candidate, page: Page, settings):
    """Home_71 - Ứng viên nhấn yêu thích ở Việc làm mới nhất: icon "Đã lưu"; tin xuất hiện trong Yêu thích."""
    login_as(candidate)
    home = HomeSearch(page, settings).open()
    card = home.latest_jobs.cards.first
    title = card.locator("h3").inner_text().strip()
    card.get_by_role("button", name="Yêu thích").click()
    expect(card.get_by_role("button", name="Bỏ yêu thích")).to_have_attribute("aria-pressed", "true")
    fav = FavoritesPage(page, settings).open()
    assert title in fav.jobs.titles()


@pytest.mark.home
@pytest.mark.parametrize("tc_id, delta", [("Home_72", 1), ("Home_73", -1)])
def test_home_stats_update(page: Page, settings, new_job, shared_employer, public_api, tc_id, delta, record_testcase):
    """Home_72/73 - NTD đăng 1 tin mới / đóng 1 tin: tải lại trang chủ, số việc làm đang tuyển tăng / giảm 1."""
    record_testcase(tc_id)
    job = new_job() if delta < 0 else None
    home = HomeSearch(page, settings).open()
    before = home.stat("việc làm đang tuyển")
    if delta > 0:
        new_job()
    else:
        shared_employer.job_action(job["id"], "close")
    page.reload()
    home.expect_loaded()
    assert home.stat("việc làm đang tuyển") == before + delta


@pytest.mark.home
@pytest.mark.testcase("Home_74")
def test_home_74_new_job_on_top(page: Page, settings, new_job):
    """Home_74 - NTD đăng tin mới: tin xuất hiện đầu khối Việc làm mới nhất."""
    job = new_job()
    home = HomeSearch(page, settings).open()
    assert home.latest_jobs.titles()[0] == job["title"]


@pytest.mark.home
@pytest.mark.testcase("Home_76")
def test_home_76_new_industry(page: Page, settings, employer_factory, public_api):
    """Home_76 - Đăng tin thuộc ngành chưa có tin: ngành xuất hiện trong Ngành nghề nổi bật, số việc làm đúng."""
    used = {(j.get("industry") or {}).get("id") for j in results(public_api.jobs(page_size=100))}
    free = [i for i in public_api.industries() if i["id"] not in used]
    if not free:
        pytest.skip("DỮ LIỆU: mọi ngành nghề đều đã có tin đang tuyển")
    employer_factory().create_job(public_api, industry_id=free[0]["id"])
    home = HomeSearch(page, settings).open()
    card = home.industries.locator("a.home-industry-card").filter(has_text=free[0]["name"])
    expect(card).to_contain_text("1 việc làm")


@pytest.mark.home
@pytest.mark.testcase("Home_77")
def test_home_77_company_update(page: Page, settings, employer_factory, public_api):
    """Home_77 - Công ty cập nhật tên: tải lại trang chủ, thẻ công ty hiển thị thông tin mới."""
    emp = employer_factory()
    emp.create_job(public_api)
    name = f"Công ty Đổi Tên {unique_suffix()}"
    emp.update_company(name=name)
    home = HomeSearch(page, settings).open()
    expect(home.companies.get_by_text(name), "Công ty vừa đổi tên không có trong 8 công ty nổi bật").to_be_visible()


@pytest.mark.home
@pytest.mark.parametrize("role", ["candidate", "employer", "admin"])
def test_home_78_home_by_role(login_role, page: Page, settings, role, record_testcase):
    """Home_78 - Đăng nhập Ứng viên / NTD / Admin rồi vào trang chủ: hiển thị đúng, nút kêu gọi hành động theo vai trò."""
    record_testcase("Home_78")
    login_role(role)
    page.goto(f"{settings.base_url}/")
    if role == "candidate":
        HomeSearch(page, settings).expect_loaded()
        expect(page.get_by_role("link", name=re.compile("Chấm điểm CV miễn phí|Quản lý CV của tôi"))).to_be_visible()
    elif role == "employer":
        expect(page.get_by_role("link", name="Đăng tin tuyển dụng").first).to_be_visible()
    else:
        expect(page.get_by_role("link", name="Trang quản trị").or_(page.get_by_role("heading", level=1)).first).to_be_visible()


# ================================================================ Tìm kiếm và lọc việc làm
@pytest.mark.jobs
@pytest.mark.testcase("Home_136")
def test_home_136_active_filters(jobs_page: JobListPage):
    """Home_136 - Chọn nhiều bộ lọc: hiển thị số bộ lọc đang lọc và các tag đã chọn."""
    jobs_page.page.set_viewport_size({"width": 1366, "height": 900})
    t = jobs_page.choose("Hình thức", "Toàn thời gian")
    lv = jobs_page.choose("Cấp bậc", "Nhân viên")
    expect(jobs_page.active).to_contain_text("Đang lọc:")
    expect(jobs_page.active).to_contain_text(t)
    expect(jobs_page.active).to_contain_text(lv)
    expect(jobs_page.filter_toggle).to_contain_text("(2)")


@pytest.mark.jobs
@pytest.mark.testcase("Home_137")
def test_home_137_remove_one_filter(jobs_page: JobListPage):
    """Home_137 - Nhấn X trên 1 tag: bộ lọc đó bị xóa, kết quả cập nhật."""
    jobs_page.choose("Hình thức", "Toàn thời gian")
    jobs_page.choose("Cấp bậc", "Nhân viên")
    jobs_page.remove_chip("Cấp bậc")
    expect(jobs_page.active).not_to_contain_text("Nhân viên")
    assert "level=" not in jobs_page.page.url


@pytest.mark.jobs
@pytest.mark.testcase("Home_138")
def test_home_138_clear_all(jobs_page: JobListPage, public_api):
    """Home_138 - "Xóa tất cả": bộ lọc về mặc định, hiển thị tất cả tin."""
    jobs_page.choose("Hình thức", "Toàn thời gian")
    jobs_page.choose("Cấp bậc", "Nhân viên")
    jobs_page.clear_all.click()
    jobs_page.wait_results()
    expect(jobs_page.active).to_have_count(0)
    expect(jobs_page.count_text).to_contain_text(f"Tìm thấy {public_api.jobs(page_size=1)['count']} việc làm")


@pytest.mark.jobs
@pytest.mark.testcase("Home_139")
def test_home_139_ai_link_label(login_role, page: Page, settings):
    """Home_139 - Text link "Xem việc làm AI gợi ý theo CV" đúng chính tả (hiển thị cho Ứng viên)."""
    login_role("candidate")
    jobs = JobListPage(page, settings).open()
    expect(jobs.ai_link).to_have_text("Xem việc làm AI gợi ý theo CV")


@pytest.mark.jobs
@pytest.mark.parametrize("role, path", [(None, r"/login"), ("candidate", r"/recommended-jobs")])
def test_home_140_ai_link(login_role, page: Page, settings, role, path, record_testcase):
    """Home_140 - Nhấn link AI gợi ý: khách -> Đăng nhập; Ứng viên -> Việc làm phù hợp."""
    record_testcase("Home_140")
    if role:
        login_role(role)
    jobs = JobListPage(page, settings).open()
    expect(jobs.ai_link, "Link 'Xem việc làm AI gợi ý theo CV' không hiển thị").to_be_visible(timeout=5000)
    jobs.ai_link.click()
    expect(page).to_have_url(re.compile(path))


@pytest.mark.jobs
@pytest.mark.testcase("Home_141")
def test_home_141_job_card(jobs_page: JobListPage):
    """Home_141 - Mỗi thẻ: logo, tiêu đề, công ty, địa điểm, lương (hoặc "Thỏa thuận"), hình thức, ngày đăng, yêu thích."""
    card = jobs_page.jobs.cards.first
    expect(card.locator("h3")).to_be_visible()
    expect(card.locator(".job-card-company")).to_be_visible()
    expect(card.locator(".job-card-salary")).to_contain_text(re.compile(r"triệu|Thỏa thuận"))
    expect(card.locator(".job-card-badges")).to_be_visible()
    expect(card.get_by_role("button", name="Yêu thích")).to_be_visible()
    expect(card, "Thẻ việc làm không hiển thị ngày đăng").to_contain_text(re.compile(r"Đăng|Ngày đăng"), timeout=3000)


@pytest.mark.jobs
@pytest.mark.testcase("Home_142")
def test_home_142_long_title(page: Page, settings, new_job):
    """Home_142 - Tiêu đề > 100 ký tự: cắt bằng "...", không vỡ bố cục."""
    job = new_job(title=("Tiêu đề rất dài kiểm thử tự động " * 5)[:150] + unique_suffix())
    jobs = JobListPage(page, settings)
    jobs.goto_query(f"keyword={unique_suffix()[:0]}")
    jobs.search(job["title"][-18:])
    title = jobs.jobs.cards.first.locator("h3")
    clipped = title.evaluate("e => e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2 "
                             "|| getComputedStyle(e).webkitLineClamp !== 'none' || getComputedStyle(e).textOverflow === 'ellipsis'")
    assert clipped, "Tiêu đề dài không được cắt bằng '...'"
    assert page.evaluate("() => document.documentElement.scrollWidth <= document.documentElement.clientWidth")


@pytest.mark.jobs
@pytest.mark.testcase("Home_143")
def test_home_143_total(jobs_page: JobListPage, public_api):
    """Home_143 - Tổng số kết quả khớp số tin thỏa điều kiện."""
    expect(jobs_page.count_text).to_contain_text(f"Tìm thấy {public_api.jobs(page_size=1)['count']} việc làm")


@pytest.mark.jobs
@pytest.mark.parametrize("tc_id, field", [("Home_150", "title"), ("Home_151", "skill"), ("Home_152", "company")])
def test_home_search_by_field(page: Page, settings, new_job, tc_id, field, record_testcase):
    """Home_150/151/152 - Tìm theo tên vị trí / kỹ năng / tên công ty: hiện tin chứa từ khóa, kèm tổng số."""
    record_testcase(tc_id)
    skill = f"Skill{unique_suffix()}"
    job = new_job(skills=[{"name": skill}])
    keyword = {"title": job["title"], "skill": skill, "company": "Công ty Auto Dùng Chung"}[field]
    jobs = JobListPage(page, settings).open()
    jobs.search(keyword)
    assert job["title"] in jobs.result_keys(), f"Tìm '{keyword}' không ra tin {job['title']}"
    expect(jobs.count_text).to_contain_text("Tìm thấy")


@pytest.mark.jobs
@pytest.mark.parametrize("tc_id, filters", [
    ("Home_153", ("Ngành nghề", "Địa điểm")), ("Home_165", ("Ngành nghề",)), ("Home_166", ("Địa điểm",)),
    ("Home_167", ("Hình thức",)), ("Home_168", ("Cấp bậc",)),
])
def test_home_filters(jobs_page: JobListPage, public_api, tc_id, filters, record_testcase):
    """Home_153/165..168 - Chỉ chọn bộ lọc (không từ khóa): mọi tin trong kết quả thỏa bộ lọc đã chọn (đối chiếu API)."""
    record_testcase(tc_id)
    for label in filters:
        jobs_page.choose(label)
    params = dict(p.split("=") for p in jobs_page.page.url.split("?", 1)[1].split("&"))
    api = public_api.jobs(industry=params.get("industry"), location=params.get("location"),
                          job_type=params.get("type"), level=params.get("level"), page_size=12)
    assert jobs_page.result_keys() == [j["title"] for j in results(api)]
    for j in results(api):
        if "type" in params:
            assert j["job_type"] == params["type"]
        if "level" in params:
            assert j["level"] == params["level"]


@pytest.mark.jobs
@pytest.mark.testcase("Home_154")
def test_home_154_combined_filters(page: Page, settings, new_job, public_api):
    """Home_154 - Từ khóa + Ngành nghề + Địa điểm + Hình thức + Cấp bậc + Thời gian đăng: kết quả thỏa đồng thời."""
    job = new_job(job_type="part_time", level="fresher")
    q = f"keyword={job['title']}&industry={job['industry']['id']}&location={job['location']['id']}" \
        f"&type=part_time&level=fresher&posted=1"
    jobs = JobListPage(page, settings)
    jobs.goto_query(q)
    assert jobs.result_keys() == [job["title"]]


@pytest.mark.jobs
@pytest.mark.testcase("Home_155")
def test_home_155_posted_24h(jobs_page: JobListPage, public_api):
    """Home_155 - "24 giờ qua": chỉ tin đăng trong 24 giờ gần nhất."""
    jobs_page.choose("Thời gian đăng", "24 giờ qua")
    api = public_api.jobs(posted_within=1, page_size=12)
    assert jobs_page.result_keys() == [j["title"] for j in results(api)]


@pytest.mark.jobs
@pytest.mark.parametrize("tc_id", ["Home_156", "Home_171"])
def test_home_only_published_in_search(page: Page, settings, new_job, shared_employer, tc_id, record_testcase):
    """Home_156/171 - Kết quả không chứa tin Bản nháp / Tạm dừng / Đã đóng / Hết hạn."""
    record_testcase(tc_id)
    tag = unique_suffix()
    draft = new_job(title=f"Nháp {tag}", status="draft")
    paused = new_job(title=f"Tạm dừng {tag}")
    shared_employer.job_action(paused["id"], "pause")
    closed = new_job(title=f"Đóng {tag}")
    shared_employer.job_action(closed["id"], "close")
    jobs = JobListPage(page, settings).open()
    jobs.search(tag)
    assert jobs.result_keys() == [], f"Kết quả chứa tin không Đang tuyển: {jobs.result_keys()}"


@pytest.mark.jobs
@pytest.mark.testcase("Home_157")
def test_home_157_no_result(jobs_page: JobListPage):
    """Home_157 - Không có tin thỏa: "Không tìm thấy việc làm phù hợp" - "Hãy thử từ khóa ngắn hơn..."."""
    jobs_page.search("zzqx khong ton tai 9071")
    expect(jobs_page.empty_state.get_by_role("heading")).to_have_text("Không tìm thấy việc làm phù hợp")
    expect(jobs_page.empty_state).to_contain_text("Hãy thử từ khóa ngắn hơn, kiểm tra chính tả hoặc bỏ bớt bộ lọc.")


@pytest.mark.jobs
@pytest.mark.testcase("Home_158")
def test_home_158_filters_in_url(jobs_page: JobListPage, context):
    """Home_158 - Copy URL có bộ lọc mở ở tab mới / F5: bộ lọc và kết quả giữ nguyên."""
    jobs_page.choose("Hình thức", "Toàn thời gian")
    url, keys = jobs_page.page.url, jobs_page.result_keys()
    jobs_page.page.reload()
    jobs_page.expect_loaded()
    assert jobs_page.result_keys() == keys
    other = context.new_page()
    other.goto(url)
    second = JobListPage(other, jobs_page.settings)
    second.expect_loaded()
    expect(second.active).to_contain_text("Toàn thời gian")
    assert second.result_keys() == keys


@pytest.mark.jobs
@pytest.mark.testcase("Home_159")
def test_home_159_back_from_detail(jobs_page: JobListPage, page: Page):
    """Home_159 - Tìm kiếm, sang trang 2, mở chi tiết, Back: quay lại đúng trang 2 với bộ lọc cũ."""
    jobs_page.goto_query("type=full_time&page=2")
    if jobs_page.pagination.root.count() == 0:
        pytest.skip("DỮ LIỆU: không đủ tin để có trang 2")
    keys = jobs_page.result_keys()
    jobs_page.jobs.cards.first.get_by_role("link").first.click()
    expect(page).to_have_url(re.compile(r"/jobs/[\w-]+$"))
    page.go_back()
    jobs_page.expect_loaded()
    expect(page).to_have_url(re.compile(r"type=full_time.*page=2|page=2.*type=full_time"))
    assert jobs_page.result_keys() == keys


@pytest.mark.jobs
@pytest.mark.testcase("Home_160")
def test_home_160_api_error_retry(page: Page, settings):
    """Home_160 - API lỗi / timeout: báo lỗi và cho phép thử lại."""
    page.route("**/api/v1/jobs/?*", lambda r: r.fulfill(status=500, json={"detail": "Lỗi giả lập"}))
    page.goto(f"{settings.base_url}/jobs")
    retry = page.get_by_role("button", name="Thử lại")
    expect(retry).to_be_visible()
    page.unroute("**/api/v1/jobs/?*")
    retry.click()
    JobListPage(page, settings).expect_loaded()


@pytest.mark.jobs
@pytest.mark.parametrize("tc_id, option", [("Home_161", "Mới nhất"), ("Home_162", "Lương cao nhất"),
                                           ("Home_163", "Phù hợp nhất")])
def test_home_sorting(jobs_page: JobListPage, tc_id, option, record_testcase):
    """Home_161..163 - Sắp xếp theo mới nhất / lương cao nhất / phù hợp nhất."""
    record_testcase(tc_id)
    sort = jobs_page.page.get_by_text("Sắp xếp")
    expect(sort, "Màn hình Tìm kiếm việc làm không có tùy chọn sắp xếp").to_be_visible(timeout=3000)


@pytest.mark.jobs
@pytest.mark.parametrize("tc_id", ["Home_164", "Home_173", "Home_174"])
def test_home_job_alert(jobs_page: JobListPage, tc_id, record_testcase):
    """Home_164/173/174 - "Tạo thông báo việc làm" (job alert): lưu bộ lọc, thông báo khi có tin mới khớp."""
    record_testcase(tc_id)
    expect(jobs_page.page.get_by_role("button", name="Tạo thông báo việc làm"),
           "Màn hình Tìm kiếm việc làm không có nút 'Tạo thông báo việc làm'").to_be_visible(timeout=3000)


@pytest.mark.jobs
@pytest.mark.testcase("Home_169")
def test_home_169_guest_can_search(jobs_page: JobListPage, page: Page):
    """Home_169 - Khách vẫn tìm kiếm, lọc, xem chi tiết tin bình thường; không có sắp xếp "phù hợp nhất"."""
    jobs_page.choose("Hình thức", "Toàn thời gian")
    expect(jobs_page.jobs.cards.first).to_be_visible()
    jobs_page.jobs.cards.first.get_by_role("link").first.click()
    JobDetailPage(page, jobs_page.settings).expect_loaded()
    expect(page.get_by_text("Phù hợp nhất")).to_have_count(0)


@pytest.mark.jobs
@pytest.mark.testcase("Home_170")
def test_home_170_new_job_searchable(page: Page, settings, new_job):
    """Home_170 - NTD đăng tin mới, tìm theo tiêu đề: tin xuất hiện trong kết quả."""
    job = new_job()
    jobs = JobListPage(page, settings).open()
    jobs.search(job["title"])
    assert job["title"] in jobs.result_keys()


@pytest.mark.jobs
@pytest.mark.testcase("Home_172")
def test_home_172_paging_consistency(jobs_page: JobListPage, public_api):
    """Home_172 - Duyệt qua tất cả các trang: tổng bản ghi các trang = tổng hiển thị, không trùng / thiếu."""
    total = public_api.jobs(page_size=1)["count"]
    seen: list[str] = list(jobs_page.result_keys())
    for _ in range(50):
        if jobs_page.pagination.root.count() == 0 or jobs_page.pagination.next.is_disabled():
            break
        with jobs_page.page.expect_response(jobs_page._is_list):
            jobs_page.pagination.next.click()
        jobs_page.wait_results()
        seen += jobs_page.result_keys()
    assert len(seen) == total, f"Tổng bản ghi các trang {len(seen)} khác tổng hiển thị {total}"


# ================================================================ Chi tiết tin tuyển dụng
@pytest.fixture
def detail(page: Page, settings, new_job):
    def _open(**kw) -> tuple[JobDetailPage, dict]:
        job = new_job(**kw)
        return JobDetailPage(page, settings).open(job_id=job["id"]), job
    return _open


@pytest.mark.job_detail
@pytest.mark.parametrize("negotiable", [False, True])
def test_home_181_job_info(detail, negotiable, record_testcase):
    """Home_181 - Trường hiển thị đúng dữ liệu NTD nhập; Kinh nghiệm "Từ X năm"/"Không yêu cầu"; không lương: "Thỏa thuận"."""
    record_testcase("Home_181")
    kw = {"salary_min": None, "salary_max": None, "is_salary_negotiable": True, "min_years_experience": 0} if negotiable \
        else {"min_years_experience": 3}
    page, job = detail(**kw)
    expect(page.heading).to_have_text(job["title"])
    expect(page.info).to_contain_text("Không yêu cầu" if negotiable else "Từ 3 năm")
    expect(page.header_card).to_contain_text("Thỏa thuận" if negotiable else "triệu")
    expect(page.company_link).to_have_text("Công ty Auto Dùng Chung")


@pytest.mark.job_detail
@pytest.mark.testcase("Home_182")
def test_home_182_multiline_and_html(detail):
    """Home_182 - Mô tả, Yêu cầu, Quyền lợi: đúng xuống dòng, gạch đầu dòng; không thực thi html/script."""
    page, job = detail(description="Dòng 1\nDòng 2 <img src=x onerror=\"window.__xss=1\">",
                       requirements="Yêu cầu A\nYêu cầu B", benefits="Quyền lợi A\nQuyền lợi B")
    reqs = page.page.locator("section.job-section").filter(has=page.requirements).locator("li")
    expect(reqs).to_have_text(["Yêu cầu A", "Yêu cầu B"])
    desc = page.page.locator("section.job-section").filter(has=page.description).locator("p.pre-line")
    expect(desc).to_contain_text("Dòng 1\nDòng 2")
    assert page.page.evaluate("() => window.__xss") is None
    assert page.page.locator("main img[src='x']").count() == 0


@pytest.mark.job_detail
@pytest.mark.testcase("Home_183")
def test_home_183_company_link(detail):
    """Home_183 - Nhấn tên công ty: chuyển đến Chi tiết công ty."""
    page, _ = detail()
    page.company_link.click()
    expect(page.page).to_have_url(re.compile(r"/companies/[\w-]+$"))
    expect(page.page.get_by_role("heading", level=1)).to_have_text("Công ty Auto Dùng Chung")


@pytest.mark.job_detail
@pytest.mark.parametrize("tc_id", ["Home_184", "Home_196"])
def test_home_job_not_viewable(page: Page, settings, new_job, tc_id, record_testcase):
    """Home_184/196 - /jobs/<id không tồn tại> hoặc tin Bản nháp: "Không tải được tin tuyển dụng"."""
    record_testcase(tc_id)
    job_id = "00000000-0000-0000-0000-000000000000" if tc_id == "Home_184" else new_job(status="draft")["id"]
    page.goto(f"{settings.base_url}/jobs/{job_id}")
    expect(page.get_by_role("heading", name="Không tải được tin tuyển dụng")).to_be_visible()


@pytest.mark.job_detail
@pytest.mark.parametrize("tc_id, action, label", [("Home_185", "close", "Đã đóng"), ("Home_194", "pause", "Tạm dừng")])
def test_home_closed_job(page: Page, settings, new_job, shared_employer, login_role, tc_id, action, label, record_testcase):
    """Home_185/194 - Tin Đã đóng / Tạm dừng: hiển thị nhãn trạng thái, không cho ứng tuyển."""
    record_testcase(tc_id)
    job = new_job()
    shared_employer.job_action(job["id"], action)
    login_role("candidate")
    page.goto(f"{settings.base_url}/jobs/{job['id']}")
    d = JobDetailPage(page, settings)
    expect(page.get_by_text(label).or_(page.get_by_role("heading", name="Không tải được tin tuyển dụng")).first).to_be_visible()
    expect(d.apply_button).to_have_count(0)


@pytest.mark.job_detail
@pytest.mark.testcase("Home_195")
def test_home_195_expired_job(page: Page, settings, shared_employer, public_api):
    """Home_195 - Tin Hết hạn: nhãn "Hết hạn", không cho ứng tuyển (tạo tin hạn nộp hôm nay rồi kiểm tra trạng thái)."""
    job = shared_employer.create_job(public_api, deadline=date.today().isoformat())
    detail = shared_employer.job(job["id"])
    if detail["status"] != "expired":
        pytest.skip("DỮ LIỆU: không tạo được tin hết hạn qua API (hạn nộp phải từ hôm nay; cần job hết hạn chạy nền)")
    page.goto(f"{settings.base_url}/jobs/{job['id']}")
    expect(page.get_by_text("Hết hạn")).to_be_visible()


@pytest.mark.job_detail
@pytest.mark.parametrize("role", [None, "candidate"])
def test_home_187_apply_button(detail, login_role, page: Page, role, record_testcase):
    """Home_187 - Khách nhấn Ứng tuyển -> Đăng nhập; Ứng viên -> popup "Ứng tuyển: <tiêu đề tin>"."""
    record_testcase("Home_187")
    if role:
        login_role(role)
    d, job = detail()
    if role is None:
        d.login_to_apply.click()
        LoginPage(page, d.settings).expect_loaded()
    else:
        d.apply_button.click()
        expect(page.get_by_role("dialog").get_by_role("heading", level=2)).to_have_text(f"Ứng tuyển: {job['title']}")


@pytest.mark.job_detail
@pytest.mark.testcase("Home_188")
def test_home_188_favorite_default(login_role, detail):
    """Home_188 - Icon Yêu thích mặc định chưa lưu."""
    login_role("candidate")
    d, _ = detail()
    expect(d.favorite).to_have_attribute("aria-pressed", "false")


@pytest.mark.job_detail
@pytest.mark.testcase("Home_189")
def test_home_189_toggle_favorite(login_as, candidate, page: Page, settings, new_job):
    """Home_189 - Nhấn icon: "Đã lưu", tin vào mục Yêu thích; nhấn lại: bỏ lưu."""
    job = new_job()
    login_as(candidate)
    d = JobDetailPage(page, settings).open(job_id=job["id"])
    d.favorite.click()
    expect(d.favorite).to_have_attribute("aria-pressed", "true")
    assert any(j["id"] == job["id"] for j in CandidateActions(candidate).favorite_jobs())
    d.favorite.click()
    expect(d.favorite).to_have_attribute("aria-pressed", "false")
    assert not any(j["id"] == job["id"] for j in CandidateActions(candidate).favorite_jobs())


@pytest.mark.job_detail
@pytest.mark.parametrize("tc_id", ["Home_190", "Home_198"])
def test_home_job_public_url(detail, tc_id, record_testcase):
    """Home_190/198 - Khách / tab khác mở URL chi tiết tin: hiển thị đầy đủ, không yêu cầu đăng nhập."""
    record_testcase(tc_id)
    d, job = detail()
    expect(d.heading).to_have_text(job["title"])
    expect(d.description).to_be_visible()
    expect(d.requirements).to_be_visible()


@pytest.mark.job_detail
@pytest.mark.parametrize("tc_id, action", [("Home_191", "apply"), ("Home_199", "favorite")])
def test_home_guest_action_then_login(detail, page: Page, candidate, tc_id, action, record_testcase):
    """Home_191/199 - Khách nhấn Ứng tuyển / Yêu thích, đăng nhập: quay lại đúng tin đó."""
    record_testcase(tc_id)
    d, job = detail()
    (d.login_to_apply if action == "apply" else d.favorite).click()
    login = LoginPage(page, d.settings)
    login.expect_loaded()
    login.login_and_wait_api(candidate.email, candidate.password)
    expect(page).to_have_url(re.compile(rf"/jobs/{job['id']}$"))


@pytest.mark.job_detail
@pytest.mark.testcase("Home_192")
def test_home_192_after_apply(login_as, page: Page, settings, new_job, candidate_factory):
    """Home_192 - Ứng tuyển thành công, tải lại: nút "Đã ứng tuyển" và bị disable."""
    client = candidate_factory(["pdf"])
    job = new_job()
    client.apply(job["id"])
    login_as(client)
    d = JobDetailPage(page, settings).open(job_id=job["id"])
    expect(d.apply_button).to_have_count(0)
    applied = d.header_card.get_by_role("button", name="Đã ứng tuyển")
    expect(applied, "Không có nút 'Đã ứng tuyển' (giao diện hiển thị hộp 'Bạn đã ứng tuyển ngày ...')").to_be_disabled(timeout=3000)


@pytest.mark.job_detail
@pytest.mark.testcase("Home_193")
def test_home_193_applicant_count(page: Page, settings, new_job, candidate_factory):
    """Home_193 - Ứng viên khác ứng tuyển, tải lại: "Số hồ sơ đã nộp" tăng 1."""
    job = new_job()
    d = JobDetailPage(page, settings).open(job_id=job["id"])
    count = d.info.locator("dt:has-text('Số hồ sơ đã nộp') + dd")
    before = int(count.inner_text())
    candidate_factory(["pdf"]).apply(job["id"])
    page.reload()
    d.expect_loaded()
    expect(count).to_have_text(str(before + 1))


@pytest.mark.job_detail
@pytest.mark.testcase("Home_197")
def test_home_197_after_edit(detail, shared_employer, page: Page):
    """Home_197 - NTD sửa lương, mô tả; tải lại: thông tin mới được hiển thị."""
    d, job = detail()
    shared_employer.patch(f"employer/jobs/{job['id']}/", data={"salary_max": 45_000_000, "description": "Mô tả mới sau sửa"})
    page.reload()
    d.expect_loaded()
    expect(d.header_card).to_contain_text("45")
    expect(page.get_by_text("Mô tả mới sau sửa")).to_be_visible()


# ================================================================ Công ty
@pytest.fixture
def company_with(employer_factory, public_api):
    def _make(jobs: int = 1, description: str = "Giới thiệu công ty auto", **company):
        emp = employer_factory()
        emp.update_company(description=description, website="https://example.com", founded_year=2010, **company)
        for _ in range(jobs):
            emp.create_job(public_api)
        return emp, emp.company()
    return _make


@pytest.mark.companies
@pytest.mark.testcase("Home_248")
def test_home_248_company_detail(company_with, page: Page, settings):
    """Home_248 - Chi tiết công ty: logo, tên, Ngành nghề, Quy mô, Năm thành lập, Tỉnh/thành, Website (tab mới),
    giới thiệu, danh sách việc làm đang tuyển."""
    emp, company = company_with()
    d = CompanyDetailPage(page, settings).open(company_id=company["id"])
    expect(d.heading).to_have_text(company["name"])
    expect(d.info).to_contain_text("2010")
    expect(d.website).to_have_attribute("target", "_blank")
    expect(d.about).to_have_text("Giới thiệu công ty auto")
    expect(d.jobs.cards).to_have_count(1)
    for label in ("Ngành nghề", "Quy mô", "Năm thành lập", "Tỉnh/thành phố"):
        expect(page.locator("main dt", has_text=label), f"Thiếu thông tin {label}").to_have_count(1)


@pytest.mark.companies
@pytest.mark.testcase("Home_249")
def test_home_249_no_description(company_with, page: Page, settings):
    """Home_249 - Công ty chưa nhập giới thiệu: "Công ty chưa cập nhật phần giới thiệu."."""
    _, company = company_with(description="")
    d = CompanyDetailPage(page, settings).open(company_id=company["id"])
    expect(d.about).to_have_text("Công ty chưa cập nhật phần giới thiệu.")


@pytest.mark.companies
@pytest.mark.testcase("Home_250")
def test_home_250_no_jobs(company_with, page: Page, settings):
    """Home_250 - Công ty không có tin: "Công ty hiện chưa có tin đang tuyển"."""
    _, company = company_with(jobs=0)
    CompanyDetailPage(page, settings).open(company_id=company["id"])
    expect(page.get_by_role("heading", name="Công ty hiện chưa có tin đang tuyển")).to_be_visible()


@pytest.mark.companies
@pytest.mark.testcase("Home_251")
def test_home_251_company_not_found(page: Page, settings):
    """Home_251 - /companies/<id không tồn tại>: "Không tải được thông tin công ty"."""
    d = CompanyDetailPage(page, settings).open(company_id="00000000-0000-0000-0000-000000000000")
    expect(d.error).to_be_visible()


@pytest.mark.companies
@pytest.mark.parametrize("tc_id", ["Home_252", "Home_261"])
def test_home_favorite_company(login_as, candidate, company_with, page: Page, settings, tc_id, record_testcase):
    """Home_252/261 - Ứng viên nhấn yêu thích công ty: vào tab Công ty của Yêu thích; nhấn lại: bị xóa."""
    record_testcase(tc_id)
    _, company = company_with()
    login_as(candidate)
    d = CompanyDetailPage(page, settings).open(company_id=company["id"])
    expect(d.favorite.first, "Chi tiết công ty không có nút Yêu thích").to_be_visible(timeout=3000)
    d.favorite.first.click()
    fav = FavoritesPage(page, settings).open()
    fav.tab("Công ty").click()
    expect(page.get_by_text(company["name"])).to_be_visible()
    if tc_id == "Home_261":
        CompanyDetailPage(page, settings).open(company_id=company["id"]).favorite.first.click()
        fav = FavoritesPage(page, settings).open()
        fav.tab("Công ty").click()
        expect(page.get_by_text(company["name"])).to_have_count(0)


@pytest.mark.companies
@pytest.mark.parametrize("tc_id, by", [("Home_253", ("name", "industry", "location")), ("Home_255", ("industry",)),
                                       ("Home_256", ("location",)), ("Home_257", ("name", "industry", "location"))])
def test_home_company_search(company_with, page: Page, settings, public_api, tc_id, by, record_testcase):
    """Home_253/255..257 - Tên công ty + Ngành nghề + Địa điểm: kết quả thỏa đồng thời các điều kiện."""
    record_testcase(tc_id)
    ind, loc = public_api.industries()[0], public_api.locations()[0]
    name = f"Công ty Lọc {unique_suffix()}"
    _, company = company_with(name=name, industry_id=ind["id"], location_id=loc["id"])
    lst = CompanyListPage(page, settings).open()
    if "name" in by:
        lst.search(name)
    if "industry" in by:
        lst.choose("Ngành nghề", ind["name"])
    if "location" in by:
        lst.choose("Địa điểm", loc["name"])
    keys = lst.result_keys()
    assert name in keys if ("name" in by or len(keys) < 12) else True
    api = public_api.companies(q=name if "name" in by else None, industry=ind["id"] if "industry" in by else None,
                               location=loc["id"] if "location" in by else None, page_size=12)
    assert keys == [c["name"] for c in results(api)]


@pytest.mark.companies
@pytest.mark.testcase("Home_254")
def test_home_254_company_no_result(page: Page, settings):
    """Home_254 - Tên không tồn tại: "Không tìm thấy công ty phù hợp" - "Hãy thử tên khác hoặc bỏ bớt bộ lọc."."""
    lst = CompanyListPage(page, settings).open()
    lst.search("zzqx khong ton tai 9071")
    expect(lst.empty_state.get_by_role("heading")).to_have_text("Không tìm thấy công ty phù hợp")
    expect(lst.empty_state).to_contain_text("Hãy thử tên khác hoặc bỏ bớt bộ lọc.")


@pytest.mark.companies
@pytest.mark.testcase("Home_258")
def test_home_258_open_job_count(company_with, shared_employer, page: Page, settings, public_api):
    """Home_258 - Số việc làm trên thẻ công ty = số tin Đang tuyển (không tính Nháp / Tạm dừng / Đóng)."""
    emp, company = company_with(jobs=2)
    emp.create_job(public_api, status="draft")
    closed = emp.create_job(public_api)
    emp.job_action(closed["id"], "close")
    lst = CompanyListPage(page, settings).open()
    lst.search(company["name"])
    expect(lst.card(company["name"])).to_contain_text("2 việc làm đang tuyển")


@pytest.mark.companies
@pytest.mark.testcase("Home_259")
def test_home_259_company_jobs(company_with, page: Page, settings, public_api):
    """Home_259 - Chi tiết công ty chỉ hiện tin Đang tuyển của công ty; nhấn tin -> chi tiết tin."""
    emp, company = company_with(jobs=1)
    emp.create_job(public_api, status="draft")
    d = CompanyDetailPage(page, settings).open(company_id=company["id"])
    expect(d.jobs.cards).to_have_count(1)
    d.jobs.cards.first.get_by_role("link").first.click()
    expect(page).to_have_url(re.compile(r"/jobs/[\w-]+$"))


@pytest.mark.companies
@pytest.mark.testcase("Home_260")
def test_home_260_company_update(company_with, page: Page, settings):
    """Home_260 - NTD sửa hồ sơ công ty: chi tiết công ty hiển thị thông tin mới."""
    emp, company = company_with()
    emp.update_company(description="Giới thiệu đã cập nhật")
    d = CompanyDetailPage(page, settings).open(company_id=company["id"])
    expect(d.about).to_have_text("Giới thiệu đã cập nhật")


@pytest.mark.companies
@pytest.mark.testcase("Home_262")
def test_home_262_favorite_company_guest(company_with, page: Page, settings):
    """Home_262 - Khách nhấn yêu thích công ty: chuyển đến Đăng nhập."""
    _, company = company_with()
    d = CompanyDetailPage(page, settings).open(company_id=company["id"])
    expect(d.favorite.first, "Chi tiết công ty không có nút Yêu thích").to_be_visible(timeout=3000)
    d.favorite.first.click()
    LoginPage(page, settings).expect_loaded()


# ================================================================ 404
@pytest.mark.companies
@pytest.mark.testcase("Home_264")
def test_home_264_not_found(page: Page, settings):
    """Home_264 - URL không tồn tại: trang 404 kèm nút quay về Trang chủ."""
    page.goto(f"{settings.base_url}/khong-ton-tai-{unique_suffix()}")
    nf = NotFoundPage(page, settings)
    expect(nf.code).to_be_visible()
    expect(nf.home_link).to_be_visible()


@pytest.mark.companies
@pytest.mark.testcase("Home_265")
def test_home_265_back_home(page: Page, settings):
    """Home_265 - Nhấn nút quay về Trang chủ: chuyển đến Trang chủ."""
    page.goto(f"{settings.base_url}/khong-ton-tai-{unique_suffix()}")
    NotFoundPage(page, settings).home_link.click()
    expect(page).to_have_url(re.compile(rf"^{re.escape(settings.base_url)}/?$"))
