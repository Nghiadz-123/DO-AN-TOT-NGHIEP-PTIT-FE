"""Đọc test data từ thư mục test_data/ (JSON hoặc YAML)."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import yaml

TEST_DATA_DIR = Path(__file__).resolve().parent.parent / "test_data"


@lru_cache(maxsize=None)
def load_test_data(file_name: str) -> dict:
    path = TEST_DATA_DIR / file_name
    if not path.exists():
        raise FileNotFoundError(f"Không tìm thấy file test data: {path}")
    with path.open(encoding="utf-8") as f:
        if path.suffix in (".yaml", ".yml"):
            return yaml.safe_load(f) or {}
        return json.load(f)


def cases_with_ids(file_name: str, key: str, id_field: str = "tc_id"):
    """Trả về (danh sách case, danh sách id) để dùng cho @pytest.mark.parametrize."""
    cases = load_test_data(file_name)[key]
    return cases, [c[id_field] for c in cases]
