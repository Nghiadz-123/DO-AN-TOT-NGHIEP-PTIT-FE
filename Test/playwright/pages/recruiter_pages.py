"""Page Object các màn hình Nhà tuyển dụng (/recruiter/*).

Nguồn DOM (FE/frontend/src/pages/Recruiter):
  DashboardPage.jsx  h1 "Xin chào, <tên>"; StatCard (a.stat-card: .stat-card-label / -value / -hint) "Tin đang tuyển",
      "Tổng hồ sơ", "Hồ sơ mới chưa xử lý", "Đang trong quy trình"; section "Quy trình tuyển dụng" (a.pipeline-step);
      section "Hồ sơ mới nhận" (table, link "Xem hồ sơ <tên>"), EmptyState "Chưa có hồ sơ ứng tuyển"
  CompanyProfilePage.jsx  h1 "Hồ sơ công ty"; section "Logo công ty" (input file ẩn, nút "Tải logo lên"/"Đổi logo"/
      "Đang tải lên...", "Xóa logo", p.field-error); form: #name*, #taxCode (pattern \\d{10}(-\\d{3})?), select
      #industryId, #companySize, number #foundedYear, url #website, email #email, tel #phone, select #locationId,
      #address, textarea #description; FormStatus; nút "Lưu hồ sơ công ty" -> PATCH /employer/company/
  ManageJobsPage.jsx  h1 "Tin tuyển dụng"; group "Lọc theo trạng thái tin"; search (label ẩn "Tìm theo tiêu đề tin")
      + nút "Tìm"; table (Vị trí, Trạng thái, Ngày đăng, Hạn nộp, Hồ sơ); link "Xem hồ sơ ứng tuyển tin <tiêu đề>";
      nút "Thao tác khác với tin <tiêu đề>" (DropdownMenu); ConfirmDialog "Đóng tin tuyển dụng?" / "Xóa tin tuyển dụng?"
  JobFormPage.jsx  h1 "Đăng tin tuyển dụng mới" | "Chỉnh sửa tin tuyển dụng"; #title*, select #industryId* #type
      #workMode #level #locationId*, number #headcount (1..1000) #minYearsExperience (0..50), #address,
      #salaryMin #salaryMax, date #deadline*, SkillInput #skills, textarea #description* #requirements* #benefits;
      nút "Lưu nháp" | "Đăng tin" -> POST /employer/jobs/
  AccountPage.jsx  h1 "Tài khoản"; #fullName*, #email (disabled), #phone, #position; nút "Lưu thông tin"
      -> PATCH /employer/profile/ ; ChangePasswordForm
  ApplicantsPage.jsx  h1 "Ứng viên"; select #applicant-job | #applicant-status | #applicant-sort; search (label ẩn
      "Tìm ứng viên theo tên, email, số điện thoại") + "Tìm"; table; ConfirmDialog "Từ chối hồ sơ?"
  ApplicantDetailPage.jsx  h1#applicant-name; nút "Từ chối" / "Chuyển sàng lọc" / "Mời phỏng vấn" / "Gửi đề nghị" /
      "Xác nhận tuyển" -> Modal (textarea #note "Ghi chú nội bộ", #reason) "Xác nhận"; radiogroup "Đánh giá ứng viên"
"""
from __future__ import annotations

import re

from playwright.sync_api import Locator, Page, expect

from pages.base_page import BasePage
from pages.candidate_pages import Pagination
from pages.components import ConfirmDialog
from pages.form_base import FormPage, SearchListPage
from pages.profile_page import ChangePasswordSection


class Workspace:
    """Khung trang NTD / Admin (components/layout/WorkspaceShell.jsx)."""

    def __init__(self, page: Page):
        self.nav = page.locator("nav.workspace-nav")

    def link(self, label: str) -> Locator:
        return self.nav.get_by_role("link", name=label, exact=True)


