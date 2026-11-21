"""Kiểm tra dùng chung cho textbox / textarea / ô số / số điện thoại / combobox / ô tìm kiếm.

Mỗi hàm `check_<loại>` ứng với 1 loại TC của utils.kbktcn.classify(). Giá trị mong đợi (placeholder, câu
thông báo, maxlength, min/max) đọc từ chính TC trong KBKTCN, nên kết quả bám theo tài liệu.
Page Object truyền vào là FormPage (form có nút Lưu) hoặc SearchListPage (danh sách có ô tìm kiếm).
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Callable

import pytest
from playwright.sync_api import Locator, Page, expect

from specs.model import Widget
from utils import kbktcn
from utils.data_loader import load_test_data
from utils.kbktcn import Tc

COMMON = load_test_data("common.json")
FORMATS = COMMON["formats"]
UNSET = object()


@dataclass
class WidgetCtx:
    env: Any                 # fixtures.screens.ScreenEnv
    po: Any                  # Page Object (FormPage | SearchListPage)
    widget: Widget
    tc: Tc

    @property
    def page(self) -> Page:
        return self.po.page

    @property
    def loc(self) -> Locator:
        w = self.widget
        return w.locate(self.po) if w.locate else self.po.field(w.label)

    @property
    def is_form(self) -> bool:
        return hasattr(self.po, "submit")

    def saved(self):
        if not self.widget.key or not hasattr(self.po, "saved"):
            return UNSET
        return self.po.saved(self.widget.key)

    def expected_saved(self, value: str):
        return self.widget.to_saved(value) if self.widget.to_saved else value


# ---------------------------------------------------------------- tiện ích
def _messages(ctx: WidgetCtx) -> str:
    own = ctx.loc.evaluate("e => e.validationMessage || ''")
    return f"{own} | {ctx.po.messages() if ctx.is_form else ''}"


def _expected_messages(tc: Tc) -> list[str]:
    return [m.rstrip(".…") for m in kbktcn.quoted(tc.expected)]


def _type(loc: Locator, value: str) -> None:
    """Gõ từng ký tự (ô type=number không nhận fill() chữ cái)."""
    loc.fill("")
    loc.press_sequentially(value)


def _paste(ctx: WidgetCtx, value: str) -> None:
    ctx.page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    ctx.page.evaluate("t => navigator.clipboard.writeText(t)", value)
    ctx.loc.fill("")
    ctx.loc.focus()
    ctx.loc.press("ControlOrMeta+v")


def _submit_ok(ctx: WidgetCtx):
    resp = ctx.po.submit()
    assert resp is not None, f"Nhấn lưu nhưng không gửi yêu cầu lưu. Thông báo: {_messages(ctx)}"
    assert resp.ok, f"Lưu thất bại: {resp.status} {resp.text()[:300]} | {_messages(ctx)}"
    return resp


def _assert_rejected(ctx: WidgetCtx, before, messages: list[str]):
    """Không lưu (giao diện chặn hoặc API báo lỗi) và hiển thị đúng câu thông báo tài liệu yêu cầu."""
    resp = ctx.po.submit()
    shown = _messages(ctx)
    assert resp is None or not resp.ok, f"Dữ liệu không hợp lệ nhưng vẫn lưu thành công. Thông báo: {shown}"
    for msg in messages:
        assert msg.lower() in shown.lower(), f"Không hiển thị thông báo '{msg}'. Đang hiển thị: {shown}"
    if before is not UNSET:
        assert ctx.saved() == before, "Giá trị đã lưu bị thay đổi"


def _no_error_shown(ctx: WidgetCtx) -> None:
    valid = ctx.loc.evaluate("e => e.checkValidity ? e.checkValidity() : true")
    assert valid, f"Trường báo không hợp lệ: {ctx.loc.evaluate('e => e.validationMessage')}"


def manual(reason: str):
    pytest.skip(f"MANUAL: {reason}")


# ---------------------------------------------------------------- textbox / textarea
def check_txt_display(ctx: WidgetCtx):
    """Textbox hiển thị, nhập được (kích thước / màu viền mang tính cảm quan: không so ảnh)."""
    expect(ctx.loc).to_be_visible()
    expect(ctx.loc).to_be_editable()
    if "icon tìm kiếm" in ctx.tc.expected:
        icon = ctx.loc.locator("xpath=..").locator("svg")  # icon nằm cùng khối với ô nhập (không có nhãn riêng)
        expect(icon.first, "Ô tìm kiếm không có icon").to_be_visible()
    if "nút tăng/giảm" in ctx.tc.expected:
        assert ctx.loc.get_attribute("type") == "number", "Ô số không phải input type=number (không có nút tăng/giảm)"


def check_default(ctx: WidgetCtx):
    exp = ctx.tc.expected
    kind = ctx.widget.kind
    if kind in ("select", "hover"):
        return check_cb_default(ctx)
    if "rỗng" in exp.lower() or "trống" in exp.lower():
        expect(ctx.loc).to_have_value("")
        return
    if ctx.widget.default is None:
        pytest.fail(f"Chưa khai báo giá trị mặc định mong đợi cho '{ctx.widget.group}': {exp}", pytrace=False)
    expect(ctx.loc).to_have_value(str(ctx.widget.default(ctx.env)))


def check_txt_placeholder(ctx: WidgetCtx):
    exp = ctx.tc.expected
    wanted = "" if "trống" in exp.lower() else (kbktcn.quoted(exp) or [""])[0]
    actual = ctx.loc.get_attribute("placeholder") or ""
    assert actual == wanted, f"Placeholder '{actual}' khác tài liệu '{wanted}'"


def check_txt_required(ctx: WidgetCtx):
    before = ctx.saved()
    ctx.po.fill_required(exclude=ctx.widget.label)
    ctx.loc.fill("")
    _assert_rejected(ctx, before, _expected_messages(ctx.tc) or [COMMON["required_message"]])


def check_txt_optional(ctx: WidgetCtx):
    ctx.po.fill_required(exclude=ctx.widget.label)
    ctx.loc.fill("")
    _submit_ok(ctx)
    expect(ctx.po.form_root.locator(".alert-error, [role='alert']")).to_have_count(0)


def check_txt_spaces(ctx: WidgetCtx):
    ctx.po.fill_required(exclude=ctx.widget.label)
    if ctx.widget.required or _expected_messages(ctx.tc):
        before = ctx.saved()
        ctx.loc.fill("     ")
        return _assert_rejected(ctx, before, _expected_messages(ctx.tc) or [COMMON["required_message"]])
    ctx.loc.fill("     ")
    _submit_ok(ctx)
    saved = ctx.saved()
    if saved is not UNSET:
        assert saved in ("", None), f"Không trim: giá trị đã lưu {saved!r}"


def check_txt_trim(ctx: WidgetCtx):
    ctx.po.fill_required(exclude=ctx.widget.label)
    value = ctx.widget.valid(ctx.env) if callable(ctx.widget.valid) else ctx.widget.valid
    ctx.loc.fill(f"   {value}   ")
    _submit_ok(ctx)
    saved = ctx.saved()
    if saved is UNSET:
        expect(ctx.loc).to_have_value(value)
    else:
        assert saved == ctx.expected_saved(value), f"Không cắt khoảng trắng: giá trị đã lưu {saved!r}"


def _format_value(ctx: WidgetCtx) -> str:
    return FORMATS[ctx_kind(ctx).removeprefix("fmt_")]


def ctx_kind(ctx: WidgetCtx) -> str:
    return kbktcn.classify(ctx.tc) or ""


def check_fmt(ctx: WidgetCtx):
    """Chữ thường / in hoa / không dấu / có dấu / số / ký tự đặc biệt / emoji: cho phép nhập, không cảnh báo."""
    value = _format_value(ctx)
    ctx.loc.fill(value)
    expect(ctx.loc).to_have_value(value)
    _no_error_shown(ctx)


def check_fmt_html(ctx: WidgetCtx):
    """Nhập HTML: cho phép nhập; sau khi lưu / tìm kiếm hiển thị dạng text, không thực thi mã."""
    page = ctx.page
    value = FORMATS["html"]
    ctx.loc.fill(value)
    expect(ctx.loc).to_have_value(value)
    if ctx.is_form:
        ctx.po.fill_required(exclude=ctx.widget.label)
        _submit_ok(ctx)
        saved = ctx.saved()
        if saved is not UNSET:
            assert saved == value, f"Giá trị lưu bị biến đổi: {saved!r}"
    elif hasattr(ctx.po, "search"):
        ctx.po.search(value)
    assert page.evaluate("() => window.__xss") is None, "Mã HTML/script đã được thực thi"
    assert page.locator("main img[src='x']").count() == 0, "Thẻ HTML được dựng thành phần tử thật"


def check_txt_paste(ctx: WidgetCtx):
    value = "0987654321" if ctx.widget.kind == "phone" else "Nội dung copy/paste"
    _paste(ctx, value)
    expect(ctx.loc).to_have_value(value)


def check_max(ctx: WidgetCtx):
    kind = ctx_kind(ctx)
    limit = kbktcn.maxlength_of(ctx.tc)
    assert limit, f"Không đọc được maxlength trong tài liệu: {ctx.tc.purpose}"
    length = {"max_over": limit + 1, "max_eq": limit, "max_under": limit - 1}[kind]
    value = ("0912345678" * 30)[:length] if ctx.widget.kind == "phone" else ("Anh " * length)[:length]
    ctx.loc.fill(value)
    actual = ctx.loc.input_value()
    if kind == "max_over":
        assert len(actual) <= limit, f"Nhập được {len(actual)} ký tự (maxlength {limit})"
    else:
        assert actual == value, f"Chỉ nhập được {len(actual)}/{length} ký tự"


def check_txt_multiline(ctx: WidgetCtx):
    value = COMMON["multiline"]
    ctx.po.fill_required(exclude=ctx.widget.label)
    ctx.loc.fill(value)
    expect(ctx.loc).to_have_value(value)
    if ctx.is_form and ctx.widget.key:
        _submit_ok(ctx)
        saved = ctx.saved()
        assert saved == value, f"Không giữ xuống dòng khi lưu: {saved!r}"


def check_txt_scroll(ctx: WidgetCtx):
    ctx.loc.fill("\n".join(f"Dòng {i}" for i in range(40)))
    info = ctx.loc.evaluate(
        "e => ({sh: e.scrollHeight, ch: e.clientHeight, oy: getComputedStyle(e).overflowY,"
        " docW: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth})"
    )
    scrolls = info["sh"] > info["ch"] and info["oy"] in ("auto", "scroll")
    grows = info["sh"] <= info["ch"] + 2
    assert scrolls or grows, f"Textarea không có thanh cuộn và không tự giãn: {info}"
    assert info["docW"] <= info["vw"], "Nội dung dài làm vỡ giao diện (tràn ngang)"


def check_txt_readonly(ctx: WidgetCtx):
    before = ctx.loc.input_value()
    editable = ctx.loc.is_editable()
    assert not editable, "Trường cho phép sửa"
    assert ctx.loc.input_value() == before


# ---------------------------------------------------------------- ô số
def check_num_reject(ctx: WidgetCtx):
    step = ctx.tc.steps.split("\n")[0]
    sample = "abc" if "chữ cái" in step else "@#$"
    _type(ctx.loc, sample)
    assert ctx.loc.input_value() == "", f"Ô số nhận giá trị '{ctx.loc.input_value()}'"


def check_num_positive(ctx: WidgetCtx):
    ctx.loc.fill("5")
    expect(ctx.loc).to_have_value("5")
    _no_error_shown(ctx)


def _num_rejected(ctx: WidgetCtx, value: str):
    before = ctx.saved()
    ctx.po.fill_required(exclude=ctx.widget.label)
    ctx.loc.fill(value)
    msgs = _expected_messages(ctx.tc)
    _assert_rejected(ctx, before, msgs)


def check_num_negative(ctx: WidgetCtx):
    _num_rejected(ctx, "-1")


def check_num_decimal(ctx: WidgetCtx):
    _num_rejected(ctx, "1.5")


def check_num_spin(ctx: WidgetCtx):
    ctx.loc.fill("1")
    ctx.loc.press("ArrowUp")
    expect(ctx.loc, "Phím mũi tên lên không tăng 1 đơn vị").to_have_value("2")
    ctx.loc.press("ArrowDown")
    ctx.loc.press("ArrowDown")
    expect(ctx.loc, "Phím mũi tên xuống không giảm 1 đơn vị").to_have_value("0")
    lo = ctx.loc.get_attribute("min")
    if lo is not None:
        ctx.loc.fill(lo)
        ctx.loc.press("ArrowDown")
        expect(ctx.loc, f"Giảm vượt giới hạn min={lo}").to_have_value(lo)


def check_num_bound(ctx: WidgetCtx):
    which, limit, value = kbktcn.bound_of(ctx.tc)
    outside = value < limit if which == "min" else value > limit
    if outside:
        return _num_rejected(ctx, str(value))
    ctx.loc.fill(str(value))
    expect(ctx.loc).to_have_value(str(value))
    _no_error_shown(ctx)


def check_num_paste_ok(ctx: WidgetCtx):
    _paste(ctx, "12")
    expect(ctx.loc).to_have_value("12")


def check_num_paste_letters(ctx: WidgetCtx):
    _paste(ctx, "12abc")
    assert ctx.loc.input_value() in ("", "12"), f"Ô số nhận giá trị không phải số: '{ctx.loc.input_value()}'"
    assert not re.search(r"[a-z]", ctx.loc.input_value(), re.I)


# ---------------------------------------------------------------- số điện thoại
def _step_values(tc: Tc) -> list[str]:
    first = tc.steps.split("\n")[0]
    tail = first.split(":", 1)[1] if ":" in first else ""
    return [v.strip() for v in tail.split(",") if v.strip()]


def check_phone_valid(ctx: WidgetCtx):
    for value in _step_values(ctx.tc):
        ctx.po.fill_required(exclude=ctx.widget.label)
        ctx.loc.fill(value)
        _submit_ok(ctx)
        saved = ctx.saved()
        if saved is not UNSET:
            assert saved == value, f"Số điện thoại lưu {saved!r} khác {value!r}"


def check_phone_invalid(ctx: WidgetCtx):
    value = _step_values(ctx.tc)[0]
    before = ctx.saved()
    ctx.po.fill_required(exclude=ctx.widget.label)
    ctx.loc.fill(value)
    _assert_rejected(ctx, before, _expected_messages(ctx.tc) or [COMMON["invalid_phone_message"]])


# ---------------------------------------------------------------- combobox (select gốc / HoverSelect)
def _cb_trigger(ctx: WidgetCtx) -> Locator:
    return ctx.loc


def _cb_selected_text(ctx: WidgetCtx) -> str:
    if ctx.widget.kind == "select":
        return ctx.loc.evaluate("e => e.options[e.selectedIndex] ? e.options[e.selectedIndex].text : ''").strip()
    return ctx.loc.locator(".hover-select-label").inner_text().strip()


def _cb_open(ctx: WidgetCtx) -> Locator:
    """Mở danh sách lựa chọn, trả về locator các option."""
    if ctx.widget.kind == "select":
        return ctx.loc.locator("option")
    ctx.loc.click()
    listbox = ctx.page.locator(f"#{ctx.loc.get_attribute('aria-controls')}")
    expect(listbox).to_be_visible()
    return listbox.get_by_role("option")


def _cb_option_texts(ctx: WidgetCtx) -> list[str]:
    return [t.strip() for t in _cb_open(ctx).all_inner_texts()]


def _cb_placeholder(ctx: WidgetCtx) -> str:
    if ctx.widget.kind == "select":
        return ctx.loc.evaluate("e => { const o = [...e.options].find(o => o.value === ''); return o ? o.text.trim() : '' }")
    return ""


def check_cb_display(ctx: WidgetCtx):
    expect(ctx.loc).to_be_visible()
    expect(ctx.loc).to_be_enabled()
    if ctx.widget.kind == "hover":
        expect(ctx.loc.locator(".hover-select-caret"), "Combobox không có icon mũi tên").to_be_visible()
    else:
        appearance = ctx.loc.evaluate("e => getComputedStyle(e).appearance")
        bg = ctx.loc.evaluate("e => getComputedStyle(e).backgroundImage")
        assert appearance != "none" or bg != "none", "Combobox không có icon mũi tên"


def check_cb_default(ctx: WidgetCtx):
    exp = ctx.tc.expected
    quoted = kbktcn.quoted(exp)
    if quoted:
        wanted = quoted[0]
    elif ctx.widget.default is not None:
        wanted = str(ctx.widget.default(ctx.env))
    else:
        pytest.fail(f"Chưa khai báo giá trị mặc định mong đợi: {exp}", pytrace=False)
    assert _cb_selected_text(ctx) == wanted, f"Mặc định '{_cb_selected_text(ctx)}' khác tài liệu '{wanted}'"


def _documented_options(tc: Tc) -> tuple[list[str], bool]:
    """(các giá trị liệt kê trong tài liệu, danh sách có '...' – chỉ liệt kê một phần)."""
    text = tc.expected.split(":", 1)[1] if ":" in tc.expected else ""
    partial = "..." in text or "…" in text
    # Bỏ ghi chú trong ngoặc kiểu "(danh sách tỉnh/thành phố)"; giữ ngoặc là một phần của giá trị ("Linh hoạt (hybrid)")
    text = re.sub(r"\((?:[^)]*danh sách[^)]*)\)", "", text).replace("…", "...")
    items = [i.strip(" .\n") for i in text.split(",")]
    return [i for i in items if i and i != "..."], partial


def check_cb_options(ctx: WidgetCtx):
    documented, partial = _documented_options(ctx.tc)
    actual = _cb_option_texts(ctx)
    if ctx.widget.extra.get("options"):
        documented, partial = ctx.widget.extra["options"](ctx.env), False
    missing = [o for o in documented if o not in actual]
    assert not missing, f"Thiếu giá trị {missing}. Danh sách thực tế: {actual}"
    if not partial and documented:
        # Lựa chọn rỗng (placeholder "Chưa chọn" / "Tất cả ...") là giá trị mặc định, không thuộc danh sách tài liệu liệt kê
        placeholder = _cb_placeholder(ctx)
        extra = [o for o in actual if o not in documented and o != placeholder]
        assert not extra, f"Có giá trị ngoài tài liệu {extra}"


def check_cb_select(ctx: WidgetCtx):
    if ctx.widget.kind == "select":
        texts = _cb_option_texts(ctx)
        assert len(texts) >= 2, f"Combobox không có giá trị để chọn: {texts}"
        ctx.loc.select_option(label=texts[1])
        assert _cb_selected_text(ctx) == texts[1]
        return
    options = _cb_open(ctx)
    target = options.nth(1)
    label = target.inner_text().strip()
    target.get_by_role("button").click()
    expect(ctx.loc.locator(".hover-select-label")).to_have_text(label)
    expect(ctx.page.locator(f"#{ctx.loc.get_attribute('aria-controls')}"), "Danh sách không đóng lại").to_have_count(0)


def check_cb_keyboard(ctx: WidgetCtx):
    before = _cb_selected_text(ctx)
    ctx.loc.focus()
    if ctx.widget.kind == "select":
        ctx.loc.press("ArrowDown")
        ctx.loc.press("Enter")
    else:
        ctx.loc.press("Enter")
        menu = ctx.page.locator(f"#{ctx.loc.get_attribute('aria-controls')}")
        expect(menu).to_be_visible()
        ctx.page.keyboard.press("Tab")  # vào lựa chọn đầu tiên
        ctx.page.keyboard.press("ArrowDown")
        ctx.page.keyboard.press("Enter")
    after = _cb_selected_text(ctx)
    assert after != before, f"Không chọn được giá trị bằng bàn phím (vẫn là '{before}')"


def _cb_search_input(ctx: WidgetCtx) -> Locator:
    if ctx.widget.kind == "select":
        pytest.fail("Combobox là thẻ <select> thường, không có ô tìm kiếm để lọc danh sách giá trị", pytrace=False)
    ctx.loc.click()
    menu = ctx.page.locator(f"#{ctx.loc.get_attribute('aria-controls')}").locator("xpath=..")
    box = menu.get_by_role("searchbox").or_(menu.get_by_role("textbox"))
    assert box.count() > 0, "Combobox không có ô tìm kiếm để lọc danh sách giá trị"
    return box.first


def check_cb_search_hit(ctx: WidgetCtx):
    box = _cb_search_input(ctx)
    options = _cb_option_texts(ctx)
    keyword = options[-1][:3].upper()
    box.fill(keyword)
    shown = [t.strip() for t in ctx.page.get_by_role("option").all_inner_texts()]
    assert shown and all(keyword.lower() in t.lower() for t in shown), f"Lọc '{keyword}' ra: {shown}"


def check_cb_search_miss(ctx: WidgetCtx):
    box = _cb_search_input(ctx)
    box.fill(COMMON["search_missing"])
    expect(ctx.page.get_by_text("Không có dữ liệu")).to_be_visible()


def check_cb_required(ctx: WidgetCtx):
    before = ctx.saved()
    ctx.po.fill_required(exclude=ctx.widget.label)
    ctx.loc.select_option(index=0)
    _assert_rejected(ctx, before, _expected_messages(ctx.tc) or ["Vui lòng chọn một mục trong danh sách"])


# ---------------------------------------------------------------- ô tìm kiếm (danh sách)
def _sample(ctx: WidgetCtx) -> str:
    assert ctx.widget.sample, "Chưa khai báo cách lấy từ khóa mẫu (Widget.sample)"
    value = ctx.widget.sample(ctx.env)
    if not value:
        pytest.skip("DỮ LIỆU: môi trường chưa có bản ghi để tìm kiếm")
    return value


def _contains(keys: list[str], value: str) -> bool:
    return any(value.lower() in k.lower() for k in keys)


def check_search_exact(ctx: WidgetCtx):
    value = _sample(ctx)
    ctx.po.search(value)
    keys = ctx.po.result_keys()
    assert _contains(keys, value), f"Không thấy bản ghi '{value}' trong kết quả: {keys[:10]}"


def check_search_partial(ctx: WidgetCtx):
    value = _sample(ctx)
    words = value.split()
    part = words[-1] if len(words) > 1 else value[1:-1]
    ctx.po.search(part)
    keys = ctx.po.result_keys()
    assert _contains(keys, value), f"Tìm gần đúng '{part}' không ra bản ghi '{value}': {keys[:10]}"


def check_search_case(ctx: WidgetCtx):
    value = _sample(ctx)
    ctx.po.search(value.upper())
    upper = ctx.po.result_keys()
    ctx.po.search(value.lower())
    lower = ctx.po.result_keys()
    assert upper == lower, f"Kết quả khác nhau: IN HOA {upper[:5]} / thường {lower[:5]}"
    assert upper, "Không có kết quả"


def check_search_trim(ctx: WidgetCtx):
    value = _sample(ctx)
    ctx.po.search(value)
    plain = ctx.po.result_keys()
    ctx.po.search(f"   {value}   ")
    padded = ctx.po.result_keys()
    assert padded == plain, f"Khoảng trắng đầu/cuối làm đổi kết quả: {padded[:5]} / {plain[:5]}"


def check_search_spaces(ctx: WidgetCtx):
    default = ctx.po.result_keys()
    ctx.po.search("     ")
    assert not ctx.po.has_error(), "Tìm toàn space gây lỗi tải dữ liệu"
    assert ctx.po.result_keys() == default, "Tìm toàn space không hiển thị toàn bộ danh sách"


def check_search_special(ctx: WidgetCtx):
    errors: list[str] = []
    ctx.page.on("response", lambda r: errors.append(f"{r.status} {r.url}") if r.status >= 500 else None)
    for value in COMMON["search_specials"]:
        ctx.po.search(value)
        assert not ctx.po.has_error(), f"Từ khóa '{value}' gây lỗi tải dữ liệu"
    assert not errors, f"API lỗi khi tìm ký tự đặc biệt: {errors}"


def check_search_empty(ctx: WidgetCtx):
    ctx.po.search(COMMON["search_missing"])
    expect(ctx.po.empty_state).to_be_visible()
    for text in _expected_messages(ctx.tc):
        expect(ctx.po.empty_state).to_contain_text(text)
    assert not ctx.po.result_keys(), "Từ khóa không tồn tại vẫn có kết quả"


def check_search_clear(ctx: WidgetCtx):
    default = ctx.po.result_keys()
    ctx.po.search(COMMON["search_missing"])
    ctx.po.clear_search()
    assert ctx.po.result_keys() == default, "Xóa từ khóa nhưng danh sách không trở về mặc định"


def check_label(ctx: WidgetCtx):
    wanted = ctx.widget.extra.get("text") or ctx.widget.label
    expect(ctx.loc).to_have_text(re.compile(rf"^\s*{re.escape(wanted)}\s*$"))


# ---------------------------------------------------------------- phân trang (danh sách)
def _page_size_or_skip(ctx: WidgetCtx):
    pg = ctx.po.pagination
    if pg.root.count() == 0:
        pytest.skip("DỮ LIỆU: số bản ghi hiện có <= số bản ghi/trang, không có phân trang để kiểm tra")
    return pg


def _goto_page(ctx: WidgetCtx, button: Locator) -> None:
    with ctx.page.expect_response(ctx.po._is_list):
        button.click()
    ctx.po.wait_results()


def check_page_display(ctx: WidgetCtx):
    pg = _page_size_or_skip(ctx)
    expect(pg.root).to_be_visible()
    expect(pg.current).to_have_text("1")


def check_page_hidden(ctx: WidgetCtx):
    value = _sample(ctx)
    ctx.po.search(value)
    assert 0 < len(ctx.po.result_keys()) <= 12, "Từ khóa mẫu không cho ra danh sách 1 trang"
    expect(ctx.po.pagination.root).to_have_count(0)


def check_page_number(ctx: WidgetCtx):
    pg = _page_size_or_skip(ctx)
    first = ctx.po.result_keys()
    ctx.page.mouse.wheel(0, 3000)
    _goto_page(ctx, pg.page_button(2))
    expect(pg.current).to_have_text("2")
    assert ctx.po.result_keys() != first, "Chuyển trang nhưng dữ liệu không đổi"
    top = ctx.page.evaluate("() => window.scrollY")
    list_top = ctx.po.results.evaluate("e => e.getBoundingClientRect().top + window.scrollY")
    assert top <= list_top + 5, f"Không cuộn lên đầu danh sách (scrollY={top}, đầu danh sách={list_top})"


def check_page_next_prev(ctx: WidgetCtx):
    pg = _page_size_or_skip(ctx)
    first = ctx.po.result_keys()
    _goto_page(ctx, pg.next)
    expect(pg.current).to_have_text("2")
    _goto_page(ctx, pg.prev)
    expect(pg.current).to_have_text("1")
    assert ctx.po.result_keys() == first


def check_page_bounds(ctx: WidgetCtx):
    pg = _page_size_or_skip(ctx)
    expect(pg.prev).to_be_disabled()
    for _ in range(50):
        if pg.next.is_disabled():
            break
        _goto_page(ctx, pg.next)
    expect(pg.next).to_be_disabled()
    expect(pg.prev).to_be_enabled()


def check_page_keep_filter(ctx: WidgetCtx):
    param = ctx.po.apply_broad_filter()
    pg = _page_size_or_skip(ctx)
    _goto_page(ctx, pg.next)
    assert re.search(rf"[?&]{param}=", ctx.page.url), f"Mất bộ lọc '{param}' khi chuyển trang: {ctx.page.url}"
    expect(ctx.po.active.or_(ctx.po.search_box)).not_to_have_count(0)
    expect(pg.current).to_have_text("2")


# ---------------------------------------------------------------- popup xác nhận
# Widget kind "popup": extra = {"open": (po, env) -> None, "state": (env) -> giá trị cần giữ nguyên khi hủy}
def _popup(ctx: WidgetCtx):
    from pages.components import ConfirmDialog

    before = ctx.widget.extra["state"](ctx.env) if "state" in ctx.widget.extra else None
    ctx.widget.extra["open"](ctx.po, ctx.env)
    dialog = ConfirmDialog(ctx.page)
    expect(dialog.root).to_be_visible()
    return dialog, before


def _popup_unchanged(ctx: WidgetCtx, dialog, before):
    expect(dialog.root).to_have_count(0)
    if "state" in ctx.widget.extra:
        assert ctx.widget.extra["state"](ctx.env) == before, "Dữ liệu bị thay đổi sau khi đóng popup"


def check_popup_display(ctx: WidgetCtx):
    dialog, _ = _popup(ctx)
    texts = kbktcn.quoted(ctx.tc.expected)
    assert texts, f"Tài liệu không ghi tiêu đề popup: {ctx.tc.expected}"
    expect(dialog.title).to_have_text(texts[0])
    for label in texts[1:]:
        expect(dialog.root.get_by_role("button", name=label, exact=True)).to_be_visible()


def check_popup_cancel(ctx: WidgetCtx):
    dialog, before = _popup(ctx)
    dialog.cancel_button.click()
    _popup_unchanged(ctx, dialog, before)


def check_popup_close(ctx: WidgetCtx):
    dialog, before = _popup(ctx)
    dialog.close_icon.click()
    _popup_unchanged(ctx, dialog, before)
    ctx.widget.extra["open"](ctx.po, ctx.env)
    expect(dialog.root).to_be_visible()
    ctx.page.keyboard.press("Escape")
    _popup_unchanged(ctx, dialog, before)


CHECKS: dict[str, Callable[[WidgetCtx], None]] = {
    "txt_display": check_txt_display, "default": check_default, "txt_placeholder": check_txt_placeholder,
    "txt_required": check_txt_required, "txt_optional": check_txt_optional, "txt_spaces": check_txt_spaces,
    "txt_trim": check_txt_trim, "txt_paste": check_txt_paste, "txt_multiline": check_txt_multiline,
    "txt_scroll": check_txt_scroll, "txt_readonly": check_txt_readonly,
    "fmt_lower": check_fmt, "fmt_upper": check_fmt, "fmt_no_accent": check_fmt, "fmt_vietnamese": check_fmt,
    "fmt_digits": check_fmt, "fmt_special": check_fmt, "fmt_emoji": check_fmt, "fmt_html": check_fmt_html,
    "max_over": check_max, "max_eq": check_max, "max_under": check_max,
    "num_reject": check_num_reject, "num_positive": check_num_positive, "num_negative": check_num_negative,
    "num_decimal": check_num_decimal, "num_spin": check_num_spin, "num_bound": check_num_bound,
    "num_paste_ok": check_num_paste_ok, "num_paste_letters": check_num_paste_letters,
    "phone_valid": check_phone_valid, "phone_invalid": check_phone_invalid,
    "cb_display": check_cb_display, "cb_options": check_cb_options, "cb_select": check_cb_select,
    "cb_keyboard": check_cb_keyboard, "cb_search_hit": check_cb_search_hit, "cb_search_miss": check_cb_search_miss,
    "cb_required": check_cb_required,
    "search_exact": check_search_exact, "search_partial": check_search_partial, "search_case": check_search_case,
    "search_trim": check_search_trim, "search_spaces": check_search_spaces, "search_special": check_search_special,
    "search_empty": check_search_empty, "search_clear": check_search_clear,
    "label": check_label,
    "page_display": check_page_display, "page_hidden": check_page_hidden, "page_number": check_page_number,
    "popup_display": check_popup_display, "popup_cancel": check_popup_cancel, "popup_close": check_popup_close,
    "page_next_prev": check_page_next_prev, "page_bounds": check_page_bounds, "page_keep_filter": check_page_keep_filter,
}
