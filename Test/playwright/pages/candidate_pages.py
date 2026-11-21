"""Page Object các màn hình Ứng viên ngoài CV: Việc làm phù hợp, Chi tiết tin + popup Ứng tuyển, Đơn ứng tuyển,
Thư mời ứng tuyển, Yêu thích.

Nguồn DOM (FE/frontend/src):
  pages/Candidate/RecommendedJobsPage.jsx  h1 "Việc làm phù hợp với bạn"; select#reco-cv (label "Dựa trên CV");
      group "Mức độ phù hợp": button[aria-pressed] Tất cả | Từ 50 điểm | Từ 70 điểm; section "Việc làm phù hợp";
      status "N công việc phù hợp"; JobCard (article.job-card) + nút "AI đánh giá chi tiết"
  pages/Jobs/JobDetailPage.jsx  h1 = tiêu đề tin; nút "Ứng tuyển ngay" | "Đăng nhập để ứng tuyển" |
      "Đã ngừng nhận hồ sơ"; .applied-box "Bạn đã ứng tuyển ngày ..."; FavoriteButton withLabel "Yêu thích"/"Đã yêu thích"
  components/jobs/ApplyModal.jsx  dialog "Ứng tuyển: <tiêu đề>"; fieldset "Chọn CV để nộp" (radio + badge "CV chính");
      link "Tải CV khác"; textarea#coverLetter "Thư giới thiệu (không bắt buộc)"; nút "Hủy", "Nộp hồ sơ"/"Đang gửi..."
      -> POST /candidate/applications/
  pages/Candidate/MyApplicationsPage.jsx  h1 "Đơn ứng tuyển của tôi"; group "Lọc theo trạng thái"; li.application-card;
      nút "Rút hồ sơ" -> ConfirmDialog "Rút hồ sơ ứng tuyển?" + textarea#withdraw-reason "Lý do (không bắt buộc)"
  pages/Candidate/InvitationsPage.jsx  h1 "Thư mời ứng tuyển"; group "Lọc thư mời"; article.invitation-card
  pages/Candidate/FavoritesPage.jsx  h1 "Yêu thích"; group "Loại mục yêu thích": Việc làm | Công ty
  components/common/Pagination.jsx  nav "Phân trang": "Trang trước", "Trang N", "Trang sau"
"""
from __future__ import annotations

import re

from playwright.sync_api import Locator, Page, expect

from pages.base_page import BasePage
from pages.components import AppShell, ConfirmDialog
from pages.form_base import FormPage


class Pagination:
    def __init__(self, page: Page):
        self.root = page.get_by_role("navigation", name="Phân trang")
        self.prev = self.root.get_by_role("button", name="Trang trước")
        self.next = self.root.get_by_role("button", name="Trang sau")
        self.count = self.root.locator(".pagination-count")

    def page_button(self, n: int) -> Locator:
        return self.root.get_by_role("button", name=f"Trang {n}", exact=True)

    @property
    def current(self) -> Locator:
        return self.root.locator("[aria-current='page']")


class JobCards:
    """Danh sách thẻ việc làm (components/jobs/JobCard.jsx)."""

    def __init__(self, scope: Page | Locator):
        self.cards = scope.locator("article.job-card")

    def titles(self) -> list[str]:
        return [t.strip() for t in self.cards.locator("h3").all_inner_texts()]

    def card(self, title: str) -> Locator:
        return self.cards.filter(has=self.cards.page.get_by_role("link", name=title, exact=True))


# ---------------------------------------------------------------- Việc làm phù hợp
class RecommendedJobsPage(BasePage):
    PATH = "/recommended-jobs"
    URL_PATTERN = re.compile(r"/recommended-jobs")

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", name="Việc làm phù hợp với bạn", level=1)
        self.cv_select = page.get_by_label("Dựa trên CV", exact=True)
        self.score_group = page.get_by_role("group", name="Mức độ phù hợp")
        self.results = page.get_by_role("region", name="Việc làm phù hợp")
        self.count = self.results.get_by_role("status")
        self.jobs = JobCards(page.locator("main"))
        self.empty = page.locator(".empty-state")
        self.progress = page.get_by_text("AI đang tìm công việc phù hợp, lần đầu có thể mất 10-20 giây...")

    def open(self, cv_id: str | None = None, **_):
        self.page.goto(f"{self.settings.base_url}{self.PATH}" + (f"?cvId={cv_id}" if cv_id else ""))
        self.expect_loaded()
        return self

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.page.get_by_role("status", name="Đang tải CV")).to_have_count(0)

    def score_filter(self, label: str) -> Locator:
        return self.score_group.get_by_role("button", name=label, exact=True)

    def evaluate_button(self, card: Locator) -> Locator:
        return card.get_by_role("button", name=re.compile("AI đánh giá chi tiết|AI đang đánh giá"))


