"""Đặc tả màn hình của Ứng viên ngoài CV: Hồ sơ cá nhân, Việc làm phù hợp, Ứng tuyển, Đơn ứng tuyển, Thư mời,
Yêu thích (KBKTCN sheet "Hồ sơ cá nhân" và "Ứng viên" Candidate_256..429)."""
from __future__ import annotations

from pages.form_base import page_factory
from pages.profile_page import ChangePasswordSection, ProfilePage
from specs.model import CANDIDATE, EMPLOYER, Screen, Widget

PROFILE = "profile"
CHANGE_PASSWORD = "profile_password"


def _to_float(v: str):
    return float(v) if v not in ("", None) else None


def _password_po(page, settings, env):
    """Form Đổi mật khẩu nằm trong trang Hồ sơ cá nhân: mở trang hồ sơ rồi trả về phần form đổi mật khẩu."""

    class _Opened(ChangePasswordSection):
        def open(self, **_):
            ProfilePage(self.page, self.settings).open()
            return self

    po = _Opened(page, settings)
    po.env = env
    return po


SCREENS = [
    Screen(
        key=PROFILE, function="Hồ sơ cá nhân", mark="profile", page=page_factory(ProfilePage), role=CANDIDATE,
        path="/profile", heading="Hồ sơ cá nhân", wrong_role=(EMPLOYER, r"/recruiter/?$"),
        load_api="**/candidate/profile/", load_label="Đang tải hồ sơ",
        layout_items=(
            ("heading", "Hồ sơ cá nhân"), ("label", "Ảnh đại diện"), ("label", "Họ và tên"),
            ("label", "Số điện thoại"), ("label", "Email"), ("label", "Ngày sinh"), ("label", "Giới tính"),
            ("label", "Tiêu đề hồ sơ"), ("label", "Địa chỉ"), ("label", "Giới thiệu bản thân & mục tiêu nghề nghiệp"),
            ("label", "Vị trí mong muốn"), ("label", "Nơi làm việc mong muốn"), ("label", "Hình thức"),
            ("label", "Chế độ làm việc"), ("label", "Cấp bậc hiện tại"), ("label", "Số năm kinh nghiệm"),
            ("label", "Lương tối thiểu (triệu)"), ("label", "Lương tối đa (triệu)"), ("switch", "Đang tìm việc"),
            ("switch", "Cho phép nhà tuyển dụng tìm thấy hồ sơ"), ("button", "Lưu thay đổi"),
            ("heading", "Đổi mật khẩu"), ("button", "Đổi mật khẩu"), ("button", "Xóa tài khoản"),
        ),
    ),
    Screen(key=CHANGE_PASSWORD, function="Hồ sơ cá nhân", mark="profile", page=_password_po, role=CANDIDATE,
           path="/profile", groups_layout=(), groups_access=(), groups_loading=(), fresh=True),
]


def _profile_text(group: str, label: str, key: str, **kw) -> Widget:
    return Widget(PROFILE, group, kw.pop("kind", "text"), label=label, key=key, **kw)


def _profile_number(group: str, label: str, key: str) -> Widget:
    return Widget(PROFILE, group, "number", label=label, key=key, valid="5", to_saved=_to_float)


WIDGETS = [
    _profile_text("Textbox Họ và tên", "Họ và tên", "fullName", required=True, valid="Nguyễn Văn Auto",
                  default=lambda env: env.client.full_name),
    _profile_text("Textbox Số điện thoại", "Số điện thoại", "phone", kind="phone", valid="0912345678"),
    # Tài liệu yêu cầu ô Email chỉ đọc hiển thị email đăng nhập; trang hiện chỉ in email dưới tiêu đề (không có ô)
    _profile_text("Textbox Email", "Email", "email", default=lambda env: env.client.email),
    _profile_text("Datepicker Ngày sinh", "Ngày sinh", "dateOfBirth", kind="date"),
    Widget(PROFILE, "Combobox Giới tính", "select", label="Giới tính", key="gender"),
    _profile_text("Textbox Tiêu đề hồ sơ", "Tiêu đề hồ sơ", "headline"),
    _profile_text("Textbox Địa chỉ", "Địa chỉ", "address"),
    _profile_text("Textarea Giới thiệu bản thân & mục tiêu nghề nghiệp", "Giới thiệu bản thân & mục tiêu nghề nghiệp",
                  "summary", kind="textarea"),
    _profile_text("Textbox Vị trí mong muốn", "Vị trí mong muốn", "desiredPosition"),
    Widget(PROFILE, "Combobox Nơi làm việc mong muốn", "select", label="Nơi làm việc mong muốn", key="locationId"),
    Widget(PROFILE, "Combobox Hình thức", "select", label="Hình thức", key="type"),
    Widget(PROFILE, "Combobox Chế độ làm việc", "select", label="Chế độ làm việc", key="workMode"),
    Widget(PROFILE, "Combobox Cấp bậc hiện tại", "select", label="Cấp bậc hiện tại", key="level"),
    _profile_number("Textbox Số năm kinh nghiệm", "Số năm kinh nghiệm", "yearsOfExperience"),
    _profile_number("Textbox Lương tối thiểu (triệu)", "Lương tối thiểu (triệu)", "salaryMin"),
    _profile_number("Textbox Lương tối đa (triệu)", "Lương tối đa (triệu)", "salaryMax"),
    Widget(PROFILE, "Text link CV của tôi", "label", locate=lambda po: po.cv_link, extra={"text": "CV của tôi"}),
    Widget(PROFILE, "Button Lưu thay đổi", "label", locate=lambda po: po.submit_button, extra={"text": "Lưu thay đổi"}),
    # ---------- Đổi mật khẩu
    Widget(CHANGE_PASSWORD, "Textbox Mật khẩu hiện tại", "password", label="Mật khẩu hiện tại", key="current", required=True,
           locate=lambda po: po.current, valid=lambda env: env.client.password),
    Widget(CHANGE_PASSWORD, "Textbox Mật khẩu mới", "password", label="Mật khẩu mới", key="new", required=True,
           locate=lambda po: po.new, valid="NewAuto@12345"),
    Widget(CHANGE_PASSWORD, "Textbox Xác nhận mật khẩu mới", "password", label="Xác nhận mật khẩu mới", key="new", required=True,
           locate=lambda po: po.confirm, valid="NewAuto@12345"),
    Widget(CHANGE_PASSWORD, "Button Đổi mật khẩu", "label", locate=lambda po: po.submit_button,
           extra={"text": "Đổi mật khẩu"}),
]


