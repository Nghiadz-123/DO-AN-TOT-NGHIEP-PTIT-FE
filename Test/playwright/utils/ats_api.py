"""Gọi API backend để tạo / đọc tiền điều kiện cho các màn hình ngoài CV (không thao tác UI).

Endpoint (BE/backend/apps/*/urls.py):
  employer/register/                       POST tạo NTD + công ty, trả session
  employer/profile/  employer/company/     GET | PATCH
  employer/company/logo/                   POST (multipart logo) | DELETE
  employer/jobs/                           GET | POST ; {id}/ PATCH | DELETE ; {id}/publish|pause|close/ POST
  employer/applications/                   GET ; {id}/status/ POST {status, note, rejection_reason} ; {id}/ PATCH
  employer/dashboard/                      GET
  candidate/applications/                  GET | POST ; {id}/withdraw/ POST {reason}
  candidate/favorites/jobs|companies/      GET | POST ; {id}/ DELETE
  jobs/  companies/  catalog/locations|industries/   công khai
  admin/overview|users|companies|jobs/     GET ; {id}/ PATCH
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta

from playwright.sync_api import APIRequestContext

from utils.cv_api import ApiClient, CandidateClient, RecruiterClient, login
from utils.helpers import unique_suffix
from utils.rate_limit import AuthRateLimiter

PASSWORD = "Auto@12345"


def results(data) -> list[dict]:
    """Danh sách bản ghi của response phân trang ({results: [...]}) hoặc mảng."""
    return data["results"] if isinstance(data, dict) and "results" in data else data


# ---------------------------------------------------------------- công khai
@dataclass
class PublicApi:
    api: APIRequestContext

    def _json(self, path: str, params: dict | None = None):
        params = {k: v for k, v in (params or {}).items() if v not in (None, "")}
        resp = self.api.get(path, params=params)
        assert resp.ok, f"GET {path}: {resp.status} {resp.text()[:300]}"
        return resp.json()

    def jobs(self, **params) -> dict:
        return self._json("jobs/", params)

    def job(self, job_id: str) -> dict:
        return self._json(f"jobs/{job_id}/")

    def companies(self, **params) -> dict:
        return self._json("companies/", params)

    def locations(self) -> list[dict]:
        return results(self._json("catalog/locations/"))

    def industries(self) -> list[dict]:
        return results(self._json("catalog/industries/"))


# ---------------------------------------------------------------- nhà tuyển dụng
def register_employer(api: APIRequestContext, limiter: AuthRateLimiter, *, email: str, password: str = PASSWORD,
                      full_name: str = "Auto Recruiter", company_name: str | None = None) -> dict:
    limiter.ensure_capacity(1)
    limiter.record()
    resp = api.post("employer/register/", data={
        "full_name": full_name, "email": email, "password": password,
        "company_name": company_name or f"Công ty Auto {unique_suffix()}", "position": "HR",
    })
    assert resp.ok, f"Không tạo được NTD test {email}: {resp.status} {resp.text()}"
    return resp.json()


@dataclass
class EmployerClient(RecruiterClient):
    email: str = ""
    password: str = ""
    full_name: str = ""
    jobs: list[dict] = field(default_factory=list)

    # ---------- hồ sơ / công ty
    def profile(self) -> dict:
        return self.json_ok(self.get("employer/profile/"), "Lấy hồ sơ NTD")

    def update_profile(self, **data) -> dict:
        return self.json_ok(self.patch("employer/profile/", data=data), "Cập nhật hồ sơ NTD")

    def company(self) -> dict:
        return self.json_ok(self.get("employer/company/"), "Lấy hồ sơ công ty")

    def update_company(self, **data) -> dict:
        return self.json_ok(self.patch("employer/company/", data=data), "Cập nhật hồ sơ công ty")

    # ---------- tin tuyển dụng
    def job_payload(self, public: PublicApi, **overrides) -> dict:
        locations, industries = public.locations(), public.industries()
        payload = {
            "title": f"Auto Job {unique_suffix()}",
            "description": "Mô tả công việc kiểm thử tự động",
            "requirements": "Yêu cầu 1\nYêu cầu 2",
            "benefits": "Quyền lợi 1",
            "job_type": "full_time", "work_mode": "onsite", "level": "staff",
            "min_years_experience": 0, "headcount": 1,
            "salary_min": 10_000_000, "salary_max": 20_000_000, "is_salary_negotiable": False,
            "location_id": locations[0]["id"] if locations else None,
            "industry_id": industries[0]["id"] if industries else None,
            "address": "1 Đường Kiểm Thử",
            "deadline": (date.today() + timedelta(days=30)).isoformat(),
            "skills": [{"name": "Python"}],
            "status": "published",
        }
        payload.update(overrides)
        return payload

    def create_job(self, public: PublicApi, **overrides) -> dict:
        job = self.json_ok(self.post("employer/jobs/", data=self.job_payload(public, **overrides)), "Tạo tin tuyển dụng")
        self.jobs.append(job)
        return job

    def job(self, job_id: str) -> dict:
        return self.json_ok(self.get(f"employer/jobs/{job_id}/"), "Lấy chi tiết tin")

    def my_jobs(self, **params) -> dict:
        return self.json_ok(self.get("employer/jobs/", params=params), "Lấy danh sách tin")

    def job_action(self, job_id: str, action: str) -> dict:
        return self.json_ok(self.post(f"employer/jobs/{job_id}/{action}/"), f"Tin {action}")

    def delete_job(self, job_id: str) -> None:
        self.json_ok(self.delete(f"employer/jobs/{job_id}/"), "Xóa tin")

    # ---------- hồ sơ ứng tuyển
    def applications(self, **params) -> dict:
        return self.json_ok(self.get("employer/applications/", params=params), "Lấy danh sách hồ sơ")

    def application(self, app_id: str) -> dict:
        return self.json_ok(self.get(f"employer/applications/{app_id}/"), "Lấy chi tiết hồ sơ")

    def change_status(self, app_id: str, status: str, note: str = "", rejection_reason: str = "") -> dict:
        resp = self.post(f"employer/applications/{app_id}/status/",
                         data={"status": status, "note": note, "rejection_reason": rejection_reason})
        return self.json_ok(resp, f"Chuyển hồ sơ sang {status}")

    def dashboard(self) -> dict:
        return self.json_ok(self.get("employer/dashboard/"), "Lấy dashboard NTD")


# ---------------------------------------------------------------- ứng viên (bổ sung cho CandidateClient)
@dataclass
class CandidateActions:
    """Thao tác ứng tuyển / yêu thích của ứng viên (dùng chung token với CandidateClient)."""

    client: CandidateClient

    def applications(self) -> list[dict]:
        return results(self.client.json_ok(self.client.get("candidate/applications/", params={"page_size": 100}),
                                           "Lấy đơn ứng tuyển"))

    def withdraw(self, app_id: str, reason: str = ""):
        return self.client.post(f"candidate/applications/{app_id}/withdraw/", data={"reason": reason})

    def favorite_job(self, job_id: str) -> None:
        self.client.json_ok(self.client.post("candidate/favorites/jobs/", data={"job_id": job_id}), "Lưu việc làm")

    def favorite_company(self, company_id: str) -> None:
        self.client.json_ok(self.client.post("candidate/favorites/companies/", data={"company_id": company_id}),
                            "Lưu công ty")

    def favorite_jobs(self) -> list[dict]:
        return results(self.client.json_ok(self.client.get("candidate/favorites/jobs/"), "Lấy việc làm yêu thích"))

    def update_profile(self, **data) -> dict:
        return self.client.json_ok(self.client.patch("candidate/profile/", data=data), "Cập nhật hồ sơ ứng viên")


# ---------------------------------------------------------------- admin
@dataclass
class AdminClient(ApiClient):
    def overview(self) -> dict:
        return self.json_ok(self.get("admin/overview/"), "Lấy tổng quan")

    def users(self, **params) -> dict:
        return self.json_ok(self.get("admin/users/", params=params), "Lấy người dùng")

    def update_user(self, user_id: str, **data) -> dict:
        return self.json_ok(self.patch(f"admin/users/{user_id}/", data=data), "Cập nhật người dùng")

    def companies(self, **params) -> dict:
        return self.json_ok(self.get("admin/companies/", params=params), "Lấy doanh nghiệp")

    def update_company(self, company_id: str, **data) -> dict:
        return self.json_ok(self.patch(f"admin/companies/{company_id}/", data=data), "Cập nhật doanh nghiệp")

    def jobs(self, **params) -> dict:
        return self.json_ok(self.get("admin/jobs/", params=params), "Lấy tin tuyển dụng")

    def update_job(self, job_id: str, **data) -> dict:
        return self.json_ok(self.patch(f"admin/jobs/{job_id}/", data=data), "Cập nhật tin tuyển dụng")


def login_admin(api: APIRequestContext, limiter: AuthRateLimiter, email: str, password: str) -> AdminClient:
    session = login(api, limiter, email, password)
    client = AdminClient(api, session["access"], session.get("refresh", ""))
    client.email, client.password = email, password  # để tự đăng nhập lại khi token hết hạn
    return client