# ---------------------------------------------------------------- Chi tiết tin + Ứng tuyển
class ApplyModal(FormPage):
    WRITE_URL = "/candidate/applications/"
    WRITE_METHODS = ("POST",)

    def __init__(self, page: Page, settings=None):
        super().__init__(page, settings)
        self.form_root = page.get_by_role("dialog").filter(has_text="Ứng tuyển:")
        self.root = self.form_root
        self.title = self.root.get_by_role("heading", level=2)
        self.screen_title = self.title  # tiêu đề màn hình dạng popup (engine kiểm tra giao diện chung)
        self.cv_group = self.root.get_by_role("group", name="Chọn CV để nộp")
        self.radios = self.root.get_by_role("radio")
        self.upload_link = self.root.get_by_role("link", name="Tải CV khác")
        self.cover_letter = self.root.get_by_label("Thư giới thiệu (không bắt buộc)")
        self.cancel_button = self.root.get_by_role("button", name="Hủy", exact=True)
        self.close_icon = self.root.get_by_role("button", name="Đóng", exact=True)
        self.submit_button = self.root.get_by_role("button", name=re.compile("^(Nộp hồ sơ|Đang gửi...)$"))
        self.empty = self.root.locator(".empty-state")

    def option(self, cv_title: str) -> Locator:
        return self.root.locator("label.cv-option").filter(has_text=cv_title)

    def saved(self, key: str):
        """Thư giới thiệu của đơn vừa nộp vào tin đang mở (GET chi tiết đơn)."""
        job_id = self.env.data.get("job_id")
        app = next((a for a in self.env.candidate.applications() if (a.get("job") or {}).get("id") == job_id), None)
        if app is None:
            return None
        detail = self.env.client.json_ok(self.env.client.get(f"candidate/applications/{app['id']}/"), "Chi tiết đơn")
        return detail.get({"coverLetter": "cover_letter"}.get(key, key), "")


class JobDetailPage(BasePage):
    URL_PATTERN = re.compile(r"/jobs/[\w-]+/?$")

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.shell = AppShell(page)
        self.heading = page.get_by_role("heading", level=1)
        self.header_card = page.locator("section.job-detail-header")
        self.apply_button = self.header_card.get_by_role("button", name="Ứng tuyển ngay")
        self.login_to_apply = self.header_card.get_by_role("button", name="Đăng nhập để ứng tuyển")
        self.closed_button = self.header_card.get_by_role("button", name="Đã ngừng nhận hồ sơ")
        self.applied_box = self.header_card.locator(".applied-box")
        self.favorite = self.header_card.locator(".btn-favorite-label")
        self.modal = ApplyModal(page, settings)
        self.company_link = self.header_card.locator("a.company-link")
        self.description = page.get_by_role("heading", name="Mô tả công việc")
        self.requirements = page.get_by_role("heading", name="Yêu cầu ứng viên")
        self.benefits = page.get_by_role("heading", name="Quyền lợi")
        self.info = page.locator("dl.info-list")

    def open(self, job_id: str | None = None, **_):
        job_id = job_id or self.env.data["job_id"]
        self.page.goto(f"{self.settings.base_url}/jobs/{job_id}", wait_until="domcontentloaded")
        self.expect_loaded()
        return self

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.page.get_by_role("status", name="Đang tải tin tuyển dụng")).to_have_count(0)
        expect(self.heading).to_be_visible()

    def open_apply(self) -> ApplyModal:
        self.apply_button.click()
        expect(self.modal.root).to_be_visible()
        expect(self.modal.root.get_by_text("Đang tải danh sách CV...")).to_have_count(0)
        self.modal.env = self.env
        return self.modal


class ApplyScreen(ApplyModal):
    """Screen cho engine chung: mở chi tiết tin rồi mở popup Ứng tuyển."""

    def open(self, **_):
        detail = JobDetailPage(self.page, self.settings)
        detail.env = self.env
        if "job_id" not in self.env.data:  # mỗi lần mở: 1 tin mới của NTD dùng chung (nộp được, không trùng đơn)
            self.env.data["job_id"] = self.env.fixtures("shared_employer").create_job(self.env.public)["id"]
        detail.open(job_id=self.env.data["job_id"])
        detail.open_apply()
        return self

    def expect_loaded(self) -> None:
        expect(self.root).to_be_visible()

    def fill_required(self, exclude: str = "") -> None:
        pass


