"""Kiểm tra bố cục dùng chung: thu phóng, tràn ngang, thứ tự di chuyển focus bằng Tab / Shift+Tab."""
from __future__ import annotations

from dataclasses import dataclass

from playwright.sync_api import Page

# Ctrl - / Ctrl + không điều khiển được trong headless. Zoom của trình duyệt = thu/phóng kích thước CSS px của
# khung nhìn (media query responsive chạy theo), nên giả lập bằng cách đổi viewport: zoom z -> viewport / z.
ZOOM_LEVELS = (0.5, 0.67, 1.5, 2.0)


def set_zoom(page: Page, factor: float, base: dict | None = None) -> None:
    base = base or {"width": 1366, "height": 768}
    page.set_viewport_size({"width": round(base["width"] / factor), "height": round(base["height"] / factor)})


def horizontal_overflow(page: Page) -> int:
    """Số pixel nội dung tràn ngang so với khung nhìn (0 = không tràn)."""
    return page.evaluate(
        "() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)"
    )


def overlapping_text_blocks(page: Page, selector: str = "main h1, main h2, main button, main a, main label") -> list[str]:
    """Các phần tử hiển thị (cùng loại) bị chồng lên nhau – dấu hiệu vỡ giao diện."""
    return page.evaluate(
        """sel => {
          const els = [...document.querySelectorAll(sel)].filter(e => {
            const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
            return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('[hidden]');
          });
          const out = [];
          for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
            const a = els[i], b = els[j];
            if (a.contains(b) || b.contains(a)) continue;
            const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
            const w = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left);
            const h = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
            if (w > 4 && h > 4) out.push(`${a.tagName}"${a.innerText.trim().slice(0,30)}" x ${b.tagName}"${b.innerText.trim().slice(0,30)}"`);
          }
          return out.slice(0, 10);
        }""",
        selector,
    )


@dataclass(frozen=True)
class Focused:
    key: str
    label: str
    top: float
    left: float
    right: float


_FOCUS_JS = """() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  if (!el.dataset.autoTab) el.dataset.autoTab = String(Math.random()).slice(2);
  const r = el.getBoundingClientRect();
  const inMain = !!el.closest('main, [role=dialog]');
  const label = (el.getAttribute('aria-label') || el.innerText || el.value || el.placeholder || el.tagName).trim().slice(0, 40);
  return {key: el.dataset.autoTab, label, top: r.top + scrollY, left: r.left + scrollX, right: r.right + scrollX, inMain};
}"""


def focus_sequence(page: Page, *, reverse: bool = False, max_steps: int = 60) -> list[Focused]:
    """Nhấn Tab (hoặc Shift+Tab) liên tục, ghi lại các phần tử nhận focus nằm trong <main>.

    Bắt đầu từ đầu trang (Tab) hoặc cuối trang (Shift+Tab); dừng khi focus quay lại phần tử đã gặp.
    """
    page.evaluate("() => { document.activeElement && document.activeElement.blur(); }")
    if reverse:
        page.locator("body").press("End")
    key = "Shift+Tab" if reverse else "Tab"
    seen, seq = set(), []
    for _ in range(max_steps):
        page.keyboard.press(key)
        info = page.evaluate(_FOCUS_JS)
        if not info:
            continue
        if info["key"] in seen:
            break
        seen.add(info["key"])
        if info["inMain"]:
            seq.append(Focused(info["key"], info["label"], info["top"], info["left"], info["right"]))
    return seq


def reading_order_violations(seq: list[Focused], tolerance: float = 8) -> list[str]:
    """Vi phạm thứ tự trái -> phải, trên -> dưới.

    Cho phép nhảy lên trên khi chuyển sang cột bên phải (bố cục 2 cột: form | xem trước, danh sách | kết quả).
    """
    bad = []
    for a, b in zip(seq, seq[1:]):
        same_row = abs(b.top - a.top) <= tolerance
        if same_row and b.left < a.left - tolerance:
            bad.append(f"'{a.label}' -> '{b.label}': cùng hàng nhưng đi từ phải sang trái")
        elif b.top < a.top - tolerance and not same_row and b.left < a.right - tolerance:
            bad.append(f"'{a.label}' -> '{b.label}': nhảy ngược lên trên trong cùng cột")
    return bad
