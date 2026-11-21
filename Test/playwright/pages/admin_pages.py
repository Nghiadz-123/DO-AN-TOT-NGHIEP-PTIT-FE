"""Page Object các màn hình Admin (/admin, /admin/users | companies | jobs).

Nguồn DOM (FE/frontend/src/pages/Admin):
  AdminDashboardPage.jsx  h1 "Tổng quan hệ thống"; StatCard "Người dùng" | "Doanh nghiệp" | "Tin tuyển dụng" |
      "Lượt ứng tuyển" (.stat-card-value / -hint); section.review-banner "<N> doanh nghiệp đang chờ xác minh";
      bảng "Người dùng mới", "Doanh nghiệp mới"; skeleton "Đang tải số liệu hệ thống"
  AdminManagePage.jsx  h1 "Người dùng" | "Doanh nghiệp" | "Tin tuyển dụng"; search (label ẩn = config.search) + "Tìm";
      select #admin-filter-<type> (label "Vai trò" | "Trạng thái xác minh" | "Trạng thái tin"); p.results-count
      ("N mục" / "Hiển thị N mục mới nhất trên tổng X..."); table tbody tr: nút "Khóa" | "Mở khóa" | "Xác minh" |
      "Từ chối" | "Đóng tin" | "Mở lại"; "Tài khoản quản trị"; EmptyState "Không tìm thấy dữ liệu";
      ConfirmDialog "Khóa tài khoản?" / "Từ chối xác minh?" / "Đóng tin tuyển dụng?"
"""
from __future__ import annotations

import re

from playwright.sync_api import Locator, Page, expect

from pages.base_page import BasePage
from pages.components import ConfirmDialog
from pages.form_base import SearchListPage

CONFIG = {
    "users": {"title": "Người dùng", "search": "Tìm theo tên, email hoặc số điện thoại", "filter": "Vai trò",
              "api": "/api/v1/admin/users/"},
    "companies": {"title": "Doanh nghiệp", "search": "Tìm theo tên doanh nghiệp", "filter": "Trạng thái xác minh",
                  "api": "/api/v1/admin/companies/"},
    "jobs": {"title": "Tin tuyển dụng", "search": "Tìm theo tiêu đề công việc", "filter": "Trạng thái tin",
             "api": "/api/v1/admin/jobs/"},
}


class AdminDashboard(BasePage):
    PATH = "/admin"
    URL_PATTERN = re.compile(r"/admin/?$")

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", name="Tổng quan hệ thống", level=1)
        self.review = page.locator("section.review-banner")
        self.recent_users = page.get_by_role("region", name="Người dùng mới")
        self.recent_companies = page.get_by_role("region", name="Doanh nghiệp mới")

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()
        expect(self.page.get_by_role("status", name="Đang tải số liệu hệ thống")).to_have_count(0)

    def card(self, label: str) -> Locator:
        return self.page.locator(".stat-card").filter(has=self.page.locator(".stat-card-label", has_text=label))

    def stat(self, label: str) -> int:
        return int(re.sub(r"\D", "", self.card(label).locator(".stat-card-value").inner_text()) or 0)

    def hint(self, label: str) -> str:
        return self.card(label).locator(".stat-card-hint").inner_text()


class AdminManagePage(SearchListPage):
    TYPE = "users"

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        cfg = CONFIG[self.TYPE]
        self.PATH = f"/admin/{self.TYPE}"
        self.URL_PATTERN = re.compile(rf"/admin/{self.TYPE}/?(\?.*)?$")
        self.LIST_API = cfg["api"]
        self.heading = page.get_by_role("heading", name=cfg["title"], level=1)
        self.search_box = page.locator("main").get_by_label(cfg["search"])
        self.filter = page.locator(f"#admin-filter-{self.TYPE}")
        self.rows = page.locator("main table tbody tr")
        self.count = page.locator("main p.results-count")
        self.empty_state = page.locator("main .empty-state")
        self.dialog = ConfirmDialog(page)
        self.results = page.locator("main table").or_(self.empty_state)

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()
        self.wait_results()

    def field(self, label: str) -> Locator:
        return self.filter if label == CONFIG[self.TYPE]["filter"] else self.search_box

    def result_keys(self) -> list[str]:
        return [r.locator("td").first.inner_text().split("\n")[0].strip() for r in self.rows.all()]

    def row(self, text: str) -> Locator:
        return self.rows.filter(has_text=text)

    def act(self, text: str, label: str) -> None:
        self.row(text).get_by_role("button", name=label, exact=True).click()

    def select_filter(self, label: str) -> None:
        with self.page.expect_response(self._is_list):
            self.filter.select_option(label=label)
        self.wait_results()


class AdminUsersPage(AdminManagePage):
    TYPE = "users"


class AdminCompaniesPage(AdminManagePage):
    TYPE = "companies"


class AdminJobsPage(AdminManagePage):
    TYPE = "jobs"
