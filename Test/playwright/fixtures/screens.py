"""Fixture cho engine test chung và các test màn hình ngoài CV.

- Tài khoản theo vai trò: ứng viên / NTD tạo mới qua API (không đụng tài khoản demo), admin dùng ADMIN_EMAIL.
- `screen_env(screen_key)`: đăng nhập đúng vai trò (token -> sessionStorage) và trả về ScreenEnv để mở màn hình.
  Tài khoản được dùng lại theo màn hình trong cả phiên chạy (giới hạn 20 request/phút của API auth);
  test làm thay đổi dữ liệu nghiệp vụ dùng `fresh=True`.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

import pytest
from playwright.sync_api import Page

from specs.model import ADMIN, CANDIDATE, EMPLOYER
from utils.ats_api import PASSWORD, AdminClient, CandidateActions, EmployerClient, PublicApi, login_admin, register_employer
from utils.cv_api import login
from utils.helpers import unique_email


@pytest.fixture(scope="session")
def public_api(api_request) -> PublicApi:
    return PublicApi(api_request)


@pytest.fixture(scope="session")
def employer_factory(api_request, auth_limiter):
    """Tạo NTD mới (kèm công ty) qua API: employer_factory() -> EmployerClient."""

    def _create(company_name: str | None = None, full_name: str = "Auto Recruiter") -> EmployerClient:
        email = unique_email("auto.ntd")
        session = register_employer(api_request, auth_limiter, email=email, full_name=full_name,
                                    company_name=company_name)
        return EmployerClient(api_request, session["access"], session.get("refresh", ""),
                              email=email, password=PASSWORD, full_name=full_name)

    return _create


@pytest.fixture(scope="session")
def admin_client(api_request, auth_limiter, accounts) -> AdminClient:
    acc = accounts("admin")
    return login_admin(api_request, auth_limiter, acc["email"], acc["password"])


@pytest.fixture(scope="session")
def admin_credentials(accounts) -> dict:
    return accounts("admin")


@pytest.fixture(scope="session")
def shared_employer(employer_factory, public_api) -> EmployerClient:
    """NTD dùng chung (chỉ đọc) có 1 tin đang tuyển – cho màn hình công khai (chi tiết tin, công ty...)."""
    emp = employer_factory(company_name="Công ty Auto Dùng Chung")
    emp.create_job(public_api, title="Auto Chuyên viên kiểm thử phần mềm")
    return emp


@pytest.fixture(scope="session")
def shared_applicant(candidate_factory):
    """Ứng viên có 1 CV (PDF) dùng chung để nộp đơn vào các tin test (giới hạn backend: 30 lượt tải CV/giờ)."""
    return candidate_factory(["pdf"])


@dataclass
class ScreenEnv:
    """Ngữ cảnh mở 1 màn hình: trang, tài khoản đăng nhập, API công khai, dữ liệu chuẩn bị."""

    page: Page
    settings: Any
    screen: Any
    client: Any = None                    # CandidateClient | EmployerClient | AdminClient | None (khách)
    public: PublicApi | None = None
    data: dict = field(default_factory=dict)
    fixtures: Any = None                  # request.getfixturevalue

    def open(self, **kwargs):
        po = self.screen.page(self.page, self.settings, self)
        po.open(**kwargs)
        return po

    def make(self):
        """Page Object chưa mở trang (khi test tự điều hướng)."""
        return self.screen.page(self.page, self.settings, self)

    @property
    def candidate(self) -> CandidateActions:
        return CandidateActions(self.client)


@pytest.fixture(scope="session")
def _account_cache() -> dict:
    return {}


# Access token sống 30 phút; refresh token bị xoay vòng + blacklist sau khi trình duyệt dùng.
# Tài khoản dùng lại lâu hơn ngưỡng này được đăng nhập lại qua API để lấy cặp token mới.
TOKEN_MAX_AGE_S = 15 * 60


def _fresh_tokens(client, api_request, auth_limiter, admin_credentials=None) -> None:
    issued = getattr(client, "_issued", None)
    if issued is None:
        client._issued = time.monotonic()
        return
    if time.monotonic() - issued < TOKEN_MAX_AGE_S:
        return
    email = getattr(client, "email", "") or (admin_credentials or {}).get("email")
    password = getattr(client, "password", "") or (admin_credentials or {}).get("password")
    session = login(api_request, auth_limiter, email, password)
    client.access, client.refresh = session["access"], session.get("refresh", "")
    client._issued = time.monotonic()


@pytest.fixture
def account_for(candidate_factory, employer_factory, admin_client, _account_cache, api_request, auth_limiter,
                admin_credentials):
    """account_for(role, key=None, fresh=False) -> client (dùng lại theo key trong phiên chạy)."""

    def _get(role: str, key: str | None = None, fresh: bool = False, cvs: tuple = ()):
        cache_key = (role, key, cvs)
        if not fresh and cache_key in _account_cache:
            client = _account_cache[cache_key]
            _fresh_tokens(client, api_request, auth_limiter, admin_credentials if role == ADMIN else None)
            return client
        if role == CANDIDATE:
            client = candidate_factory(list(cvs))
        elif role == EMPLOYER:
            client = employer_factory()
        elif role == ADMIN:
            client = admin_client
        else:
            client = None
        if client is not None:
            client._issued = getattr(client, "_issued", None) or time.monotonic()
        if not fresh:
            _account_cache[cache_key] = client
        return client

    return _get


@pytest.fixture
def screen_env(page: Page, settings, login_as, account_for, public_api, request):
    """screen_env(screen, fresh=False, client=None, cvs=()) -> ScreenEnv đã đăng nhập đúng vai trò của màn hình."""

    def _make(screen, *, fresh: bool = False, client=None, cvs: tuple = ()) -> ScreenEnv:
        if screen.env_missing:
            pytest.skip(f"MÔI TRƯỜNG: {screen.env_missing}")
        cvs = cvs or getattr(screen, "cvs", ())
        if client is None and screen.role:
            client = account_for(screen.role, screen.key, fresh or screen.fresh, cvs)
        if client is not None:
            login_as(client)
        env = ScreenEnv(page, settings, screen, client, public_api, fixtures=request.getfixturevalue)
        if screen.prepare:
            screen.prepare(env)
        return env

    return _make


@pytest.fixture
def login_role(login_as, account_for):
    """login_role(role) -> client của vai trò (đăng nhập trình duyệt bằng token, dùng lại tài khoản)."""

    def _login(role: str):
        client = account_for(role, "__login_role__")
        login_as(client)
        return client

    return _login


def relogin(api_request, auth_limiter, client) -> None:
    """Lấy token mới cho client (sau khi đổi mật khẩu...)."""
    session = login(api_request, auth_limiter, client.email, client.password)
    client.access, client.refresh = session["access"], session.get("refresh", "")
