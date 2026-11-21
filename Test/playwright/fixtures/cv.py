"""Fixture cho bộ test CV (CV của tôi, Tải lên CV, Tạo CV, Chấm điểm & gợi ý sửa CV).

Nguyên tắc dữ liệu:
- Không dùng tài khoản demo cho thao tác làm thay đổi dữ liệu: mỗi test (hoặc mỗi module với test chỉ đọc)
  tạo một tài khoản ứng viên mới qua API rồi tải CV mẫu qua API -> test độc lập, chạy lại được.
- Đăng nhập trình duyệt bằng cách đặt token vào sessionStorage (FE lưu token ở đây – utils/storage.js)
  thay vì đi qua màn hình Đăng nhập: tiết kiệm lượt gọi API auth (backend giới hạn 20 request/phút).
"""
from __future__ import annotations

import json
import time

import pytest
from playwright.sync_api import Page, Playwright

from utils.auth_api import register_candidate
from utils.cv_api import CandidateClient, RecruiterClient, login
from utils.cv_files import docx_cv, pdf_cv
from utils.data_loader import load_test_data
from utils.helpers import unique_email


@pytest.fixture(scope="session")
def cv_data() -> dict:
    return load_test_data("cv.json")


@pytest.fixture(scope="session")
def api_request(playwright: Playwright, settings):
    ctx = playwright.request.new_context(
        base_url=f"{settings.api_url}/", ignore_https_errors=settings.ignore_https_errors, timeout=settings.timeout_ms
    )
    yield ctx
    ctx.dispose()


# ---------------------------------------------------------------- tài khoản ứng viên
@pytest.fixture(scope="session")
def candidate_factory(api_request, auth_limiter, cv_data):
    """Tạo tài khoản ứng viên mới: candidate_factory(cvs=["pdf", "docx"]) -> CandidateClient.

    cvs: danh sách CV tải sẵn theo thứ tự ("pdf" | "docx"); CV đầu tiên tự động là CV chính.
    """

    def _create(cvs: tuple[str, ...] | list[str] = ()) -> CandidateClient:
        acc = cv_data["account"]
        email = unique_email("auto.cv")
        session = register_candidate(api_request, auth_limiter, email, acc["password"], acc["full_name"])
        client = CandidateClient(
            api_request, session["access"], session.get("refresh", ""),
            email=email, password=acc["password"], full_name=acc["full_name"],
        )
        for i, kind in enumerate(cvs, start=1):
            file = pdf_cv() if kind == "pdf" else docx_cv()
            client.upload_cv(file, title=cv_data["seed_titles"][kind].format(n=i))
        return client

    return _create


@pytest.fixture
def candidate(candidate_factory) -> CandidateClient:
    """Ứng viên mới, chưa có CV."""
    return candidate_factory()


@pytest.fixture
def candidate_with_cvs(candidate_factory) -> CandidateClient:
    """Ứng viên mới có 2 CV: [0] PDF (CV chính), [1] DOCX."""
    return candidate_factory(["pdf", "docx"])


@pytest.fixture(scope="module")
def shared_candidate(candidate_factory) -> CandidateClient:
    """Ứng viên có 2 CV dùng chung cho các test CHỈ ĐỌC trong một module (không được sửa dữ liệu)."""
    return candidate_factory(["pdf", "docx"])


# ---------------------------------------------------------------- đăng nhập trình duyệt
def _seed_tokens_script(access: str, refresh: str) -> str:
    # Chỉ đặt token ở lần tải trang đầu tiên của tab: test đăng xuất / làm hết hạn token vẫn giữ được trạng thái
    return (
        "if (!sessionStorage.getItem('__auto_seeded')) {"
        f"sessionStorage.setItem('access_token', {json.dumps(access)});"
        f"sessionStorage.setItem('refresh_token', {json.dumps(refresh)});"
        "sessionStorage.setItem('__auto_seeded', '1');}"
    )


@pytest.fixture
def login_as(page: Page):
    """login_as(client) -> page đã đăng nhập bằng tài khoản của client (gọi trước page.goto)."""

    def _login(client) -> Page:
        # Token cũ (> 15 phút, access sống 30 phút): lấy cặp token mới. Trong 15 phút trình duyệt không cần refresh
        # nên refresh token (bị xoay vòng + blacklist khi dùng) vẫn còn hiệu lực cho lần dùng lại.
        issued = getattr(client, "_issued", None)
        if issued is None:
            client._issued = time.monotonic()
        elif time.monotonic() - issued > 15 * 60 and hasattr(client, "relogin"):
            client.relogin()
        page.add_init_script(_seed_tokens_script(client.access, client.refresh))
        return page

    return _login


# ---------------------------------------------------------------- nhà tuyển dụng
@pytest.fixture(scope="session")
def recruiter(api_request, auth_limiter, accounts) -> RecruiterClient:
    acc = accounts("recruiter")
    session = login(api_request, auth_limiter, acc["email"], acc["password"])
    return RecruiterClient(api_request, session["access"], session.get("refresh", ""))


@pytest.fixture(scope="session")
def recruiter_job_id(recruiter) -> str:
    """Tin đang tuyển của NTD demo – dùng để ứng tuyển và kiểm tra NTD xem được CV đã nộp."""
    job_id = recruiter.published_job_id()
    if not job_id:
        pytest.fail("NTD demo chưa có tin đang tuyển (published). Chạy: python manage.py seed_demo", pytrace=False)
    return job_id


# ---------------------------------------------------------------- AI
@pytest.fixture(scope="session")
def ai_available(candidate_factory):
    """Bỏ qua test cần AI thật khi backend chưa bật API AI (lỗi môi trường, không phải lỗi test)."""
    client = candidate_factory()
    resp = client.get("candidate/cv-analyses/")
    if resp.status == 404:
        pytest.skip(
            "MÔI TRƯỜNG: backend chưa bật API AI (GET /candidate/cv-analyses/ trả 404 – "
            "BE/backend/apps/ai/urls.py, views.py đang rỗng và config/api_urls.py chưa include apps.ai.urls)."
        )
    return True
