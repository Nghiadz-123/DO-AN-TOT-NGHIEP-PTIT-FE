"""Danh sách màn hình + thành phần cho engine test chung (tests/generic).

Thêm màn hình: khai báo Screen (chức năng trong KBKTCN + Page Object) và các Widget (nhóm kiểm thử trong KBKTCN
+ nhãn / locator). Mã TC và loại kiểm tra được lấy từ tài liệu (utils.kbktcn), không khai báo tay.
"""
from __future__ import annotations

from specs.model import ADMIN, CANDIDATE, EMPLOYER, GUEST, Screen, Widget
from specs.screens_candidate import SCREENS as _CANDIDATE_SCREENS, WIDGETS as _CANDIDATE_WIDGETS
from specs.screens_public import SCREENS as _PUBLIC_SCREENS, WIDGETS as _PUBLIC_WIDGETS
from specs.screens_recruiter import SCREENS as _RECRUITER_SCREENS, WIDGETS as _RECRUITER_WIDGETS
from specs.screens_admin import SCREENS as _ADMIN_SCREENS, WIDGETS as _ADMIN_WIDGETS

SCREENS: dict[str, Screen] = {}
WIDGETS: list[Widget] = []

for _screens, _widgets in ((_PUBLIC_SCREENS, _PUBLIC_WIDGETS), (_CANDIDATE_SCREENS, _CANDIDATE_WIDGETS),
                           (_RECRUITER_SCREENS, _RECRUITER_WIDGETS), (_ADMIN_SCREENS, _ADMIN_WIDGETS)):
    for _s in _screens:
        assert _s.key not in SCREENS, f"Trùng Screen.key {_s.key}"
        SCREENS[_s.key] = _s
    WIDGETS.extend(_widgets)

__all__ = ["SCREENS", "WIDGETS", "ADMIN", "CANDIDATE", "EMPLOYER", "GUEST"]
