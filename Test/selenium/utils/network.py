"""Đọc request/response của trình duyệt qua Chrome DevTools performance log.

Selenium không có `page.expect_response()` như Playwright. Driver được bật
`goog:loggingPrefs = {"performance": "ALL"}` (xem conftest.py) -> mỗi lần gọi `driver.get_log("performance")`
trả về các sự kiện Network.* kể từ lần đọc trước. NetworkMonitor gom lại thành danh sách request
(method, url, status) để:
  - chờ response của API đăng nhập rồi mới assert (wait_for_response)
  - đếm request vào nhóm API auth cho bộ điều tiết rate limit (drain_auth_requests)
Chỉ dùng được với trình duyệt nhân Chromium (Chrome, Edge).
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Callable

from selenium.common.exceptions import WebDriverException
from selenium.webdriver.remote.webdriver import WebDriver

from utils.rate_limit import is_auth_request


@dataclass
class NetworkCall:
    request_id: str
    method: str
    url: str
    status: int | None = None
    _body: str | None = None
    _driver: WebDriver | None = None

    @property
    def ok(self) -> bool:
        return self.status is not None and 200 <= self.status < 300

    def text(self) -> str:
        """Body của response (lấy qua CDP Network.getResponseBody, chỉ còn trong lúc trang chưa đổi)."""
        if self._body is None and self._driver is not None:
            try:
                self._body = self._driver.execute_cdp_cmd(
                    "Network.getResponseBody", {"requestId": self.request_id}
                ).get("body", "")
            except WebDriverException:
                self._body = "<không đọc được body>"
        return self._body or ""


class NetworkMonitor:
    def __init__(self, driver: WebDriver):
        self.driver = driver
        self.calls: dict[str, NetworkCall] = {}
        self._auth_counted: set[str] = set()

    def _drain(self) -> None:
        try:
            entries = self.driver.get_log("performance")
        except WebDriverException:
            return
        for entry in entries:
            msg = json.loads(entry["message"])["message"]
            method, params = msg.get("method"), msg.get("params", {})
            if method == "Network.requestWillBeSent":
                req = params["request"]
                self.calls[params["requestId"]] = NetworkCall(
                    params["requestId"], req["method"], req["url"], _driver=self.driver
                )
            elif method == "Network.responseReceived":
                call = self.calls.get(params["requestId"])
                if call is not None:
                    call.status = int(params["response"]["status"])

    def mark(self) -> set[str]:
        """Ghi nhận các request đã có -> wait_for_response chỉ xét request phát sinh sau thời điểm này."""
        self._drain()
        return set(self.calls)

    def wait_for_response(
        self, predicate: Callable[[NetworkCall], bool], since: set[str] | None = None, timeout: float = 15
    ) -> NetworkCall:
        since = since or set()
        deadline = time.monotonic() + timeout
        while True:
            self._drain()
            for rid, call in self.calls.items():
                if rid not in since and call.status is not None and predicate(call):
                    return call
            if time.monotonic() > deadline:
                raise AssertionError(f"Hết {timeout}s mà không có response phù hợp (đã ghi nhận {len(self.calls)} request)")
            time.sleep(0.1)  # chu kỳ poll log mạng, không phải chờ UI

    def drain_auth_requests(self) -> int:
        """Số request auth mới (POST login/register) kể từ lần gọi trước – để ghi vào rate limiter."""
        self._drain()
        new = [
            rid for rid, c in self.calls.items()
            if rid not in self._auth_counted and is_auth_request(c.url, c.method)
        ]
        self._auth_counted.update(new)
        return len(new)
