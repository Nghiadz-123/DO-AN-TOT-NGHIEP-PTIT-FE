"""Page Object các màn hình công khai: Trang chủ, Tìm kiếm việc làm, Công ty, Chi tiết công ty, 404, Header.

Nguồn DOM (FE/frontend/src):
  components/layout/Header.jsx  header > a "Smart ATS - Trang chủ"; nav "Điều hướng chính" (NavLink, class active);
      khách: link "Đăng nhập", "Đăng ký"; đã đăng nhập: nút "Tài khoản <tên>" (DropdownMenu) -> "Đăng xuất"
  components/layout/Footer.jsx  nav "Liên kết cuối trang": Việc làm, Công ty
  pages/Home/HomePage.jsx  h1#home-title; form role=search: input search (label ẩn "Từ khóa tìm việc",
      placeholder "Chức danh, kỹ năng hoặc công ty"), select (label ẩn "Địa điểm làm việc", "Tất cả địa điểm"),
      nút "Tìm việc"; "Từ khóa phổ biến:" + chip; aside "Smart ATS hôm nay" (dt/dd thống kê + CTA);
      section "Ngành nghề nổi bật" (a.home-industry-card), "Việc làm mới nhất" (group "Lọc việc làm theo ngành",
      JobCard), "Nhà tuyển dụng nổi bật" (a.home-company-card)
  pages/Jobs/JobListPage.jsx  h1 "Tìm kiếm việc làm"; input search (label ẩn "Từ khóa tìm việc"), nút "Tìm kiếm",
      "Bộ lọc"; HoverSelect Ngành nghề | Địa điểm | Hình thức | Cấp bậc | Thời gian đăng; ActiveFilters
      ("Đang lọc:", chip "Bỏ lọc <nhãn>: <giá trị>", "Xóa tất cả"); region "Kết quả tìm kiếm" (status "Tìm thấy N
      việc làm"); EmptyState "Không tìm thấy việc làm phù hợp"; Pagination (12/trang)
  pages/Companies/CompanyListPage.jsx  h1 "Công ty"; input (label ẩn "Tên công ty", "Nhập tên công ty");
      HoverSelect Ngành nghề | Địa điểm; region "Danh sách công ty"; article.company-card; Pagination (12/trang)
  pages/Companies/CompanyDetailPage.jsx  h1 tên công ty; ErrorState "Không tải được thông tin công ty";
      "Công ty chưa cập nhật phần giới thiệu."; EmptyState "Công ty hiện chưa có tin đang tuyển"
  pages/NotFound/NotFoundPage.jsx  "404", h1 "Không tìm thấy trang", link "Về trang chủ"
"""
from __future__ import annotations

import re

from playwright.sync_api import Locator, Page, expect

from pages.base_page import BasePage
from pages.candidate_pages import JobCards, Pagination
from pages.form_base import SearchListPage


class Header:
    def __init__(self, page: Page):
        self.page = page
        self.root = page.get_by_role("banner")
        self.logo = self.root.get_by_role("link", name="Smart ATS - Trang chủ")
        self.nav = self.root.get_by_role("navigation", name="Điều hướng chính")
        self.login = self.root.get_by_role("link", name="Đăng nhập", exact=True)
        self.register = self.root.get_by_role("link", name="Đăng ký", exact=True)
        self.account = self.root.get_by_role("button", name=re.compile(r"^Tài khoản "))

    def nav_link(self, label: str) -> Locator:
        return self.nav.get_by_role("link", name=label, exact=True)

    def shortcut(self, label: str) -> Locator:
        return self.root.get_by_role("link", name=re.compile(rf"^{re.escape(label)}"))

    def open_account_menu(self) -> Locator:
        self.account.click()
        menu = self.page.locator(f"#{self.account.get_attribute('aria-controls')}")
        expect(menu).to_be_visible()
        return menu

    def logout(self) -> None:
        self.open_account_menu().get_by_role("button", name="Đăng xuất").click()