# ---------------------------------------------------------------- Dashboard
class RecruiterDashboard(BasePage):
    PATH = "/recruiter"
    URL_PATTERN = re.compile(r"/recruiter/?$")

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", level=1)
        self.workspace = Workspace(page)
        self.pipeline = page.get_by_role("region", name="Quy trình tuyển dụng")
        self.recent = page.get_by_role("region", name="Hồ sơ mới nhận")
        self.empty = self.recent.locator(".empty-state")

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.page.get_by_role("status", name="Đang tải số liệu tuyển dụng")).to_have_count(0)
        expect(self.heading).to_be_visible()

    def stat_card(self, label: str) -> Locator:
        return self.page.locator(".stat-card").filter(has=self.page.locator(".stat-card-label", has_text=label))

    def stat(self, label: str) -> int:
        return int(re.sub(r"\D", "", self.stat_card(label).locator(".stat-card-value").inner_text()) or 0)

    def hint(self, label: str) -> str:
        return self.stat_card(label).locator(".stat-card-hint").inner_text()


# ---------------------------------------------------------------- Hồ sơ công ty
COMPANY_KEYS = {"name": "name", "taxCode": "tax_code", "website": "website", "email": "email", "phone": "phone",
                "address": "address", "description": "description", "foundedYear": "founded_year",
                "industryId": "industry", "companySize": "company_size", "locationId": "location"}


class CompanyProfileForm(FormPage):
    PATH = "/recruiter/company"
    URL_PATTERN = re.compile(r"/recruiter/company/?$")
    WRITE_URL = "/employer/company/"
    WRITE_METHODS = ("PATCH",)

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", name="Hồ sơ công ty", level=1)
        self.form_root = page.locator("main form").filter(has=page.locator("#name"))
        self.submit_button = self.form_root.get_by_role("button", name=re.compile("Lưu hồ sơ công ty|Đang lưu"))
        self.logo = page.get_by_role("region", name="Logo công ty")
        self.logo_input = self.logo.locator("input[type='file']")
        self.logo_button = self.logo.get_by_role("button", name=re.compile("Tải logo lên|Đổi logo|Đang tải lên"))
        self.logo_error = self.logo.locator(".field-error")
        self.status = self.form_root.locator(".form-status")

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()
        expect(self.page.get_by_role("status", name="Đang tải hồ sơ công ty")).to_have_count(0)
        expect(self.form_root).to_be_visible()

    def saved(self, key: str):
        value = self.env.client.company().get(COMPANY_KEYS.get(key, key))
        return "" if value is None and key in ("taxCode", "website", "email", "phone", "address", "description") else value

    def fill_required(self, exclude: str = "") -> None:
        if exclude != "Tên công ty" and not self.field("Tên công ty").input_value().strip():
            self.field("Tên công ty").fill("Công ty Auto")


# ---------------------------------------------------------------- Tin tuyển dụng
class ManageJobsPage(SearchListPage):
    PATH = "/recruiter/jobs"
    URL_PATTERN = re.compile(r"/recruiter/jobs/?(\?.*)?$")
    LIST_API = "/api/v1/employer/jobs/"

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", name="Tin tuyển dụng", level=1)
        self.status_tabs = page.get_by_role("group", name="Lọc theo trạng thái tin")
        self.search_box = page.locator("main").get_by_label("Tìm theo tiêu đề tin")
        self.rows = page.locator("main table tbody tr")
        self.empty_state = page.locator("main .empty-state")
        self.pagination = Pagination(page)
        self.active = page.locator(".active-filters")
        self.dialog = ConfirmDialog(page)
        self.results = page.locator("main table").or_(self.empty_state)

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()
        self.wait_results()

    def field(self, label: str) -> Locator:
        return self.search_box

    def result_keys(self) -> list[str]:
        return [r.locator("td").first.inner_text().split("\n")[0].strip() for r in self.rows.all()]

    def row(self, title: str) -> Locator:
        return self.rows.filter(has_text=title)

    def tab(self, label: str) -> Locator:
        return self.status_tabs.get_by_role("button", name=label, exact=True)

    def actions_menu(self, title: str) -> Locator:
        trigger = self.row(title).get_by_role("button", name=f"Thao tác khác với tin {title}")
        trigger.click()
        menu = self.page.locator(f"#{trigger.get_attribute('aria-controls')}")
        expect(menu).to_be_visible()
        return menu

    def action(self, title: str, label: str) -> None:
        menu = self.actions_menu(title)
        menu.get_by_role("button", name=label).or_(menu.get_by_role("link", name=label)).first.click()

    def apply_broad_filter(self) -> str:
        self.page.goto(f"{self.settings.base_url}{self.PATH}?status=published")
        self.expect_loaded()
        return "status"


