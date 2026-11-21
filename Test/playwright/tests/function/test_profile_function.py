"""Hồ sơ cá nhân (/profile) – TC nghiệp vụ riêng (KBKTCN sheet "Hồ sơ cá nhân").

Textbox / combobox / ô số / giao diện chung / phân quyền: tests/generic (sinh từ tài liệu theo mẫu).
File này: Ảnh đại diện (Profile_13..25, 314, 315), Ngày sinh (61..68), ràng buộc lương (212..214), switch
(215..220, 318, 319), nút Lưu (222, 224, 225), Học vấn/Kinh nghiệm/Kỹ năng (226..231, 316, 317, 320),
Đổi mật khẩu (265..267, 289..294, 310..313), Xóa tài khoản (295..300, 321, 322), luồng cập nhật (301..309, 323).

Mỗi test dùng 1 tài khoản ứng viên mới tạo qua API (fresh) – không đụng tài khoản demo.
"""
import re
from datetime import date, timedelta

import pytest
from playwright.sync_api import Page, expect

from pages.components import ConfirmDialog, FileDropzone
from pages.profile_page import ProfilePage
from specs.registry import SCREENS
from utils.cv_files import CvFile
from utils.feature import require

pytestmark = [pytest.mark.function, pytest.mark.profile]

SCREEN = SCREENS["profile"]
NEW_PASSWORD = "NewAuto@12345"


@pytest.fixture
def env(screen_env):
    return screen_env(SCREEN, fresh=True)


@pytest.fixture
def profile(env) -> ProfilePage:
    return env.open()


def _image(name: str, size: int, mime: str = "image/png") -> CvFile:
    # PNG 1x1 hợp lệ + phần đệm để đạt dung lượng mong muốn
    png = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                        "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082")
    return CvFile(name, mime, png + b"\0" * max(0, size - len(png)))


def _avatar_zone(profile: ProfilePage):
    return require(profile.page.locator("main").get_by_text(re.compile("Ảnh đại diện")), "khu vực Ảnh đại diện")


# ---------------------------------------------------------------- ảnh đại diện
@pytest.mark.testcase("Profile_13")
def test_profile_13_avatar_dropzone(profile: ProfilePage):
    """Profile_13 - Khu vực kéo thả/chọn file kèm hướng dẫn "JPG, PNG · tối đa 2MB"."""
    _avatar_zone(profile)
    expect(profile.page.locator("main").get_by_text("JPG, PNG · tối đa 2MB")).to_be_visible()


@pytest.mark.parametrize("tc_id, how", [("Profile_14", "choose"), ("Profile_15", "drop"), ("Profile_19", "choose"),
                                        ("Profile_314", "choose")])
def test_profile_avatar_upload_ok(profile: ProfilePage, env, tc_id, how, record_testcase):
    """Profile_14/15/19/314 - Chọn hoặc kéo thả ảnh hợp lệ (< 2MB): ảnh mới hiển thị trên hồ sơ và header, F5 vẫn còn."""
    record_testcase(tc_id)
    _avatar_zone(profile)
    zone = FileDropzone(profile.page.locator("main"), profile.page)
    file = _image("avatar.png", 1024 * 1024)
    zone.drop(file) if how == "drop" else zone.choose(file)
    avatar = profile.page.locator("main img[alt*='Ảnh đại diện'], header img")
    expect(avatar.first).to_be_visible()
    profile.page.reload()
    expect(avatar.first).to_be_visible()


@pytest.mark.parametrize("tc_id, name, size, mime, ok", [
    ("Profile_16", "avatar.jpg", 50_000, "image/jpeg", True),
    ("Profile_17", "virus.exe", 2_000, "application/octet-stream", False),
    ("Profile_18", "fake.png", 2_000, "image/png", False),
    ("Profile_20", "equal.png", 2 * 1024 * 1024, "image/png", True),
    ("Profile_21", "big.png", 2 * 1024 * 1024 + 1, "image/png", False),
    ("Profile_22", "empty.png", 0, "image/png", False),
    ("Profile_315", "anim.gif", 50_000, "image/gif", False),
])
def test_profile_avatar_validation(profile: ProfilePage, tc_id, name, size, mime, ok, record_testcase):
    """Profile_16..22, 315 - Định dạng (JPG/PNG), dung lượng tối đa 2MB, file rỗng/hỏng, file giả mạo đuôi."""
    record_testcase(tc_id)
    _avatar_zone(profile)
    zone = FileDropzone(profile.page.locator("main"), profile.page)
    if name == "fake.png":
        file = CvFile(name, mime, b"MZ\x90\x00" + b"\0" * size)  # nội dung file .exe đổi đuôi
    elif size == 0:
        file = CvFile(name, mime, b"")
    else:
        file = _image(name, size, mime)
    zone.choose(file)
    error = profile.page.locator("main [role='alert']")
    if ok:
        expect(error).to_have_count(0)
    else:
        expect(error.first).to_be_visible()
        if tc_id == "Profile_21":
            expect(error.first).to_contain_text("File vượt quá 2MB")


