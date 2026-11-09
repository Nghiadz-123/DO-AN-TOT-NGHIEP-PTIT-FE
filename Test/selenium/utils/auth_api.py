"""Gọi API auth của backend (requests) để tạo tiền điều kiện: tài khoản mới, đổi mật khẩu."""
from __future__ import annotations

import requests

from utils.rate_limit import AuthRateLimiter

TIMEOUT_S = 15


def register_candidate(
    api_url: str, limiter: AuthRateLimiter, email: str, password: str, full_name: str = "Auto Test"
) -> dict:
    """Tạo tài khoản ứng viên, trả về session {access, refresh, user}."""
    limiter.ensure_capacity(1)
    limiter.record()
    resp = requests.post(
        f"{api_url}/candidate/register/",
        json={"full_name": full_name, "email": email, "password": password},
        timeout=TIMEOUT_S,
    )
    assert resp.ok, f"Không tạo được tài khoản test {email}: {resp.status_code} {resp.text}"
    return resp.json()


def change_password(api_url: str, access: str, current: str, new: str) -> None:
    resp = requests.post(
        f"{api_url}/auth/change-password/",
        json={"current_password": current, "new_password": new},
        headers={"Authorization": f"Bearer {access}"},
        timeout=TIMEOUT_S,
    )
    assert resp.ok, f"Không đổi được mật khẩu: {resp.status_code} {resp.text}"