class _ListBase(SearchListPage):
    """Danh sách công khai có ô tìm kiếm + HoverSelect + Pagination."""

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.header = Header(page)
        self.pagination = Pagination(page)
        self.active = page.locator(".active-filters")
        self.clear_all = self.active.get_by_role("button", name="Xóa tất cả")

    def hover(self, label: str) -> Locator:
        """Nút mở HoverSelect có nhãn `label` (aria-labelledby = nhãn + nút)."""
        return self.page.locator(".hover-select").filter(
            has=self.page.locator(".field-label", has_text=re.compile(rf"^{re.escape(label)}$"))
        ).locator("button.hover-select-trigger")

    def choose(self, label: str, option: str | None = None, index: int = 1) -> str:
        """Chọn 1 giá trị của HoverSelect, chờ danh sách tải lại; trả về nhãn đã chọn."""
        trigger = self.hover(label)
        trigger.click()
        menu = self.page.locator(f"#{trigger.get_attribute('aria-controls')}")
        item = menu.get_by_role("option", name=option, exact=True) if option else menu.get_by_role("option").nth(index)
        chosen = item.inner_text().strip()
        with self.page.expect_response(self._is_list):
            item.get_by_role("button").click()
        self.wait_results()
        return chosen

    def remove_chip(self, label: str) -> None:
        with self.page.expect_response(self._is_list):
            self.active.get_by_role("button", name=re.compile(rf"^Bỏ lọc {re.escape(label)}")).click()
        self.wait_results()

    def goto_query(self, query: str) -> None:
        self.page.goto(f"{self.settings.base_url}{self.PATH}{'?' + query if query else ''}")
        self.expect_loaded()

    def apply_broad_filter(self) -> str:
        """Bộ lọc vẫn còn > 1 trang kết quả (giữ bộ lọc khi chuyển trang). Trả về tên tham số trên URL."""
        raise NotImplementedError

    @property
    def count_text(self) -> Locator:
        return self.results.get_by_role("status")


class JobListPage(_ListBase):
    PATH = "/jobs"
    URL_PATTERN = re.compile(r"/jobs/?(\?.*)?$")
    LIST_API = "/api/v1/jobs/"

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", name="Tìm kiếm việc làm", level=1)
        self.form = page.locator("main form[role='search']")
        self.search_box = self.form.get_by_label("Từ khóa tìm việc")
        self.search_button = self.form.get_by_role("button", name="Tìm kiếm")
        self.filter_toggle = self.form.get_by_role("button", name=re.compile(r"^Bộ lọc"))
        self.results = page.get_by_role("region", name="Kết quả tìm kiếm")
        self.jobs = JobCards(self.results)
        self.empty_state = page.locator("main .empty-state")
        self.ai_link = page.get_by_role("link", name="Xem việc làm AI gợi ý theo CV")

    def field(self, label: str) -> Locator:
        return self.hover(label) if label != "Từ khóa tìm việc" else self.search_box

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()
        self.wait_results()
        expect(self.results).to_be_visible()

    def result_keys(self) -> list[str]:
        return self.jobs.titles()

    def apply_broad_filter(self) -> str:
        self.goto_query("type=full_time")
        return "type"


