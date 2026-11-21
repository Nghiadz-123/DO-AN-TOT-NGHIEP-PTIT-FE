"""Gọi API backend để tạo / đọc tiền điều kiện cho test CV (không thao tác UI).

Endpoint (BE/backend/apps/cvs, candidates, applications, talents):
  candidate/cvs/                     GET danh sách | POST tải lên (multipart: file, title, is_default)
  candidate/cvs/{id}/                GET chi tiết | PATCH {title} | DELETE
  candidate/cvs/{id}/set-default/    POST
  candidate/cvs/{id}/file/           GET file (?download=1)
  candidate/cv-builder/              GET {content} | PUT {content}
  candidate/profile/                 GET | PATCH {is_public}
  candidate/applications/            POST {job_id, cv_id}
  employer/jobs/                     GET tin của công ty (NTD)
  employer/talents/{candidate_id}/cv/  GET CV chính của ứng viên công khai (NTD); 404 nếu không được xem
  employer/applications/{id}/cv/     GET CV đã nộp trong đơn (NTD)
"""
from __future__ import annotations

import re
import time
from dataclasses import dataclass, field

from playwright.sync_api import APIRequestContext, APIResponse

from utils.cv_files import CvFile
from utils.rate_limit import AuthRateLimiter

PARSE_DONE = ("completed", "failed")


def _filename(resp: APIResponse) -> str:
    """Tên file trong Content-Disposition (hỗ trợ filename*=UTF-8'')."""
    cd = resp.headers.get("content-disposition", "")
    m = re.search(r"filename\*=UTF-8''([^;]+)", cd) or re.search(r'filename="?([^";]+)"?', cd)
    if not m:
        return ""
    from urllib.parse import unquote

    return unquote(m.group(1))


def login(api: APIRequestContext, limiter: AuthRateLimiter, email: str, password: str) -> dict:
    limiter.ensure_capacity(1)
    limiter.record()
    resp = api.post("auth/login/", data={"email": email, "password": password})
    assert resp.ok, f"Đăng nhập API thất bại ({email}): {resp.status} {resp.text()}"
    return resp.json()


@dataclass
class ApiClient:
    """APIRequestContext + Bearer token của một tài khoản."""

    api: APIRequestContext
    access: str
    refresh: str = ""

    @property
    def headers(self) -> dict:
        return {"Authorization": f"Bearer {self.access}"}

    # Access token sống 30 phút; client dùng chung cả phiên chạy tự đăng nhập lại khi token hết hạn (401)
    def relogin(self) -> bool:
        email, password = getattr(self, "email", ""), getattr(self, "password", "")
        if not email or not password:
            return False
        resp = self.api.post("auth/login/", data={"email": email, "password": password})
        if not resp.ok:
            return False
        data = resp.json()
        self.access, self.refresh = data["access"], data.get("refresh", "")
        self._issued = time.monotonic()
        return True

    def _call(self, method: str, path: str, **kw) -> APIResponse:
        resp = getattr(self.api, method)(path, headers=self.headers, **kw)
        if resp.status == 401 and self.relogin():
            resp = getattr(self.api, method)(path, headers=self.headers, **kw)
        return resp

    def get(self, path: str, **kw) -> APIResponse:
        return self._call("get", path, **kw)

    def post(self, path: str, **kw) -> APIResponse:
        return self._call("post", path, **kw)

    def patch(self, path: str, **kw) -> APIResponse:
        return self._call("patch", path, **kw)

    def put(self, path: str, **kw) -> APIResponse:
        return self._call("put", path, **kw)

    def delete(self, path: str, **kw) -> APIResponse:
        return self._call("delete", path, **kw)

    @staticmethod
    def json_ok(resp: APIResponse, what: str):
        assert resp.ok, f"{what}: {resp.status} {resp.text()[:500]}"
        return resp.json() if resp.status != 204 else None


