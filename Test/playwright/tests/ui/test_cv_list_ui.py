"""UI test màn hình "CV của tôi" (/cv) – Candidate_1, 10..16, 20..23, 25, 26, 28.

Nguồn: KBKTCN_ATS_WEB_v1.0.xlsx, sheet "Ứng viên", mục "CV của tôi".
Dữ liệu: shared_candidate (2 CV: PDF là CV chính + DOCX) chỉ dùng cho test không làm thay đổi dữ liệu.
"""
import re

import pytest
from playwright.sync_api import Page, expect

from pages.cv_list_page import CVListPage
from utils.data_loader import load_test_data

MSG = load_test_data("cv.json")["messages"]

pytestmark = [pytest.mark.ui, pytest.mark.cv, pytest.mark.cv_list]


@pytest.fixture
def cv_list(login_as, shared_candidate, page: Page, settings) -> CVListPage:
    login_as(shared_candidate)
    lst = CVListPage(page, settings).open()
    lst.wait_list_ready()
    return lst


def _titles(client):
    default = next(c for c in client.cvs if c["is_default"])
    other = next(c for c in client.cvs if not c["is_default"])
    return default["title"], other["title"]


# ---------------------------------------------------------------- giao diện chung
@pytest.mark.smoke
@pytest.mark.testcase("Candidate_1")
def test_candidate_1_default_layout(cv_list: CVListPage, shared_candidate):
    """Candidate_1 - Title "CV của tôi", mô tả, nút Tải CV mới / Tạo CV, switch Công khai, danh sách CV, header/footer."""
    default_title, _ = _titles(shared_candidate)

    expect(cv_list.heading).to_have_text(MSG["list_title"])
    expect(cv_list.description).to_have_text(MSG["list_description"])
    expect(cv_list.upload_button).to_be_visible()
    expect(cv_list.create_button).to_be_visible()
    expect(cv_list.public_switch).to_be_visible()
    expect(cv_list.cards).to_have_count(len(shared_candidate.cvs))
    # Mỗi CV: tên, ngày tải lên/cập nhật, nhãn, link điểm AI, menu thao tác
    for cv in shared_candidate.cvs:
        expect(cv_list.card_title_link(cv["title"])).to_be_visible()
        expect(cv_list.card_meta(cv["title"])).to_contain_text(re.compile(r"\d{2}/\d{2}/\d{4}"))
        expect(cv_list.score_link(cv["title"])).to_be_visible()
        expect(cv_list.menu_button(cv["title"])).to_be_visible()
    expect(cv_list.card_badge(default_title, MSG["default_badge"])).to_be_visible()
    expect(cv_list.shell.header).to_be_visible()
    expect(cv_list.shell.footer).to_be_visible()


# ---------------------------------------------------------------- trạng thái tải dữ liệu
@pytest.mark.testcase("Candidate_10")
def test_candidate_10_loading_state(login_as, shared_candidate, page: Page, settings):
    """Candidate_10 - Mạng chậm: hiển thị skeleton "Đang tải danh sách CV"."""
    held = []
    page.route("**/candidate/cvs/", lambda route: held.append(route))  # giữ request = mạng rất chậm
    login_as(shared_candidate)
    lst = CVListPage(page, settings)
    page.goto(f"{settings.base_url}{lst.PATH}", wait_until="domcontentloaded")

    expect(lst.skeleton).to_be_visible()

    for route in held:
        route.continue_()
    page.unroute("**/candidate/cvs/")
    expect(lst.cv_list).to_be_visible()
    expect(lst.skeleton).to_be_hidden()


@pytest.mark.testcase("Candidate_11")
def test_candidate_11_load_error(login_as, shared_candidate, page: Page, settings):
    """Candidate_11 - API lỗi 500: hiển thị thông báo lỗi kèm nút "Thử lại", không trắng trang."""
    page.route("**/candidate/cvs/", lambda route: route.fulfill(status=500, json={"detail": "Lỗi máy chủ"}))
    login_as(shared_candidate)
    lst = CVListPage(page, settings).open()

    expect(lst.error_state.root).to_be_visible()
    expect(lst.error_state.retry_button).to_be_visible()
    expect(lst.heading).to_be_visible()
    expect(lst.shell.header).to_be_visible()