class HomeSearch(BasePage):
    """Ô tìm kiếm ở Trang chủ: tìm kiếm chuyển sang màn hình Tìm kiếm việc làm (kết quả đọc ở đó)."""

    PATH = "/"
    URL_PATTERN = re.compile(r"/(\?.*)?$")

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.header = Header(page)
        self.heading = page.locator("#home-title")
        self.form = page.locator("form.home-search")
        self.search_box = self.form.get_by_label("Từ khóa tìm việc")
        self.location = self.form.get_by_label("Địa điểm làm việc")
        self.search_button = self.form.get_by_role("button", name="Tìm việc")
        self.popular = page.get_by_role("list", name="Từ khóa phổ biến:")
        self.stats = page.get_by_role("complementary", name="Smart ATS hôm nay")
        self.industries = page.get_by_role("region", name="Ngành nghề nổi bật")
        self.latest = page.get_by_role("region", name="Việc làm mới nhất")
        self.latest_filters = page.get_by_role("group", name="Lọc việc làm theo ngành")
        self.latest_jobs = JobCards(self.latest)
        self.companies = page.get_by_role("region", name="Nhà tuyển dụng nổi bật")
        self.footer = page.get_by_role("navigation", name="Liên kết cuối trang")
        self.list_page = JobListPage(page, settings)
        self.empty_state = self.list_page.empty_state

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()
        expect(self.page.get_by_role("status", name="Đang tải việc làm mới")).to_have_count(0)

    def field(self, label: str) -> Locator:
        return {"Từ khóa tìm việc": self.search_box, "Địa điểm làm việc": self.location}[label]

    def stat(self, label: str) -> int:
        value = self.stats.locator("dl > div").filter(has=self.page.locator("dt", has_text=label)).locator("dd")
        return int(re.sub(r"\D", "", value.inner_text()) or 0)

    # ---------- giao diện tìm kiếm cho engine chung
    def search(self, keyword: str) -> None:
        if "/jobs" in self.page.url:  # đang ở màn hình kết quả -> quay lại trang chủ để tìm
            self.open()
        self.search_box.fill(keyword)
        self.search_box.press("Enter")
        self.list_page.expect_loaded()

    def clear_search(self) -> None:
        self.list_page.clear_search()

    def result_keys(self) -> list[str]:
        if "/jobs" not in self.page.url:  # ở trang chủ: danh sách mặc định = màn hình Tìm việc không điều kiện
            self.list_page.goto_query("")
            keys = self.list_page.result_keys()
            self.open()
            return keys
        return self.list_page.result_keys()

    def has_error(self) -> bool:
        return self.list_page.has_error()


class CompanyListPage(_ListBase):
    PATH = "/companies"
    URL_PATTERN = re.compile(r"/companies/?(\?.*)?$")
    LIST_API = "/api/v1/companies/"

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", name="Công ty", level=1)
        self.form = page.locator("main form[role='search']")
        self.search_box = self.form.get_by_label("Tên công ty")
        self.results = page.get_by_role("region", name="Danh sách công ty")
        self.cards = self.results.locator("article.company-card")
        self.empty_state = page.locator("main .empty-state")

    def field(self, label: str) -> Locator:
        return self.hover(label) if label != "Tên công ty" else self.search_box

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()
        self.wait_results()
        expect(self.results).to_be_visible()

    def result_keys(self) -> list[str]:
        return [t.strip() for t in self.cards.locator("h3").all_inner_texts()]

    def card(self, name: str) -> Locator:
        return self.cards.filter(has=self.page.get_by_role("link", name=name, exact=True))

    def apply_broad_filter(self) -> str:
        self.search_box.fill("Công ty")
        self.search_box.press("Enter")
        self.wait_results()
        return "keyword"


class CompanyDetailPage(BasePage):
    URL_PATTERN = re.compile(r"/companies/[\w-]+/?$")

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", level=1)
        self.about = page.locator("main p.pre-line")
        self.info = page.locator("main dl")
        self.jobs_section = page.locator("main section.results")
        self.jobs = JobCards(self.jobs_section)
        self.website = page.locator("main a[target='_blank']")
        self.favorite = page.locator("main").get_by_role("button", name=re.compile("Yêu thích|Bỏ yêu thích|Đã yêu thích"))
        self.error = page.get_by_role("heading", name="Không tải được thông tin công ty")

    def open(self, company_id: str | None = None, **_):
        self.page.goto(f"{self.settings.base_url}/companies/{company_id or self.env.data['company_id']}")
        self.expect_loaded()
        return self

    def expect_loaded(self) -> None:
        expect(self.page.locator("[role='status'][aria-label^='Đang tải']")).to_have_count(0)


class NotFoundPage(BasePage):
    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.code = page.get_by_text("404", exact=True)
        self.heading = page.get_by_role("heading", name="Không tìm thấy trang")
        self.home_link = page.get_by_role("link", name="Về trang chủ")