# ---------------------------------------------------------------- Đăng tin
JOB_KEYS = {"title": "title", "address": "address", "description": "description", "requirements": "requirements",
            "benefits": "benefits", "headcount": "headcount", "minYearsExperience": "min_years_experience",
            "salaryMin": "salary_min", "salaryMax": "salary_max", "deadline": "deadline"}


class JobFormPage(FormPage):
    PATH = "/recruiter/jobs/new"
    URL_PATTERN = re.compile(r"/recruiter/jobs/(new|[\w-]+/edit)/?$")
    WRITE_URL = "/employer/jobs/"
    WRITE_METHODS = ("POST", "PATCH")

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", level=1)
        self.form_root = page.locator("main form").filter(has=page.locator("#title"))
        self.submit_button = self.form_root.get_by_role("button", name=re.compile(r"^(Đăng tin|Lưu thay đổi|Đang lưu...)$"))
        self.draft_button = self.form_root.get_by_role("button", name="Lưu nháp")
        self.skills = self.form_root.locator("#skills")

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.form_root).to_be_visible()
        expect(self.page.get_by_role("status", name="Đang tải tin tuyển dụng")).to_have_count(0)

    def add_skill(self, name: str) -> None:
        self.skills.fill(name)
        self.skills.press("Enter")

    def fill_required(self, exclude: str = "") -> None:
        today = __import__("datetime").date.today() + __import__("datetime").timedelta(days=30)
        values = {"Tiêu đề công việc": "Auto Nhân viên kiểm thử", "Mô tả công việc": "Mô tả auto",
                  "Yêu cầu ứng viên": "Yêu cầu auto", "Hạn nộp hồ sơ": today.isoformat()}
        for label, value in values.items():
            if label != exclude:
                loc = self.field(label)
                if not loc.input_value().strip():
                    loc.fill(value)
        for label in ("Ngành nghề", "Tỉnh/thành phố"):
            if label != exclude and not self.field(label).input_value():
                self.field(label).select_option(index=1)
        if exclude != "Kỹ năng" and self.form_root.locator(".skill-input .tag").count() == 0:
            self.add_skill("Python")

    def saved(self, key: str):
        resp = getattr(self, "_last", None)
        if resp is None or not resp.ok:
            return None
        job = self.env.client.job(resp.json()["id"])
        value = job.get(JOB_KEYS.get(key, key))
        if key in ("salaryMin", "salaryMax") and value is not None:
            return value / 1_000_000
        return value

    def submit(self, timeout_ms: int = 3000):
        self._last = super().submit(timeout_ms)
        return self._last


# ---------------------------------------------------------------- Tài khoản
class RecruiterAccountForm(FormPage):
    PATH = "/recruiter/account"
    URL_PATTERN = re.compile(r"/recruiter/account/?$")
    WRITE_URL = "/employer/profile/"
    WRITE_METHODS = ("PATCH",)

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", name="Tài khoản", level=1)
        self.form_root = page.locator("main form").filter(has=page.locator("#position"))
        self.submit_button = self.form_root.get_by_role("button", name=re.compile("Lưu thông tin|Đang lưu"))
        self.status = self.form_root.locator(".form-status")
        self.password = ChangePasswordSection(page, settings)

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()
        expect(self.page.get_by_role("status", name="Đang tải thông tin tài khoản")).to_have_count(0)
        expect(self.form_root).to_be_visible()

    def saved(self, key: str):
        value = self.env.client.profile().get({"fullName": "full_name"}.get(key, key))
        return "" if value is None else value

    def fill_required(self, exclude: str = "") -> None:
        if exclude != "Họ và tên" and not self.field("Họ và tên").input_value().strip():
            self.field("Họ và tên").fill("Auto Recruiter")