@pytest.mark.testcase("Candidate_12")
def test_candidate_12_retry_after_error(login_as, shared_candidate, page: Page, settings):
    """Candidate_12 - Khôi phục kết nối, nhấn "Thử lại": dữ liệu được tải lại thành công."""
    page.route("**/candidate/cvs/", lambda route: route.fulfill(status=500, json={"detail": "Lỗi máy chủ"}))
    login_as(shared_candidate)
    lst = CVListPage(page, settings).open()
    expect(lst.error_state.retry_button).to_be_visible()

    page.unroute("**/candidate/cvs/")
    lst.error_state.retry_button.click()

    expect(lst.cv_list).to_be_visible()
    expect(lst.cards).to_have_count(len(shared_candidate.cvs))
    expect(lst.error_state.root).to_be_hidden()


# ---------------------------------------------------------------- danh sách CV
@pytest.mark.testcase("Candidate_13")
def test_candidate_13_empty_list(login_as, candidate, page: Page, settings):
    """Candidate_13 - Chưa có CV: "Bạn chưa có CV nào" - "Tải CV lên hoặc tạo CV trực tuyến để ứng tuyển nhanh..."."""
    login_as(candidate)
    lst = CVListPage(page, settings).open()

    expect(lst.empty_title).to_be_visible()
    expect(lst.empty_state).to_contain_text(MSG["list_empty_description"])


@pytest.mark.testcase("Candidate_14")
def test_candidate_14_list_display(cv_list: CVListPage, shared_candidate):
    """Candidate_14 - Hiển thị đủ CV; CV chính có nhãn "CV chính"; CV chưa nộp có nhãn "Chưa dùng để ứng tuyển"."""
    default_title, other_title = _titles(shared_candidate)

    assert sorted(cv_list.card_titles()) == sorted(c["title"] for c in shared_candidate.cvs)
    expect(cv_list.card_badge(default_title, MSG["default_badge"])).to_be_visible()
    expect(cv_list.card_badge(other_title, MSG["default_badge"])).to_have_count(0)
    for title in (default_title, other_title):
        expect(cv_list.card(title)).to_contain_text(MSG["unused_label"])


@pytest.mark.testcase("Candidate_15")
def test_candidate_15_preview_pdf_and_docx(cv_list: CVListPage, shared_candidate):
    """Candidate_15 - Xem CV PDF: hiển thị nội dung PDF. Xem CV DOCX: hiển thị nội dung hoặc báo không xem được."""
    pdf = next(c for c in shared_candidate.cvs if c["mime_type"].endswith("pdf"))
    docx = next(c for c in shared_candidate.cvs if not c["mime_type"].endswith("pdf"))

    cv_list.view_button(pdf["title"]).click()
    expect(cv_list.preview_region(pdf["title"])).to_be_visible()
    expect(cv_list.pdf_frame(pdf["title"])).to_be_visible()
    expect(cv_list.pdf_frame(pdf["title"])).to_have_attribute("src", re.compile(r"^blob:"))

    cv_list.view_button(docx["title"]).click()
    expect(cv_list.preview_region(docx["title"])).to_be_visible()
    rendered = cv_list.docx_viewer(docx["title"]).locator("section.docx")  # nội dung do docx-preview dựng
    expect(rendered.or_(cv_list.page.get_by_text(MSG["docx_preview_error"])).first).to_be_visible()


# ---------------------------------------------------------------- menu thao tác
@pytest.mark.testcase("Candidate_16")
def test_candidate_16_action_menu_items(cv_list: CVListPage, shared_candidate):
    """Candidate_16 - Menu "Thao tác khác với CV": Tải về, Sửa thông tin, Đặt làm CV chính, Xóa CV."""
    _, other_title = _titles(shared_candidate)

    menu = cv_list.open_menu(other_title)

    items = [t.strip() for t in menu.locator(".dropdown-item").all_inner_texts()]
    assert items == MSG["menu_items"], f"Danh sách thao tác: {items}"


@pytest.mark.testcase("Candidate_20")
def test_candidate_20_menu_of_default_cv(cv_list: CVListPage, shared_candidate):
    """Candidate_20 - Menu của CV chính: không có/disable "Đặt làm CV chính", hiển thị "Đang là CV chính"."""
    default_title, _ = _titles(shared_candidate)

    menu = cv_list.open_menu(default_title)

    set_default = cv_list.menu_item(default_title, "Đặt làm CV chính")
    assert set_default.count() == 0 or set_default.is_disabled(), "CV chính vẫn có thao tác 'Đặt làm CV chính'"
    expect(menu).to_contain_text(MSG["is_default_label"])


