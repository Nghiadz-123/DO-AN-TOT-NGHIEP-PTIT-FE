"""Test chung cho textbox / textarea / ô số / số điện thoại / combobox / ô tìm kiếm / label của mọi màn hình.

Mã TC lấy trực tiếp từ KBKTCN theo (chức năng, nhóm) khai báo ở specs/; loại kiểm tra theo utils.kbktcn.classify().
Mỗi case con có id = mã TC, vd: pytest -k Profile_41
"""
import pytest

from specs.registry import SCREENS, WIDGETS
from utils import kbktcn
from utils.widget_checks import CHECKS, WidgetCtx

pytestmark = [pytest.mark.ui, pytest.mark.generic]


def _params():
    seen: set[str] = set()
    for w in WIDGETS:
        screen = SCREENS[w.screen]
        for tc in kbktcn.cases(screen.function, w.group):
            kind = kbktcn.classify(tc)
            if kind not in CHECKS or tc.id in seen:
                continue
            seen.add(tc.id)
            yield pytest.param(w, tc, kind, id=tc.id, marks=[getattr(pytest.mark, screen.mark)])


@pytest.mark.parametrize("widget, tc, kind", list(_params()))
def test_widget(screen_env, widget, tc, kind, record_testcase):
    """Kiểm tra 1 TC của 1 thành phần theo mẫu chung (xem docstring hàm check_* trong utils/widget_checks.py)."""
    record_testcase(tc.id)
    if kind in widget.manual:
        pytest.skip(f"MANUAL: {widget.manual[kind]}")
    env = screen_env(SCREENS[widget.screen])
    po = env.open()
    CHECKS[kind](WidgetCtx(env, po, widget, tc))
