"""Điều tiết số request tới nhóm API auth để không bị backend chặn (HTTP 429).

Backend Smart ATS: ScopedRateThrottle scope 'auth' = 20 request/phút/IP, dùng chung cho
/auth/login/, /candidate/register/, /employer/register/ (BE/backend/config/settings/base.py).

Đây là chờ có chủ đích theo giới hạn tốc độ của server, KHÔNG phải chờ UI: trước mỗi test,
nếu trong 60 giây gần nhất đã gửi gần đủ giới hạn thì chờ tới khi có chỗ trống.
"""
from __future__ import annotations

import time
from collections import deque

from utils.logger import get_logger

AUTH_PATHS = ("/auth/login/", "/candidate/register/", "/employer/register/")


def is_auth_request(url: str, method: str) -> bool:
    return method == "POST" and any(p in url for p in AUTH_PATHS)


class AuthRateLimiter:
    def __init__(self, limit_per_min: int, window_s: float = 60.0):
        self.limit = limit_per_min
        self.window = window_s
        self._calls: deque[float] = deque()
        self.log = get_logger("AuthRateLimiter")

    @property
    def enabled(self) -> bool:
        return self.limit > 0

    def record(self) -> None:
        self._calls.append(time.monotonic())

    def _purge(self) -> None:
        now = time.monotonic()
        while self._calls and now - self._calls[0] >= self.window:
            self._calls.popleft()

    def ensure_capacity(self, needed: int) -> None:
        """Chờ tới khi gửi thêm `needed` request mà vẫn dưới giới hạn."""
        if not self.enabled:
            return
        self._purge()
        while len(self._calls) + needed > self.limit:
            wait = self._calls[0] + self.window - time.monotonic() + 0.5
            self.log.info("Gần chạm giới hạn %s request/phút của API auth, chờ %.1fs", self.limit, wait)
            time.sleep(max(wait, 0))
            self._purge()
