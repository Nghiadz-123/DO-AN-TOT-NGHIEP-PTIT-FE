"""Page Object màn hình "AI chấm điểm & gợi ý sửa CV" (route /cv-analysis?cvId=..&tab=score|suggestions|profile).

Locator lấy từ FE/frontend/src/pages/Candidate/CVAnalysisPage.jsx + components/cv/*.jsx:
  <h1>AI chấm điểm & gợi ý sửa CV</h1>  <a>Tạo CV mới</a>
  lỗi: <div class="alert alert-error" role="alert">
  aside: <h2>Tải CV lên</h2> FileDropzone hint "PDF, DOCX · tối đa 5MB" | Loading "Đang tải lên và đọc CV..."
         <h2>Danh sách CV <span class="badge">{n}</span></h2> "Bạn chưa tải CV nào."
         <li class="cv-item [selected]"><button class="cv-item-select" aria-current><strong>{title}</strong>
             ScoreCircle (svg role=img aria-label="{score}/100 điểm, ...") | <span class="cv-item-status">Chưa chấm|..</span>
             <button aria-label="Xóa CV {title}">
  panel: EmptyState "Chưa có CV để phân tích" | <h2 id="ai-cv-title">{title}</h2>
         CVNotReady: alert-info "Hệ thống đang đọc nội dung CV..." | alert-error "Chưa đọc được nội dung CV này..."
         <div role="tablist" aria-label="Kết quả AI"> role=tab: Chấm điểm | Gợi ý sửa CV | Thông tin AI trích xuất
         <div role="tabpanel">
            AiProgress role=status: "AI đang chấm điểm CV, ..." | "AI đang đối chiếu CV ..."
            EmptyState "CV chưa được chấm điểm" + <button>Chấm điểm bằng AI</button>; "Chưa có gợi ý" + <button>Gợi ý sửa CV</button>
            CVScoreResult: ScoreCircle tổng, <ul aria-label="Điểm theo tiêu chí"> li: tên + "{score}/{max}",
                           h3 "Điểm mạnh", h3 "Điểm cần cải thiện"
            CVSuggestionList: <ol class="suggestions"><li class="suggestion"> Badge mức ưu tiên, .suggestion-section,
                           h3.suggestion-issue, p, "Hiện tại"/"Nên sửa thành"
            "Chưa có thông tin trích xuất" | CVParsedInfo (.cv-parsed)
"""
from __future__ import annotations

import re

from playwright.sync_api import Locator, expect

from pages.base_page import BasePage
from pages.components import AppShell, ConfirmDialog, FileDropzone


class CVAnalysisPage(BasePage):
    PATH = "/cv-analysis"
    URL_PATTERN = re.compile(r".*/cv-analysis/?(\?.*)?$")

    def __init__(self, page, settings):
        super().__init__(page, settings)
        self.shell = AppShell(page)
        self.heading = page.get_by_role("heading", name="AI chấm điểm & gợi ý sửa CV", level=1)
        self.action_error = page.locator(".page-header ~ .alert-error[role='alert']")
        self.skeleton = page.get_by_role("status", name="Đang tải danh sách CV")
        self.upload_section = page.locator("section.card").filter(has=page.get_by_role("heading", name="Tải CV lên"))
        self.dropzone = FileDropzone(self.upload_section, page)
        self.dropzone_hint = self.upload_section.locator(".dropzone-hint")
        self.list_section = page.locator("section.card").filter(has=page.get_by_role("heading", name=re.compile("^Danh sách CV")))
        self.list_count = self.list_section.locator("h2 .badge")
        self.no_cv_text = self.list_section.get_by_text("Bạn chưa tải CV nào.", exact=True)
        self.items = self.list_section.locator("li.cv-item")
        self.empty_panel_title = page.get_by_role("heading", name="Chưa có CV để phân tích")
        self.empty_panel = page.locator(".empty-state").filter(has=self.empty_panel_title)
        self.selected_title = page.locator("#ai-cv-title")
        self.not_ready = page.locator(".cv-panel-head ~ .alert")
        self.tablist = page.get_by_role("tablist", name="Kết quả AI")
        self.tabpanel = page.get_by_role("tabpanel")
        self.ai_progress = self.tabpanel.locator(".ai-progress")
        self.score_button = self.tabpanel.get_by_role("button", name="Chấm điểm bằng AI")
        self.rescore_button = self.tabpanel.get_by_role("button", name="Chấm điểm lại")
        self.suggest_button = self.tabpanel.get_by_role("button", name="Gợi ý sửa CV")
        self.total_score = self.tabpanel.locator(".score-overview-total svg[role='img']")
        self.criteria = self.tabpanel.get_by_role("list", name="Điểm theo tiêu chí").locator("li")
        self.strengths = self.tabpanel.locator("section").filter(has=page.get_by_role("heading", name="Điểm mạnh"))
        self.weaknesses = self.tabpanel.locator("section").filter(
            has=page.get_by_role("heading", name="Điểm cần cải thiện")
        )
        self.suggestions = self.tabpanel.locator("ol.suggestions > li")
        self.parsed_info = self.tabpanel.locator(".cv-parsed")
        self.dialog = ConfirmDialog(page)

    def expect_loaded(self) -> None:
        super().expect_loaded()
        expect(self.heading).to_be_visible()

    def open_cv(self, cv_id: str | None = None, tab: str | None = None):
        params = "&".join(f"{k}={v}" for k, v in (("cvId", cv_id), ("tab", tab)) if v)
        self.page.goto(f"{self.settings.base_url}{self.PATH}{'?' + params if params else ''}", wait_until="domcontentloaded")
        self.expect_loaded()
        return self

    # ---------- Danh sách CV ----------
    def item(self, title: str) -> Locator:
        return self.items.filter(has=self.page.locator("strong").get_by_text(title, exact=True))

    def item_status(self, title: str) -> Locator:
        return self.item(title).locator(".cv-item-status")

    def item_score(self, title: str) -> Locator:
        return self.item(title).locator("svg[role='img']")

    def select(self, title: str) -> None:
        self.item(title).locator("button.cv-item-select").click()
        expect(self.selected_title).to_have_text(title)

    def delete_button(self, title: str) -> Locator:
        return self.list_section.get_by_role("button", name=f"Xóa CV {title}", exact=True)

    # ---------- Tab ----------
    def tab(self, name: str) -> Locator:
        return self.tablist.get_by_role("tab", name=name, exact=True)

    def open_tab(self, name: str) -> None:
        self.tab(name).click()
        expect(self.tab(name)).to_have_attribute("aria-selected", "true")

    def empty_heading(self, text: str) -> Locator:
        return self.tabpanel.get_by_role("heading", name=text)