@dataclass
class CandidateClient(ApiClient):
    email: str = ""
    password: str = ""
    full_name: str = ""
    cvs: list[dict] = field(default_factory=list)  # CV đã tạo sẵn (theo thứ tự tạo)

    # ---------- CV ----------
    def list_cvs(self) -> list[dict]:
        return self.json_ok(self.get("candidate/cvs/"), "Lấy danh sách CV")

    def get_cv_raw(self, cv_id: str) -> APIResponse:
        return self.get(f"candidate/cvs/{cv_id}/")

    def get_cv(self, cv_id: str) -> dict:
        return self.json_ok(self.get_cv_raw(cv_id), "Lấy chi tiết CV")

    def upload_cv(self, file: CvFile, title: str = "", is_default: bool = False, wait: bool = True) -> dict:
        resp = self.post(
            "candidate/cvs/",
            multipart={"file": file.payload(), "title": title, "is_default": "true" if is_default else "false"},
        )
        cv = self.json_ok(resp, f"Tải lên CV {file.name}")
        if wait:
            cv = self.wait_parsed(cv["id"])
        self.cvs.append(cv)
        return cv

    def wait_parsed(self, cv_id: str, timeout_s: float = 30) -> dict:
        """Chờ backend bóc tách xong (parse_status completed | failed)."""
        deadline = time.monotonic() + timeout_s
        while True:
            cv = self.get_cv(cv_id)
            if cv["parse_status"] in PARSE_DONE or time.monotonic() > deadline:
                return cv
            time.sleep(0.5)  # polling API (không phải chờ UI)

    def rename_cv(self, cv_id: str, title: str) -> dict:
        return self.json_ok(self.patch(f"candidate/cvs/{cv_id}/", data={"title": title}), "Đổi tên CV")

    def set_default(self, cv_id: str) -> dict:
        return self.json_ok(self.post(f"candidate/cvs/{cv_id}/set-default/"), "Đặt CV chính")

    def delete_cv(self, cv_id: str) -> None:
        self.json_ok(self.delete(f"candidate/cvs/{cv_id}/"), "Xóa CV")

    def cv_file(self, cv_id: str, download: bool = False) -> APIResponse:
        return self.get(f"candidate/cvs/{cv_id}/file/", params={"download": 1} if download else None)

    def default_cv(self) -> dict | None:
        return next((c for c in self.list_cvs() if c["is_default"]), None)

    # ---------- Hồ sơ ----------
    def profile(self) -> dict:
        return self.json_ok(self.get("candidate/profile/"), "Lấy hồ sơ ứng viên")

    def set_public(self, value: bool) -> dict:
        return self.json_ok(self.patch("candidate/profile/", data={"is_public": value}), "Bật/tắt công khai CV")

    # ---------- Tạo CV (CV builder) ----------
    def builder_content(self) -> dict | None:
        return self.json_ok(self.get("candidate/cv-builder/"), "Lấy CV tự tạo").get("content")

    def builder_save(self, content: dict) -> dict:
        return self.json_ok(self.put("candidate/cv-builder/", data={"content": content}), "Lưu CV tự tạo")

    # ---------- Ứng tuyển ----------
    def apply(self, job_id: str, cv_id: str | None = None, cover_letter: str = "") -> dict:
        data = {"job_id": job_id, "cover_letter": cover_letter}
        if cv_id:
            data["cv_id"] = cv_id
        return self.json_ok(self.post("candidate/applications/", data=data), "Nộp đơn ứng tuyển")


@dataclass
class RecruiterClient(ApiClient):
    def published_job_id(self) -> str | None:
        data = self.json_ok(self.get("employer/jobs/", params={"status": "published"}), "Lấy tin tuyển dụng của NTD")
        jobs = data["results"] if isinstance(data, dict) else data
        open_jobs = [j for j in jobs if j.get("status") == "published"]
        return open_jobs[0]["id"] if open_jobs else None

    def talent_cv(self, candidate_id: str) -> tuple[int, str]:
        """(status, tên file) CV chính của ứng viên mà NTD xem được ở Tìm ứng viên."""
        resp = self.get(f"employer/talents/{candidate_id}/cv/")
        return resp.status, _filename(resp) if resp.ok else ""

    def application_cv(self, application_id: str) -> tuple[int, str]:
        resp = self.get(f"employer/applications/{application_id}/cv/")
        return resp.status, _filename(resp) if resp.ok else ""