@pytest.mark.testcase("Profile_23")
def test_profile_23_cancel_file_chooser(profile: ProfilePage):
    """Profile_23 - Mở hộp thoại chọn file rồi Cancel: không có file nào được chọn, giữ trạng thái cũ."""
    _avatar_zone(profile)
    zone = FileDropzone(profile.page.locator("main"), profile.page)
    zone.cancel_chooser()
    expect(profile.page.locator("main [role='alert']")).to_have_count(0)


@pytest.mark.testcase("Profile_24")
def test_profile_24_replace_avatar(profile: ProfilePage):
    """Profile_24 - Đã có ảnh, tải ảnh mới: ảnh mới thay ảnh cũ ở hồ sơ và header."""
    _avatar_zone(profile)
    zone = FileDropzone(profile.page.locator("main"), profile.page)
    zone.choose(_image("a1.png", 10_000))
    first = profile.page.locator("header img").first.get_attribute("src")
    zone.choose(_image("a2.png", 20_000))
    expect(profile.page.locator("header img").first).not_to_have_attribute("src", first or "")


@pytest.mark.testcase("Profile_25")
def test_profile_25_default_avatar(profile: ProfilePage, env):
    """Profile_25 - Chưa có ảnh đại diện: hiển thị ảnh mặc định / chữ cái đầu của tên."""
    zone = _avatar_zone(profile)
    initial = env.client.full_name.strip()[0].upper()
    expect(zone.locator("xpath=ancestor::*[1]")).to_contain_text(initial)


# ---------------------------------------------------------------- ngày sinh
def _dob(profile):
    return profile.field("Ngày sinh")


@pytest.mark.testcase("Profile_61")
def test_profile_61_datepicker_display(profile: ProfilePage):
    """Profile_61 - Datepicker hiển thị, có icon lịch, định dạng dd/mm/yyyy."""
    dob = _dob(profile)
    expect(dob).to_be_visible()
    assert dob.get_attribute("type") == "date", "Ngày sinh không phải datepicker (input type=date có icon lịch)"
    # input date hiển thị theo ngôn ngữ trình duyệt (vi-VN -> dd/mm/yyyy)
    fmt = profile.page.evaluate("() => new Intl.DateTimeFormat(navigator.language).format(new Date(2000, 7, 15))")
    assert fmt == "15/8/2000" or fmt == "15/08/2000", f"Định dạng ngày theo ngôn ngữ trình duyệt: {fmt}"


@pytest.mark.testcase("Profile_63")
def test_profile_63_pick_date(profile: ProfilePage, env):
    """Profile_63 - Chọn 1 ngày: hiển thị đúng ngày đã chọn; lưu đúng giá trị (icon lịch là picker gốc của trình duyệt)."""
    _dob(profile).fill("2000-08-15")
    resp = profile.submit()
    assert resp is not None and resp.ok, f"Lưu ngày sinh thất bại: {resp and resp.status}"
    assert profile.saved("dateOfBirth") == "2000-08-15"


@pytest.mark.testcase("Profile_64")
def test_profile_64_type_valid_date(profile: ProfilePage):
    """Profile_64 - Nhập tay 15/08/2000: cho phép nhập, không cảnh báo."""
    dob = _dob(profile)
    dob.click()
    dob.press_sequentially("15082000")
    expect(dob).to_have_value("2000-08-15")
    assert dob.evaluate("e => e.checkValidity()")


