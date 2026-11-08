"""Quản lý cấu hình môi trường.

Thứ tự ưu tiên giá trị: biến môi trường > config/environments.yaml > mặc định.
Secret (username/password/token) chỉ đọc từ biến môi trường hoặc file .env (không commit).
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT_DIR / "config" / "environments.yaml"

load_dotenv(ROOT_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    env_name: str
    base_url: str
    api_url: str
    timeout_ms: int = 15_000
    navigation_timeout_ms: int = 30_000
    expect_timeout_ms: int = 10_000
    viewport: dict = field(default_factory=lambda: {"width": 1366, "height": 768})
    locale: str = "vi-VN"
    ignore_https_errors: bool = False
    auth_rate_limit_per_min: int = 0  # 0 = không điều tiết


def load_settings(env_name: str | None = None) -> Settings:
    env_name = env_name or os.getenv("TEST_ENV", "dev")
    with ENV_FILE.open(encoding="utf-8") as f:
        all_envs = yaml.safe_load(f) or {}

    if env_name not in all_envs:
        raise ValueError(
            f"Môi trường '{env_name}' không có trong {ENV_FILE.name}. "
            f"Các môi trường hợp lệ: {', '.join(all_envs)}"
        )

    cfg = {**all_envs.get("default", {}), **all_envs[env_name]}
    return Settings(
        env_name=env_name,
        base_url=os.getenv("BASE_URL", cfg["base_url"]).rstrip("/"),
        api_url=os.getenv("API_URL", cfg.get("api_url", cfg["base_url"])).rstrip("/"),
        timeout_ms=int(cfg.get("timeout_ms", 15_000)),
        navigation_timeout_ms=int(cfg.get("navigation_timeout_ms", 30_000)),
        expect_timeout_ms=int(cfg.get("expect_timeout_ms", 10_000)),
        viewport=cfg.get("viewport", {"width": 1366, "height": 768}),
        locale=cfg.get("locale", "vi-VN"),
        ignore_https_errors=bool(cfg.get("ignore_https_errors", False)),
        auth_rate_limit_per_min=int(cfg.get("auth_rate_limit_per_min", 0)),
    )


def get_secret(name: str) -> str | None:
    """Đọc secret từ biến môi trường; trả về None nếu chưa cấu hình."""
    value = os.getenv(name)
    return value if value else None