# ================================================================ Ứng viên: Candidate_256..429
from pages.candidate_pages import (  # noqa: E402
    ApplyScreen, FavoritesPage, InvitationsPage, MyApplicationsPage, RecommendedJobsPage, WithdrawForm,
)

RECOMMENDED, APPLY, MY_APPS, WITHDRAW, INVITATIONS, FAVORITES = (
    "recommended_jobs", "apply", "my_applications", "withdraw", "invitations", "favorites")

INVITATIONS_MISSING = ("backend chưa có API thư mời ứng tuyển (/candidate/invitations/ trả 404 – "
                       "BE/backend/apps/invitations chỉ còn migrations, config/api_urls.py không include)")

SCREENS += [
    Screen(
        key=RECOMMENDED, function="Việc làm phù hợp", mark="recommended_jobs", page=page_factory(RecommendedJobsPage), cvs=("pdf", "docx"),
        path="/recommended-jobs", heading="Việc làm phù hợp với bạn", wrong_role=(EMPLOYER, r"/recruiter/?$"),
        layout_items=(("label", "Dựa trên CV"), ("button", "Tất cả"), ("button", "Từ 50 điểm"),
                      ("button", "Từ 70 điểm"), ("region", "Việc làm phù hợp")),
    ),
    Screen(
        key=APPLY, function="Ứng tuyển việc làm", mark="apply", page=page_factory(ApplyScreen), cvs=("pdf", "docx"),
        layout_items=(("radio", ""), ("link", "Tải CV khác"), ("label", "Thư giới thiệu (không bắt buộc)"),
                      ("button", "Hủy"), ("button", "Nộp hồ sơ"), ("text", "AI đánh giá mức độ phù hợp")),
    ),
    Screen(
        key=MY_APPS, function="Đơn ứng tuyển của tôi", mark="my_applications", page=page_factory(MyApplicationsPage),
        path="/my-applications", heading="Đơn ứng tuyển của tôi", wrong_role=(EMPLOYER, r"/recruiter/?$"),
        load_api="**/candidate/applications/?*", load_label="Đang tải đơn ứng tuyển",
        layout_items=(("text", "Theo dõi trạng thái các hồ sơ bạn đã nộp"), ("link", "Tìm thêm việc làm")),
    ),
    Screen(key=WITHDRAW, function="Đơn ứng tuyển của tôi", mark="my_applications", page=page_factory(WithdrawForm), cvs=("pdf",),
           groups_layout=(), groups_access=(), groups_loading=()),
    Screen(
        key=INVITATIONS, function="Thư mời ứng tuyển", mark="invitations", page=page_factory(InvitationsPage),
        path="/invitations", heading="Thư mời ứng tuyển", env_missing=INVITATIONS_MISSING,
    ),
    Screen(
        key=FAVORITES, function="Yêu thích", mark="favorites", page=page_factory(FavoritesPage),
        path="/favorites", heading="Yêu thích", wrong_role=(EMPLOYER, r"/recruiter/?$"),
        layout_items=(("text", "Việc làm và công ty bạn đã lưu để xem lại hoặc ứng tuyển sau"),
                      ("button", "Việc làm"), ("button", "Công ty")),
    ),
]

WIDGETS += [
    Widget(RECOMMENDED, "Combobox Dựa trên CV", "select", label="Dựa trên CV",
           locate=lambda po: po.cv_select,
           default=lambda env: next(c["title"] for c in env.client.list_cvs() if c["is_default"]),
           extra={"options": lambda env: [c["title"] for c in env.client.list_cvs()]}),
    Widget(APPLY, "Textarea Thư giới thiệu", "textarea", locate=lambda po: po.cover_letter, key="coverLetter"),
    Widget(APPLY, "Button Nộp hồ sơ", "label", locate=lambda po: po.submit_button, extra={"text": "Nộp hồ sơ"}),
    Widget(APPLY, "Button Hủy", "label", locate=lambda po: po.cancel_button, extra={"text": "Hủy"}),
    Widget(WITHDRAW, "Textarea Lý do (không bắt buộc)", "textarea", locate=lambda po: po.form_root.get_by_label(
        "Lý do (không bắt buộc)"), key="reason"),
]