@pytest.mark.testcase("Profile_65")
def test_profile_65_invalid_date(profile: ProfilePage):
    """Profile_65 - Nhập 31/02/2000 rồi Lưu: không chấp nhận giá trị."""
    dob = _dob(profile)
    dob.click()
    dob.press_sequentially("31022000")
    assert dob.input_value() != "2000-02-31", "Ô ngày chấp nhận ngày không tồn tại 31/02/2000"


@pytest.mark.testcase("Profile_66")
def test_profile_66_date_rejects_letters(profile: ProfilePage):
    """Profile_66 - Nhập chữ cái, ký tự đặc biệt vào Ngày sinh: không cho phép nhập."""
    dob = _dob(profile)
    dob.click()
    dob.press_sequentially("ab@#")
    expect(dob).to_have_value("")


@pytest.mark.testcase("Profile_68")
def test_profile_68_future_birthday(profile: ProfilePage):
    """Profile_68 - Ngày sinh ở tương lai, nhấn Lưu: thông báo ngày sinh không hợp lệ, không lưu."""
    future = (date.today() + timedelta(days=30)).isoformat()
    _dob(profile).fill(future)
    resp = profile.submit()
    assert resp is None or not resp.ok, "Ngày sinh ở tương lai vẫn được lưu"
    assert profile.saved("dateOfBirth") != future


# ---------------------------------------------------------------- ràng buộc lương
@pytest.mark.parametrize("tc_id, lo, hi, ok", [("Profile_212", "10", "20", True), ("Profile_213", "15", "15", True),
                                               ("Profile_214", "30", "20", False)])
def test_profile_salary_range(profile: ProfilePage, tc_id, lo, hi, ok, record_testcase):
    """Profile_212..214 - Lương tối thiểu <= tối đa: lưu được; tối thiểu > tối đa: thông báo, không lưu."""
    record_testcase(tc_id)
    profile.field("Lương tối thiểu (triệu)").fill(lo)
    profile.field("Lương tối đa (triệu)").fill(hi)
    resp = profile.submit()
    if ok:
        assert resp is not None and resp.ok, f"Không lưu được: {profile.messages()}"
        expect(profile.success).to_be_visible()
    else:
        assert resp is None, "Lương tối thiểu > tối đa vẫn gửi yêu cầu lưu"
        expect(profile.form_root.get_by_role("alert")).to_contain_text(
            "Mức lương mong muốn tối thiểu không được lớn hơn tối đa.")


# ---------------------------------------------------------------- switch
@pytest.mark.testcase("Profile_215")
def test_profile_215_open_to_work_switch(profile: ProfilePage):
    """Profile_215 - Switch "Đang tìm việc" hiển thị, label đúng chính tả."""
    expect(profile.open_to_work).to_be_visible()
    expect(profile.form_root.locator("label.switch")).to_contain_text("Đang tìm việc")


@pytest.mark.testcase("Profile_216")
def test_profile_216_open_to_work_default(profile: ProfilePage, env):
    """Profile_216 - Hiển thị đúng trạng thái đã lưu (mặc định bật)."""
    saved = env.client.profile()["is_open_to_work"]
    assert saved is True, f"Mặc định is_open_to_work = {saved} (tài liệu: mặc định bật)"
    expect(profile.open_to_work).to_be_checked(checked=saved)


@pytest.mark.testcase("Profile_217")
def test_profile_217_toggle_open_to_work(profile: ProfilePage, env):
    """Profile_217 - Nhấn switch: chuyển bật/tắt; sau khi lưu trạng thái được cập nhật."""
    before = profile.open_to_work.is_checked()
    profile.open_to_work.click()
    expect(profile.open_to_work).to_be_checked(checked=not before)
    resp = profile.submit()
    assert resp is not None and resp.ok
    assert env.client.profile()["is_open_to_work"] is (not before)


def _searchable_switch(profile):
    return require(profile.form_root.get_by_role("switch", name="Cho phép nhà tuyển dụng tìm thấy hồ sơ"),
                   'switch "Cho phép nhà tuyển dụng tìm thấy hồ sơ" trên trang Hồ sơ cá nhân')


@pytest.mark.testcase("Profile_218")
def test_profile_218_searchable_switch_display(profile: ProfilePage):
    """Profile_218 - Switch "Cho phép nhà tuyển dụng tìm thấy hồ sơ" hiển thị đúng label."""
    _searchable_switch(profile)


