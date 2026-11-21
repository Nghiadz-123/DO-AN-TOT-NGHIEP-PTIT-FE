"""Đặc tả màn hình Admin (KBKTCN sheet "Admin", Admin_1..178)."""
from __future__ import annotations

from pages.admin_pages import AdminCompaniesPage, AdminDashboard, AdminJobsPage, AdminUsersPage
from pages.form_base import page_factory
from specs.model import ADMIN, CANDIDATE, Screen, Widget
from utils.ats_api import results

DASHBOARD, USERS, COMPANIES, JOBS = "admin_dashboard", "admin_users", "admin_companies", "admin_jobs"
LANDING = (CANDIDATE, r"/?$")


def _target_user(env) -> None:
    """Mỗi test: 1 ứng viên mới làm đối tượng thao tác (không đụng tài khoản demo)."""
    env.data["user"] = env.fixtures("candidate_factory")()


def _target_company(env) -> None:
    emp = env.fixtures("employer_factory")()
    env.data["employer"] = emp
    env.data["company"] = emp.company()


def _target_job(env) -> None:
    env.data["job"] = env.fixtures("shared_employer").create_job(env.public)


def _user_state(env):
    return next(u for u in results(env.client.users(q=env.data["user"].email)))["is_active"]


def _company_state(env):
    return next(c for c in results(env.client.companies(q=env.data["company"]["name"])))["verification_status"]


def _job_state(env):
    return next(j for j in results(env.client.jobs(q=env.data["job"]["title"])))["status"]


SCREENS = [
    Screen(key=DASHBOARD, function="Tổng quan hệ thống", mark="admin", page=page_factory(AdminDashboard), role=ADMIN,
           path="/admin", heading="Tổng quan hệ thống", wrong_role=LANDING,
           load_api="**/admin/overview/", load_label="Đang tải số liệu hệ thống",
           layout_items=(("text", "Người dùng"), ("text", "Doanh nghiệp"), ("text", "Tin tuyển dụng"),
                         ("text", "Lượt ứng tuyển"), ("region", "Người dùng mới"), ("region", "Doanh nghiệp mới"))),
    Screen(key=USERS, function="Quản lý người dùng", mark="admin", page=page_factory(AdminUsersPage), role=ADMIN,
           path="/admin/users", heading="Người dùng", wrong_role=LANDING, prepare=_target_user,
           load_api="**/admin/users/?*", load_label="Đang tải danh sách người dùng",
           layout_items=(("label", "Tìm theo tên, email hoặc số điện thoại"), ("label", "Vai trò"), ("button", "Tìm"))),
    Screen(key=COMPANIES, function="Quản lý doanh nghiệp", mark="admin", page=page_factory(AdminCompaniesPage),
           role=ADMIN, path="/admin/companies", heading="Doanh nghiệp", wrong_role=LANDING, prepare=_target_company,
           load_api="**/admin/companies/?*", load_label="Đang tải danh sách doanh nghiệp",
           layout_items=(("label", "Tìm theo tên doanh nghiệp"), ("label", "Trạng thái xác minh"), ("button", "Tìm"))),
    Screen(key=JOBS, function="Quản lý tin tuyển dụng", mark="admin", page=page_factory(AdminJobsPage), role=ADMIN,
           path="/admin/jobs", heading="Tin tuyển dụng", wrong_role=LANDING, prepare=_target_job,
           load_api="**/admin/jobs/?*", load_label="Đang tải danh sách tin tuyển dụng",
           layout_items=(("label", "Tìm theo tiêu đề công việc"), ("label", "Trạng thái tin"), ("button", "Tìm"))),
]


def _row_action(text_of, label):
    """Mở popup: tìm đúng bản ghi rồi nhấn nút thao tác trên dòng."""
    def _do(po, env):
        text = text_of(env)
        po.search(text)
        po.act(text, label)
    return _do


_user = lambda env: env.data["user"].email  # noqa: E731
_company = lambda env: env.data["company"]["name"]  # noqa: E731
_job = lambda env: env.data["job"]["title"]  # noqa: E731

WIDGETS = [
    Widget(USERS, "Textbox Tìm người dùng", "search", label="Tìm người dùng", sample=_user),
    Widget(USERS, "Combobox Vai trò", "select", label="Vai trò"),
    Widget(USERS, "Combobox Trạng thái", "select", label="Trạng thái",
           locate=lambda po: po.page.locator("main").get_by_label("Trạng thái", exact=True)),
    Widget(USERS, "Popup xác nhận Khóa tài khoản", "popup", extra={"open": _row_action(_user, "Khóa"), "state": _user_state}),
    Widget(COMPANIES, "Textbox Tìm doanh nghiệp", "search", label="Tìm doanh nghiệp", sample=_company),
    Widget(COMPANIES, "Combobox Trạng thái xác minh", "select", label="Trạng thái xác minh"),
    Widget(COMPANIES, "Popup xác nhận Từ chối xác minh", "popup",
           extra={"open": _row_action(_company, "Từ chối"), "state": _company_state}),
    Widget(JOBS, "Textbox Tìm tin tuyển dụng", "search", label="Tìm tin tuyển dụng", sample=_job),
    Widget(JOBS, "Combobox Trạng thái tin", "select", label="Trạng thái tin"),
    Widget(JOBS, "Popup xác nhận Đóng tin", "popup", extra={"open": _row_action(_job, "Đóng tin"), "state": _job_state}),
]