# ---------------------------------------------------------------- Đơn ứng tuyển của tôi
class MyApplicationsPage(BasePage):
    PATH = "/my-applications"
    URL_PATTERN = re.compile(r"/my-applications")

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", name="Đơn ứng tuyển của tôi", level=1)
        self.filters = page.get_by_role("group", name="Lọc theo trạng thái")
        self.cards = page.locator("li.application-card")
        self.empty = page.locator(".empty-state")
        self.dialog = ConfirmDialog(page)
        self.reason = page.get_by_role("dialog").get_by_label("Lý do (không bắt buộc)")

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.page.get_by_role("status", name="Đang tải đơn ứng tuyển")).to_have_count(0)
        expect(self.heading).to_be_visible()

    def filter(self, label: str) -> Locator:
        return self.filters.get_by_role("button", name=re.compile(rf"^{re.escape(label)}\s*\(\d+\)$"))

    def card(self, job_title: str) -> Locator:
        return self.cards.filter(has=self.page.get_by_role("link", name=job_title, exact=True))

    def withdraw_button(self, card: Locator) -> Locator:
        return card.get_by_role("button", name="Rút hồ sơ")

    def open_withdraw(self, job_title: str) -> ConfirmDialog:
        self.withdraw_button(self.card(job_title)).click()
        expect(self.dialog.root).to_be_visible()
        return self.dialog


class WithdrawForm(FormPage):
    """Popup Rút hồ sơ dạng form (cho engine kiểm tra textarea Lý do)."""

    WRITE_URL = "/withdraw/"
    WRITE_METHODS = ("POST",)

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.form_root = page.get_by_role("dialog")
        self.submit_button = self.form_root.get_by_role("button", name="Rút hồ sơ", exact=True)

    def open(self, **_):
        env = self.env
        job = env.data.get("job") or _applied_job(env)  # mỗi test 1 tin + 1 đơn mới (dùng chung tài khoản)
        my = MyApplicationsPage(self.page, self.settings).open()
        my.open_withdraw(job["title"])
        return self

    def saved(self, key: str):
        """Lý do rút hồ sơ = ghi chú của bước lịch sử chuyển sang withdrawn (GET chi tiết đơn)."""
        job_id = self.env.data["job"]["id"]
        app = next(a for a in self.env.candidate.applications() if (a.get("job") or {}).get("id") == job_id)
        detail = self.env.client.json_ok(self.env.client.get(f"candidate/applications/{app['id']}/"), "Chi tiết đơn")
        steps = [h for h in detail.get("status_history", []) if h.get("to_status") == "withdrawn"]
        return steps[-1].get("note", "") if steps else None

    def fill_required(self, exclude: str = "") -> None:
        pass


def _applied_job(env) -> dict:
    """Tạo 1 tin của NTD dùng chung + nộp đơn bằng CV của ứng viên (tiền điều kiện cho Rút hồ sơ)."""
    employer = env.fixtures("shared_employer")
    job = employer.create_job(env.public)
    cv = env.client.cvs[0] if env.client.cvs else None
    env.client.apply(job["id"], cv["id"] if cv else None)
    env.data["job"] = job
    return job


# ---------------------------------------------------------------- Thư mời ứng tuyển
class InvitationsPage(BasePage):
    PATH = "/invitations"
    URL_PATTERN = re.compile(r"/invitations")

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", name="Thư mời ứng tuyển", level=1)
        self.tabs = page.get_by_role("group", name="Lọc thư mời")
        self.cards = page.locator("article.invitation-card")
        self.empty = page.locator(".empty-state")
        self.dialog = ConfirmDialog(page)

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()
        expect(self.page.get_by_role("status", name="Đang tải thư mời")).to_have_count(0)


# ---------------------------------------------------------------- Yêu thích
class FavoritesPage(BasePage):
    PATH = "/favorites"
    URL_PATTERN = re.compile(r"/favorites")

    def __init__(self, page: Page, settings):
        super().__init__(page, settings)
        self.heading = page.get_by_role("heading", name="Yêu thích", level=1)
        self.tabs = page.get_by_role("group", name="Loại mục yêu thích")
        self.jobs = JobCards(page.locator("main"))
        self.companies = page.locator("main article.company-card, main .company-card")
        self.empty = page.locator(".empty-state")

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()
        expect(self.page.get_by_role("status", name="Đang tải danh sách yêu thích")).to_have_count(0)

    def tab(self, label: str) -> Locator:
        return self.tabs.get_by_role("button", name=re.compile(rf"^{label}"))