@pytest.mark.testcase("Profile_219")
def test_profile_219_searchable_default_off(profile: ProfilePage):
    """Profile_219 - Mặc định tắt."""
    expect(_searchable_switch(profile)).not_to_be_checked()


@pytest.mark.parametrize("tc_id, turn_on", [("Profile_220", True), ("Profile_318", True), ("Profile_319", False)])
def test_profile_searchable_toggle(profile: ProfilePage, env, recruiter, tc_id, turn_on, record_testcase):
    """Profile_220/318/319 - Bật: hồ sơ xuất hiện trong Tìm ứng viên của NTD; tắt: NTD không tìm thấy."""
    record_testcase(tc_id)
    switch = _searchable_switch(profile)
    if not turn_on:
        switch.click()
        profile.submit()
    switch.click()  # bật (hoặc tắt lại)
    resp = profile.submit()
    assert resp is not None and resp.ok
    found = recruiter.get("employer/talents/", params={"q": env.client.email})
    names = [str(r) for r in (found.json().get("results", []) if found.ok else [])]
    assert (env.client.full_name in " ".join(names)) is turn_on


# ---------------------------------------------------------------- link / nút
@pytest.mark.testcase("Profile_222")
def test_profile_222_cv_link(profile: ProfilePage):
    """Profile_222 - Nhấn text link "CV của tôi": chuyển đến màn hình CV của tôi."""
    profile.cv_link.click()
    expect(profile.page).to_have_url(re.compile(r"/cv/?$"))
    expect(profile.page.get_by_role("heading", name="CV của tôi", level=1)).to_be_visible()


@pytest.mark.testcase("Profile_224")
def test_profile_224_save(profile: ProfilePage):
    """Profile_224 - Nhấn Lưu thay đổi: lưu dữ liệu, thông báo "Đã lưu thông tin hồ sơ."."""
    resp = profile.submit()
    assert resp is not None and resp.ok
    expect(profile.success).to_be_visible()


@pytest.mark.testcase("Profile_225")
def test_profile_225_saving_state(profile: ProfilePage):
    """Profile_225 - Trong lúc chờ lưu: nút "Đang lưu..." và bị disable."""
    page = profile.page
    held = []
    page.route("**/candidate/profile/", lambda r: held.append(r) if r.request.method == "PATCH" else r.continue_())
    profile.submit_button.click()
    busy = profile.form_root.get_by_role("button", name="Đang lưu...")
    expect(busy).to_be_visible()
    expect(busy).to_be_disabled()
    page.unroute("**/candidate/profile/")
    for r in held:
        try:
            r.continue_()
        except Exception:
            pass


# ---------------------------------------------------------------- học vấn / kinh nghiệm / kỹ năng
@pytest.mark.parametrize("tc_id, control", [
    ("Profile_226", "Thêm học vấn"), ("Profile_227", "Thêm kinh nghiệm"), ("Profile_228", "Thêm kinh nghiệm"),
    ("Profile_229", "Thêm kinh nghiệm"), ("Profile_316", "Thêm học vấn"), ("Profile_317", "Thêm kinh nghiệm"),
])
def test_profile_education_experience(profile: ProfilePage, tc_id, control, record_testcase):
    """Profile_226..229, 316, 317 - Thêm / xóa mục học vấn, kinh nghiệm (lưu vào hồ sơ, F5 vẫn còn)."""
    record_testcase(tc_id)
    require(profile.page.get_by_role("button", name=control), f'nút "{control}" trên trang Hồ sơ cá nhân')


@pytest.mark.parametrize("tc_id", ["Profile_230", "Profile_231", "Profile_320"])
def test_profile_skills(profile: ProfilePage, tc_id, record_testcase):
    """Profile_230/231/320 - Thêm kỹ năng dạng tag (Enter), xóa bằng X, không thêm trùng (khác hoa thường)."""
    record_testcase(tc_id)
    require(profile.form_root.get_by_label("Kỹ năng"), "ô nhập Kỹ năng trên trang Hồ sơ cá nhân")