# ---------------------------------------------------------------- popup xác nhận Xóa CV
@pytest.mark.testcase("Candidate_21")
def test_candidate_21_delete_popup_display(cv_list: CVListPage, shared_candidate):
    """Candidate_21 - Popup xác nhận: tiêu đề "Xóa CV?", button "Hủy" và "Xóa CV"."""
    _, other_title = _titles(shared_candidate)

    cv_list.request_delete(other_title)

    expect(cv_list.dialog.title).to_have_text(MSG["delete_title"])
    expect(cv_list.dialog.cancel_button).to_be_visible()
    expect(cv_list.dialog.confirm_button(MSG["delete_confirm"])).to_be_visible()


@pytest.mark.testcase("Candidate_22")
def test_candidate_22_delete_popup_cancel(cv_list: CVListPage, shared_candidate):
    """Candidate_22 - Nhấn Hủy: popup đóng, dữ liệu không thay đổi."""
    _, other_title = _titles(shared_candidate)
    cv_list.request_delete(other_title)

    cv_list.dialog.cancel_button.click()

    expect(cv_list.dialog.root).to_be_hidden()
    expect(cv_list.cards).to_have_count(len(shared_candidate.cvs))
    assert len(shared_candidate.list_cvs()) == len(shared_candidate.cvs), "CV bị xóa dù đã nhấn Hủy"


@pytest.mark.testcase("Candidate_23")
@pytest.mark.parametrize("how", ["icon_x", "esc"])
def test_candidate_23_delete_popup_close(cv_list: CVListPage, shared_candidate, how):
    """Candidate_23 - Nhấn icon X / phím Esc: popup đóng, dữ liệu không thay đổi."""
    _, other_title = _titles(shared_candidate)
    cv_list.request_delete(other_title)

    if how == "icon_x":
        cv_list.dialog.close_icon.click()
    else:
        cv_list.page.keyboard.press("Escape")

    expect(cv_list.dialog.root).to_be_hidden()
    expect(cv_list.card(other_title)).to_be_visible()
    assert len(shared_candidate.list_cvs()) == len(shared_candidate.cvs), "CV bị xóa dù đã đóng popup"


# ---------------------------------------------------------------- switch Công khai CV
@pytest.mark.testcase("Candidate_25")
def test_candidate_25_public_switch_display(cv_list: CVListPage):
    """Candidate_25 - Switch hiển thị, label đúng chính tả (so sánh hình ảnh với thiết kế: kiểm tra tay)."""
    expect(cv_list.public_switch).to_be_visible()
    expect(cv_list.public_switch).to_be_enabled()
    expect(cv_list.page.locator("#public-cv-title")).to_have_text(MSG["switch_label"])


@pytest.mark.testcase("Candidate_26")
def test_candidate_26_public_switch_default(cv_list: CVListPage, shared_candidate):
    """Candidate_26 - Giá trị mặc định đúng trạng thái đã lưu: "Đang bật" / "Đang tắt"."""
    saved = bool(shared_candidate.profile()["is_public"])

    if saved:
        expect(cv_list.public_switch).to_be_checked()
    else:
        expect(cv_list.public_switch).not_to_be_checked()
    expect(cv_list.public_switch_text).to_have_text(MSG["switch_on"] if saved else MSG["switch_off"])


@pytest.mark.testcase("Candidate_28")
def test_candidate_28_public_without_cv(login_as, candidate, page: Page, settings):
    """Candidate_28 - Chưa có CV: không cho bật Công khai CV, yêu cầu tải CV."""
    login_as(candidate)
    lst = CVListPage(page, settings).open()
    lst.wait_list_ready()

    switch_usable = lst.public_switch.count() > 0 and lst.public_switch.is_enabled()
    assert not switch_usable, "Chưa có CV nhưng vẫn bật được Công khai CV"
    expect(lst.empty_state.get_by_role("link", name=re.compile("Tải CV"))).to_be_visible()
    assert candidate.profile()["is_public"] is False
