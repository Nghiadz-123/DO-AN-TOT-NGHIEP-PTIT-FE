"""Gọi API auth của backend để tạo tiền điều kiện (tài khoản có sẵn, đổi mật khẩu...)."""
from __future__ import annotations

from playwright.sync_api import APIRequestContext

from utils.rate_limit import AuthRateLimiter


def register_candidate(
    api: APIRequestContext, limiter: AuthRateLimiter, email: str, password: str, full_name: str = "Auto Test"
) -> dict:
    """Tạo tài khoản ứng viên, trả về session {access, refresh, user}."""
    limiter.ensure_capacity(1)
    limiter.record()
    resp = api.post("candidate/register/", data={"full_name": full_name, "email": email, "password": password})
    assert resp.ok, f"Không tạo được tài khoản test {email}: {resp.status} {resp.text()}"
    return resp.json()


def change_password(api: APIRequestContext, access: str, current: str, new: str) -> None:
    resp = api.post(
        "auth/change-password/",
        data={"current_password": current, "new_password": new},
        headers={"Authorization": f"Bearer {access}"},
    )
    assert resp.ok, f"Không đổi được mật khẩu: {resp.status} {resp.text()}"