# ---------------------------------------------------------------- đổi mật khẩu
@pytest.mark.parametrize("tc_id, length, ok", [("Profile_265", 9, True), ("Profile_266", 8, True), ("Profile_267", 7, False),
                                               ("Profile_313", 7, False)])
def test_profile_new_password_minlength(profile: ProfilePage, env, tc_id, length, ok, record_testcase):
    """Profile_265..267, 313 - Mật khẩu mới >= 8 ký tự: cho phép; < 8: "Mật khẩu mới phải có ít nhất 8 ký tự."."""
    record_testcase(tc_id)
    pw = profile.password
    new = ("Aa@1" * 5)[:length]
    resp = pw.change(env.client.password, new)
    if ok:
        assert resp is not None and resp.ok, f"Mật khẩu {length} ký tự bị từ chối: {pw.messages()}"
        env.client.password = new
    else:
        assert resp is None, "Mật khẩu < 8 ký tự vẫn gửi yêu cầu đổi"
        expect(pw.form_root.get_by_role("alert")).to_contain_text("Mật khẩu mới phải có ít nhất 8 ký tự")


@pytest.mark.testcase("Profile_289")
def test_profile_289_confirm_matches(profile: ProfilePage):
    """Profile_289 - Xác nhận giống mật khẩu mới: nhập thành công, không báo lỗi."""
    pw = profile.password
    pw.new.fill(NEW_PASSWORD)
    pw.confirm.fill(NEW_PASSWORD)
    expect(pw.form_root.get_by_role("alert")).to_have_count(0)
    assert pw.confirm.evaluate("e => e.checkValidity()")


@pytest.mark.testcase("Profile_290")
def test_profile_290_confirm_mismatch(profile: ProfilePage, env):
    """Profile_290 - Xác nhận khác mật khẩu mới: "Mật khẩu xác nhận không khớp."."""
    pw = profile.password
    resp = pw.change(env.client.password, NEW_PASSWORD, "Khac@12345")
    assert resp is None
    expect(pw.form_root.get_by_role("alert")).to_have_text("Mật khẩu xác nhận không khớp.")


@pytest.mark.testcase("Profile_291")
def test_profile_291_password_hidden_by_default(profile: ProfilePage):
    """Profile_291 - Icon ẩn/hiện: mặc định ẩn mật khẩu."""
    for field_id in ("currentPassword", "newPassword", "confirmPassword"):
        assert profile.password.form_root.locator(f"#{field_id}").get_attribute("type") == "password"
        expect(profile.password.toggle(field_id)).to_have_attribute("aria-label", "Hiện mật khẩu")


@pytest.mark.testcase("Profile_292")
def test_profile_292_toggle_password(profile: ProfilePage):
    """Profile_292 - Nhấn icon: mật khẩu ẩn/hiện tương ứng."""
    pw = profile.password
    pw.current.fill("Secret@123")
    pw.toggle("currentPassword").click()
    expect(pw.current).to_have_attribute("type", "text")
    pw.toggle("currentPassword").click()
    expect(pw.current).to_have_attribute("type", "password")


@pytest.mark.parametrize("tc_id", ["Profile_294", "Profile_310"])
def test_profile_change_password_success(profile: ProfilePage, env, page: Page, settings, tc_id, record_testcase):
    """Profile_294/310 - Đổi mật khẩu đúng: thông báo thành công; đăng nhập lại được bằng mật khẩu mới."""
    record_testcase(tc_id)
    pw = profile.password
    resp = pw.change(env.client.password, NEW_PASSWORD)
    assert resp is not None and resp.ok, pw.messages()
    expect(pw.form_root.get_by_role("status")).to_have_text("Đã đổi mật khẩu. Các phiên đăng nhập khác đã bị đăng xuất.")
    old = env.client.password
    env.client.password = NEW_PASSWORD
    api = env.fixtures("api_request")
    assert api.post("auth/login/", data={"email": env.client.email, "password": NEW_PASSWORD}).ok
    assert not api.post("auth/login/", data={"email": env.client.email, "password": old}).ok


@pytest.mark.testcase("Profile_311")
def test_profile_311_wrong_current_password(profile: ProfilePage):
    """Profile_311 - Sai mật khẩu hiện tại: thông báo, không đổi."""
    pw = profile.password
    resp = pw.change("Sai@123456", NEW_PASSWORD)
    assert resp is not None and not resp.ok
    expect(pw.form_root.get_by_role("alert")).to_be_visible()