# ---------------------------------------------------------------- Ứng viên
class ApplicantsPage(SearchListPage):
    PATH = "/recruiter/applicants"
    URL_PATTERN = re.compile(r"/recruiter/applicants/?(\?.*)?$")
    LIST_API = "/api/v1/employer/applications/"

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", level=1)
        self.job_select = page.get_by_label("Tin tuyển dụng", exact=True)
        self.status_select = page.get_by_label("Trạng thái", exact=True)
        self.sort_select = page.get_by_label("Sắp xếp", exact=True)
        self.search_box = page.get_by_label("Tìm ứng viên theo tên, email, số điện thoại")
        self.rows = page.locator("main table tbody tr")
        self.empty_state = page.locator("main .empty-state")
        self.pagination = Pagination(page)
        self.active = page.locator(".active-filters")
        self.dialog = ConfirmDialog(page)
        self.results = page.locator("main table").or_(self.empty_state)

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()
        expect(self.page.get_by_role("status", name="Đang tải danh sách ứng viên")).to_have_count(0)
        self.wait_results()

    def field(self, label: str) -> Locator:
        return {"Tin tuyển dụng": self.job_select, "Trạng thái": self.status_select, "Sắp xếp": self.sort_select}.get(
            label, self.search_box)

    def result_keys(self) -> list[str]:
        return [r.get_by_role("link").first.get_attribute("aria-label") or r.inner_text().split("\n")[0]
                for r in self.rows.all()]

    def row(self, name: str) -> Locator:
        return self.rows.filter(has_text=name)

    def apply_broad_filter(self) -> str:
        self.page.goto(f"{self.settings.base_url}{self.PATH}?sort=newest")
        self.expect_loaded()
        return "sort"


class ApplicantDetailPage(FormPage):
    URL_PATTERN = re.compile(r"/recruiter/applicants/[\w-]+/?$")
    WRITE_URL = "/status/"
    WRITE_METHODS = ("POST",)

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.locator("#applicant-name")
        self.header = page.locator("section.applicant-header")
        self.cv = page.get_by_role("region", name="CV đã nộp")
        self.rating = page.get_by_role("radiogroup", name="Đánh giá ứng viên")
        self.history = page.locator("section[aria-labelledby='history-title']")
        self.form_root = page.get_by_role("dialog")
        self.submit_button = self.form_root.get_by_role("button", name=re.compile("Xác nhận|Đang lưu"))

    def open(self, application_id: str | None = None, **_):
        app_id = application_id or self.env.data["application_id"]
        self.page.goto(f"{self.settings.base_url}/recruiter/applicants/{app_id}")
        self.expect_loaded()
        return self

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.page.get_by_role("status", name="Đang tải hồ sơ ứng viên")).to_have_count(0)
        expect(self.heading).to_be_visible()

    def transition(self, label: str) -> Locator:
        return self.header.get_by_role("button", name=label, exact=True)

    def open_transition(self, label: str = "Chuyển sàng lọc") -> None:
        self.transition(label).click()
        expect(self.form_root).to_be_visible()

    def saved(self, key: str):
        app = self.env.client.application(self.env.data["application_id"])
        history = app.get("status_history") or []
        return history[-1].get("note", "") if history else None


class ApplicantNoteForm(ApplicantDetailPage):
    """Screen cho engine chung: mở chi tiết hồ sơ (đơn mới) rồi mở popup chuyển trạng thái có ô Ghi chú nội bộ."""

    def open(self, **_):
        super().open()
        self.open_transition()
        return self

    def fill_required(self, exclude: str = "") -> None:
        pass


class TalentPoolPage(BasePage):
    PATH = "/recruiter/talent-pool"
    URL_PATTERN = re.compile(r"/recruiter/talent-pool")

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", name="Tìm ứng viên", level=1)