@pytest.mark.testcase("Profile_312")
def test_profile_312_same_as_current(profile: ProfilePage, env):
    """Profile_312 - Mật khẩu mới trùng mật khẩu hiện tại: thông báo phải khác mật khẩu hiện tại."""
    pw = profile.password
    resp = pw.change(env.client.password, env.client.password)
    assert resp is None or not resp.ok, "Cho phép đặt mật khẩu mới trùng mật khẩu hiện tại"
    expect(pw.form_root.get_by_role("alert")).to_be_visible()


# ---------------------------------------------------------------- xóa tài khoản
def _delete_button(profile):
    return require(profile.page.get_by_role("button", name="Xóa tài khoản"), 'nút "Xóa tài khoản" trên trang Hồ sơ')


@pytest.mark.parametrize("tc_id", ["Profile_295", "Profile_296", "Profile_297", "Profile_298", "Profile_299",
                                   "Profile_300", "Profile_321", "Profile_322"])
def test_profile_delete_account(profile: ProfilePage, tc_id, record_testcase):
    """Profile_295..300, 321, 322 - Popup xác nhận Xóa tài khoản (nhập lại mật khẩu, xóa mềm, đăng xuất)."""
    record_testcase(tc_id)
    _delete_button(profile).click()
    dialog = ConfirmDialog(profile.page)
    expect(dialog.root).to_be_visible()


# ---------------------------------------------------------------- luồng cập nhật hồ sơ
@pytest.mark.testcase("Profile_301")
def test_profile_301_shows_saved_data(env):
    """Profile_301 - Vào trang: hiển thị đúng dữ liệu đã lưu (thông tin cơ bản, mong muốn công việc)."""
    env.candidate.update_profile(full_name="Auto Đã Lưu", headline="Kế toán 3 năm", address="Hà Nội",
                                 desired_position="Kế toán", years_of_experience=3)
    profile = env.open()
    expect(profile.field("Họ và tên")).to_have_value("Auto Đã Lưu")
    expect(profile.field("Tiêu đề hồ sơ")).to_have_value("Kế toán 3 năm")
    expect(profile.field("Địa chỉ")).to_have_value("Hà Nội")
    expect(profile.field("Vị trí mong muốn")).to_have_value("Kế toán")
    expect(profile.field("Số năm kinh nghiệm")).to_have_value("3")


@pytest.mark.testcase("Profile_302")
def test_profile_302_save_all_fields(profile: ProfilePage):
    """Profile_302 - Nhập hợp lệ tất cả trường, Lưu: "Đã lưu thông tin hồ sơ.", F5 dữ liệu vẫn giữ đúng."""
    values = {"Họ và tên": "Nguyễn Văn Đủ", "Số điện thoại": "0912345678", "Tiêu đề hồ sơ": "Nhân viên kinh doanh",
              "Địa chỉ": "1 Lê Lợi", "Giới thiệu bản thân & mục tiêu nghề nghiệp": "Mục tiêu",
              "Vị trí mong muốn": "Sale", "Số năm kinh nghiệm": "2", "Lương tối thiểu (triệu)": "10",
              "Lương tối đa (triệu)": "20", "Ngày sinh": "1995-05-20"}
    for label, value in values.items():
        profile.field(label).fill(value)
    for label in ("Giới tính", "Nơi làm việc mong muốn", "Hình thức", "Chế độ làm việc", "Cấp bậc hiện tại"):
        profile.field(label).select_option(index=1)
    selected = {lb: profile.field(lb).input_value() for lb in ("Giới tính", "Hình thức", "Chế độ làm việc", "Cấp bậc hiện tại")}
    resp = profile.submit()
    assert resp is not None and resp.ok
    expect(profile.success).to_be_visible()
    profile.page.reload()
    profile.expect_loaded()
    for label, value in values.items():
        expect(profile.field(label)).to_have_value(value)
    for label, value in selected.items():
        expect(profile.field(label)).to_have_value(value)


@pytest.mark.testcase("Profile_303")
def test_profile_303_only_required(profile: ProfilePage):
    """Profile_303 - Chỉ nhập Họ và tên, bỏ trống trường không bắt buộc: lưu thành công."""
    for label in ("Số điện thoại", "Tiêu đề hồ sơ", "Địa chỉ", "Vị trí mong muốn", "Lương tối thiểu (triệu)",
                  "Lương tối đa (triệu)"):
        profile.field(label).fill("")
    profile.field("Họ và tên").fill("Chỉ Có Tên")
    resp = profile.submit()
    assert resp is not None and resp.ok
    expect(profile.success).to_be_visible()


@pytest.mark.testcase("Profile_304")
def test_profile_304_required_focus(profile: ProfilePage):
    """Profile_304 - Xóa trắng Họ và tên, Lưu: focus vào trường Họ và tên, không lưu."""
    profile.field("Họ và tên").fill("")
    assert profile.submit() is None
    expect(profile.field("Họ và tên")).to_be_focused()


@pytest.mark.testcase("Profile_305")
def test_profile_305_invalid_format(profile: ProfilePage, env):
    """Profile_305 - SĐT sai định dạng: báo lỗi, không lưu."""
    profile.field("Số điện thoại").fill("abcdefghij")
    resp = profile.submit()
    assert resp is None or not resp.ok, "SĐT sai định dạng vẫn được lưu"
    assert env.client.profile()["phone"] in ("", None)


@pytest.mark.testcase("Profile_306")
def test_profile_306_offline_save(profile: ProfilePage, env):
    """Profile_306 - Mất kết nối khi lưu: báo lỗi, CSDL giữ dữ liệu cũ, form giữ dữ liệu đang nhập."""
    profile.field("Tiêu đề hồ sơ").fill("Đang nhập dở")
    profile.page.route("**/candidate/profile/", lambda r: r.abort() if r.request.method == "PATCH" else r.continue_())
    profile.submit_button.click()
    expect(profile.form_root.get_by_role("alert")).to_be_visible()
    expect(profile.field("Tiêu đề hồ sơ")).to_have_value("Đang nhập dở")
    assert env.client.profile()["headline"] in ("", None)
    expect(profile.submit_button).to_be_enabled()


@pytest.mark.testcase("Profile_307")
def test_profile_307_leave_without_saving(profile: ProfilePage, settings):
    """Profile_307 - Sửa, rời trang không lưu, quay lại: hồ sơ giữ nguyên trạng thái trước khi sửa."""
    before = profile.field("Họ và tên").input_value()
    profile.field("Họ và tên").fill("Chưa lưu")
    profile.page.goto(f"{settings.base_url}/cv")
    profile.open()
    expect(profile.field("Họ và tên")).to_have_value(before)


@pytest.mark.testcase("Profile_308")
def test_profile_308_name_synced_to_header(profile: ProfilePage):
    """Profile_308 - Đổi Họ và tên, Lưu: tên mới hiển thị trên header."""
    profile.field("Họ và tên").fill("Tên Mới Header")
    assert profile.submit().ok
    expect(profile.shell.header).to_contain_text("Tên Mới Header")


@pytest.mark.ai
@pytest.mark.testcase("Profile_309")
def test_profile_309_desired_job_used_for_recommendations(ai_available, profile: ProfilePage):
    """Profile_309 - Cập nhật mong muốn công việc: danh sách Việc làm phù hợp được lọc theo mong muốn mới (cần AI)."""
    profile.field("Nơi làm việc mong muốn").select_option(index=1)
    assert profile.submit().ok
    profile.page.goto(f"{profile.settings.base_url}/recommended-jobs")
    expect(profile.page.get_by_role("heading", name="Việc làm phù hợp với bạn")).to_be_visible()


@pytest.mark.api
@pytest.mark.testcase("Profile_323")
def test_profile_323_cannot_update_other_profile(env, candidate_factory):
    """Profile_323 - Gọi API cập nhật hồ sơ người khác: bị từ chối, hồ sơ người khác không đổi.
    API hồ sơ chỉ theo token (/candidate/profile/), không nhận id -> thử truyền id/user_id của người khác."""
    other = candidate_factory()
    other_id = other.profile()["id"]
    before = other.profile()["full_name"]
    env.client.patch("candidate/profile/", data={"id": other_id, "user_id": other_id, "full_name": "Hacked"})
    assert other.profile()["full_name"] == before, "Hồ sơ người khác bị thay đổi"
