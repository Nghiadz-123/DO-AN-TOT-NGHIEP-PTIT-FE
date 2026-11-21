"""Đặc tả màn hình Nhà tuyển dụng (KBKTCN sheet "Nhà tuyển dụng", Recruiter_1..766)."""
from __future__ import annotations

from pages.form_base import page_factory
from pages.profile_page import ChangePasswordSection
from pages.recruiter_pages import (
    ApplicantDetailPage, ApplicantNoteForm, ApplicantsPage, CompanyProfileForm, JobFormPage, ManageJobsPage,
    RecruiterAccountForm, RecruiterDashboard, TalentPoolPage,
)
from specs.model import CANDIDATE, EMPLOYER, Screen, Widget
from utils.ats_api import results
from utils.feature import require
from utils.constants_fe import JOB_LEVELS, JOB_TYPES, WORK_MODES

DASHBOARD, COMPANY, MANAGE_JOBS, JOB_FORM, APPLICANTS, APPLICANT_DETAIL, APPLICANT_NOTE, TALENTS, ACCOUNT = (
    "rec_dashboard", "rec_company", "rec_jobs", "rec_job_form", "rec_applicants", "rec_applicant_detail",
    "rec_applicant_note", "rec_talents", "rec_account")

TALENTS_MISSING = ("backend chưa có API Tìm ứng viên / Thư mời (/employer/talents/ và /employer/invitations/ trả 404 – "
                   "apps/talents/urls.py chỉ có suggested-candidates và talents/<id>/cv, apps/invitations không còn mã nguồn)")

CANDIDATE_LANDING = (CANDIDATE, r"/?$")
COMPANY_SIZES = ["1 - 10 nhân viên", "11 - 50 nhân viên", "51 - 200 nhân viên", "201 - 500 nhân viên",
                 "501 - 1000 nhân viên", "Trên 1000 nhân viên"]
APPLICATION_STATUSES = ["Mới ứng tuyển", "Đang sàng lọc", "Phỏng vấn", "Đề nghị nhận việc", "Đã tuyển", "Từ chối",
                        "Ứng viên đã rút"]


# ---------------------------------------------------------------- chuẩn bị dữ liệu
def _new_job(env) -> None:
    """Mỗi test: 1 tin mới của NTD (dùng chung tài khoản theo màn hình)."""
    env.data["job"] = env.client.create_job(env.public)


def _new_application(env) -> None:
    """Mỗi test: 1 tin mới + 1 đơn của ứng viên dùng chung."""
    _new_job(env)
    applicant = env.fixtures("shared_applicant")
    env.data["application_id"] = applicant.apply(env.data["job"]["id"])["id"]
    env.data["applicant"] = applicant


def _job_titles(env) -> str:
    items = results(env.client.my_jobs(page_size=50))
    return items[0]["title"] if items else ""


def _applicant_name(env) -> str:
    return env.fixtures("shared_applicant").full_name


def _catalog(kind: str, placeholder: str):
    def _get(env):
        items = env.public.locations() if kind == "locations" else env.public.industries()
        return [placeholder] + [i["name"] for i in items]
    return _get


def _fixed(placeholder: str | None, labels):
    return lambda env: ([placeholder] if placeholder else []) + list(labels)


def _job_state(env):
    return env.client.job(env.data["job"]["id"])["status"]


def _application_state(env):
    return env.client.application(env.data["application_id"])["status"]


SCREENS = [
    Screen(key=DASHBOARD, function="Dashboard nhà tuyển dụng", mark="recruiter", page=page_factory(RecruiterDashboard),
           role=EMPLOYER, path="/recruiter", heading="", wrong_role=CANDIDATE_LANDING,
           load_api="**/employer/dashboard/", load_label="Đang tải số liệu tuyển dụng",
           layout_items=(("text", "Tin đang tuyển"), ("text", "Tổng hồ sơ"), ("text", "Hồ sơ mới chưa xử lý"),
                         ("text", "Đang trong quy trình"), ("region", "Quy trình tuyển dụng"),
                         ("region", "Hồ sơ mới nhận"), ("text", "Điểm AI trung bình"))),
    Screen(key=COMPANY, function="Hồ sơ công ty", mark="recruiter", page=page_factory(CompanyProfileForm), role=EMPLOYER,
           path="/recruiter/company", heading="Hồ sơ công ty", wrong_role=CANDIDATE_LANDING,
           load_api="**/employer/company/", load_label="Đang tải hồ sơ công ty",
           layout_items=(("region", "Logo công ty"), ("label", "Tên công ty"), ("label", "Mã số thuế"),
                         ("label", "Ngành nghề"), ("label", "Quy mô"), ("label", "Năm thành lập"), ("label", "Website"),
                         ("label", "Email liên hệ"), ("label", "Điện thoại"), ("label", "Tỉnh/thành phố"),
                         ("label", "Địa chỉ"), ("label", "Giới thiệu công ty"), ("button", "Lưu hồ sơ công ty"))),
    Screen(key=MANAGE_JOBS, function="Tin tuyển dụng", mark="recruiter", page=page_factory(ManageJobsPage), role=EMPLOYER,
           path="/recruiter/jobs", heading="Tin tuyển dụng", wrong_role=CANDIDATE_LANDING, prepare=_new_job,
           load_api="**/employer/jobs/?*", load_label="Đang tải tin tuyển dụng",
           layout_items=(("label", "Tìm theo tiêu đề tin"), ("group", "Lọc theo trạng thái tin"),
                         ("link", "Đăng tin mới"))),
    Screen(key=JOB_FORM, function="Đăng tin tuyển dụng", mark="recruiter", page=page_factory(JobFormPage), role=EMPLOYER,
           path="/recruiter/jobs/new", heading="Đăng tin tuyển dụng mới", wrong_role=CANDIDATE_LANDING,
           layout_items=(("label", "Tiêu đề công việc"), ("label", "Ngành nghề"), ("label", "Hình thức"),
                         ("label", "Chế độ làm việc"), ("label", "Cấp bậc"), ("label", "Tỉnh/thành phố"),
                         ("label", "Số lượng tuyển"), ("label", "Kinh nghiệm tối thiểu (năm)"),
                         ("label", "Địa chỉ làm việc"), ("label", "Lương tối thiểu (triệu)"),
                         ("label", "Lương tối đa (triệu)"), ("label", "Hạn nộp hồ sơ"), ("label", "Kỹ năng"),
                         ("label", "Mô tả công việc"), ("label", "Yêu cầu ứng viên"), ("label", "Quyền lợi"),
                         ("button", "Lưu nháp"), ("button", "Đăng tin"))),
    Screen(key=APPLICANTS, function="Ứng viên & AI sàng lọc", mark="recruiter", page=page_factory(ApplicantsPage),
           role=EMPLOYER, path="/recruiter/applicants", heading="", wrong_role=CANDIDATE_LANDING, prepare=_new_application,
           load_api="**/employer/applications/?*", load_label="Đang tải hồ sơ ứng tuyển",
           layout_items=(("label", "Tin tuyển dụng"), ("label", "Trạng thái"), ("label", "Sắp xếp"),
                         ("label", "Tìm ứng viên theo tên, email, số điện thoại"), ("button", "Sàng lọc bằng AI"))),
    Screen(key=APPLICANT_DETAIL, function="Chi tiết hồ sơ ứng viên", mark="recruiter",
           page=page_factory(ApplicantDetailPage), role=EMPLOYER, prepare=_new_application, heading="",
           wrong_role=CANDIDATE_LANDING, path="/recruiter/applicants/00000000-0000-0000-0000-000000000000",
           layout_items=(("region", "CV đã nộp"), ("text", "Đánh giá của bạn"), ("text", "Lịch sử"),
                         ("text", "Báo cáo AI"))),
    Screen(key=APPLICANT_NOTE, function="Chi tiết hồ sơ ứng viên", mark="recruiter", page=page_factory(ApplicantNoteForm),
           role=EMPLOYER, prepare=_new_application, groups_layout=(), groups_access=(), groups_loading=()),
    Screen(key=TALENTS, function="Tìm ứng viên & Thư mời", mark="recruiter", page=page_factory(TalentPoolPage),
           role=EMPLOYER, path="/recruiter/talent-pool", heading="Tìm ứng viên", env_missing=TALENTS_MISSING),
    Screen(key=ACCOUNT, function="Tài khoản nhà tuyển dụng", mark="recruiter", page=page_factory(RecruiterAccountForm),
           role=EMPLOYER, path="/recruiter/account", heading="Tài khoản", fresh=False,
           layout_items=(("label", "Họ và tên"), ("label", "Email đăng nhập"), ("label", "Số điện thoại"),
                         ("label", "Chức danh"), ("button", "Lưu thông tin"), ("heading", "Đổi mật khẩu"))),
]


def _w(screen, group, kind, label="", key="", **kw) -> Widget:
    return Widget(screen, group, kind, label=label, key=key, **kw)


WIDGETS = [
    # ---------- Hồ sơ công ty
    _w(COMPANY, "Textbox Tên công ty", "text", "Tên công ty", "name", required=True, valid="Công ty Kiểm Thử",
       default=lambda env: env.client.company()["name"]),
    _w(COMPANY, "Textbox Mã số thuế", "text", "Mã số thuế", "taxCode", valid="0101234567"),
    _w(COMPANY, "Combobox Ngành nghề", "select", "Ngành nghề", "industryId", extra={"options": _catalog("industries", "Chọn ngành nghề")}),
    _w(COMPANY, "Combobox Quy mô", "select", "Quy mô", "companySize", extra={"options": _fixed("Chọn quy mô", COMPANY_SIZES)}),
    _w(COMPANY, "Textbox Năm thành lập", "number", "Năm thành lập", "foundedYear", valid="2010", to_saved=int),
    _w(COMPANY, "Textbox Website", "url", "Website", "website", valid="https://example.com"),
    _w(COMPANY, "Textbox Email liên hệ", "email", "Email liên hệ", "email", valid="lienhe@example.com"),
    _w(COMPANY, "Textbox Điện thoại", "phone", "Điện thoại", "phone", valid="0912345678"),
    _w(COMPANY, "Combobox Tỉnh/thành phố", "select", "Tỉnh/thành phố", "locationId",
       extra={"options": _catalog("locations", "Chọn địa điểm")}),
    _w(COMPANY, "Textbox Địa chỉ", "text", "Địa chỉ", "address"),
    _w(COMPANY, "Textarea Giới thiệu công ty", "textarea", "Giới thiệu công ty", "description"),
    _w(COMPANY, "Button Lưu hồ sơ công ty", "label", locate=lambda po: po.submit_button, extra={"text": "Lưu hồ sơ công ty"}),
    # ---------- Tin tuyển dụng
    _w(MANAGE_JOBS, "Textbox Tìm theo tiêu đề tin", "search", "Tìm theo tiêu đề tin", sample=_job_titles),
    _w(MANAGE_JOBS, "Phân trang", "pagination", sample=lambda env: env.data["job"]["title"]),
    _w(MANAGE_JOBS, "Popup xác nhận Đóng tin", "popup", extra={
        "open": lambda po, env: po.action(env.data["job"]["title"], "Đóng tin"), "state": _job_state}),
    _w(MANAGE_JOBS, "Popup xác nhận Xóa tin", "popup", extra={
        "open": lambda po, env: po.action(env.data["job"]["title"], "Xóa tin"), "state": _job_state}),
    # ---------- Đăng tin
    _w(JOB_FORM, "Textbox Tiêu đề công việc", "text", "Tiêu đề công việc", "title", required=True, valid="Kế toán viên"),
    _w(JOB_FORM, "Combobox Ngành nghề", "select", "Ngành nghề", extra={"options": _catalog("industries", "Chọn ngành nghề")}),
    _w(JOB_FORM, "Combobox Hình thức", "select", "Hình thức", extra={"options": _fixed(None, [l for _, l in JOB_TYPES])}),
    _w(JOB_FORM, "Combobox Chế độ làm việc", "select", "Chế độ làm việc",
       extra={"options": _fixed(None, [l for _, l in WORK_MODES])}),
    _w(JOB_FORM, "Combobox Cấp bậc", "select", "Cấp bậc", extra={"options": _fixed(None, [l for _, l in JOB_LEVELS])}),
    _w(JOB_FORM, "Combobox Tỉnh/thành phố", "select", "Tỉnh/thành phố", extra={"options": _catalog("locations", "Chọn địa điểm")}),
    _w(JOB_FORM, "Textbox Số lượng tuyển", "number", "Số lượng tuyển", "headcount", valid="5", to_saved=int),
    _w(JOB_FORM, "Textbox Kinh nghiệm tối thiểu (năm)", "number", "Kinh nghiệm tối thiểu (năm)", "minYearsExperience",
       valid="2", to_saved=int),
    _w(JOB_FORM, "Textbox Địa chỉ làm việc", "text", "Địa chỉ làm việc", "address"),
    _w(JOB_FORM, "Textbox Lương tối thiểu (triệu)", "number", "Lương tối thiểu (triệu)", "salaryMin", valid="10", to_saved=float),
    _w(JOB_FORM, "Textbox Lương tối đa (triệu)", "number", "Lương tối đa (triệu)", "salaryMax", valid="20", to_saved=float),
    _w(JOB_FORM, "Datepicker Hạn nộp", "date", "Hạn nộp hồ sơ", "deadline", required=True),
    _w(JOB_FORM, "Kỹ năng yêu cầu", "skills", "Kỹ năng", required=True, locate=lambda po: po.skills),
    _w(JOB_FORM, "Textarea Mô tả công việc", "textarea", "Mô tả công việc", "description", required=True),
    _w(JOB_FORM, "Textarea Yêu cầu ứng viên", "textarea", "Yêu cầu ứng viên", "requirements", required=True),
    _w(JOB_FORM, "Textarea Quyền lợi", "textarea", "Quyền lợi", "benefits"),
    _w(JOB_FORM, "Button Đăng tin", "label", locate=lambda po: po.submit_button, extra={"text": "Đăng tin"}),
    _w(JOB_FORM, "Button Lưu nháp", "label", locate=lambda po: po.draft_button, extra={"text": "Lưu nháp"}),
    # ---------- Ứng viên
    _w(APPLICANTS, "Combobox Tin tuyển dụng", "select", "Tin tuyển dụng", locate=lambda po: po.job_select,
       default=lambda env: "Tất cả tin tuyển dụng"),
    _w(APPLICANTS, "Combobox Trạng thái", "select", "Trạng thái", locate=lambda po: po.status_select,
       extra={"options": _fixed("Tất cả trạng thái", APPLICATION_STATUSES)}),
    _w(APPLICANTS, "Combobox Sắp xếp", "select", "Sắp xếp", locate=lambda po: po.sort_select),
    _w(APPLICANTS, "Textbox Tìm ứng viên", "search", "Tìm ứng viên", locate=lambda po: po.search_box, sample=_applicant_name),
    _w(APPLICANTS, "Phân trang", "pagination", sample=_applicant_name),
    _w(APPLICANTS, "Popup xác nhận Từ chối hồ sơ", "popup", extra={
        "open": lambda po, env: po.row(env.data["job"]["title"]).first.get_by_role(
            "combobox", name=f"Trạng thái hồ sơ của {env.data['applicant'].full_name}").select_option(label="Từ chối"),
        "state": _application_state}),
    _w(APPLICANTS, "Popup xác nhận Mời phỏng vấn ứng viên tiềm năng", "popup", extra={
        "open": lambda po, env: require(po.page.get_by_role("button", name="Mời phỏng vấn"),
                                        'nút "Mời phỏng vấn" ứng viên tiềm năng sau AI sàng lọc').click(),
        "state": _application_state}),
    # ---------- Chi tiết hồ sơ: ghi chú nội bộ (popup chuyển trạng thái)
    _w(APPLICANT_NOTE, "Textarea Ghi chú nội bộ", "textarea", "Ghi chú nội bộ", "note",
       locate=lambda po: po.form_root.get_by_label("Ghi chú nội bộ")),
    # ---------- Tìm ứng viên & Thư mời (backend chưa có API -> Screen.env_missing: test skip lỗi môi trường)
    _w(TALENTS, "Textbox Tìm ứng viên", "search", "Tìm ứng viên"),
    _w(TALENTS, "Combobox Địa điểm", "select", "Địa điểm"),
    _w(TALENTS, "Combobox Cấp bậc", "select", "Cấp bậc"),
    _w(TALENTS, "Popup xác nhận Thu hồi thư mời", "popup"),
    # ---------- Ứng viên: nút AI
    _w(APPLICANTS, "Button Sàng lọc bằng AI", "label",
       locate=lambda po: require(po.page.get_by_role("button", name="Sàng lọc bằng AI"),
                                 'nút "Sàng lọc bằng AI" (FEATURES.ai = false)'), extra={"text": "Sàng lọc bằng AI"}),
    # ---------- Tài khoản NTD
    _w(ACCOUNT, "Textbox Họ và tên", "text", "Họ và tên", "fullName", required=True, valid="Nguyễn Văn NTD",
       default=lambda env: env.client.profile()["full_name"]),
    _w(ACCOUNT, "Textbox Email đăng nhập", "text", "Email đăng nhập", default=lambda env: env.client.email),
    _w(ACCOUNT, "Textbox Số điện thoại", "phone", "Số điện thoại", "phone", valid="0912345678"),
    _w(ACCOUNT, "Textbox Chức danh", "text", "Chức danh", "position"),
    _w(ACCOUNT, "Button Lưu thông tin", "label", locate=lambda po: po.submit_button, extra={"text": "Lưu thông tin"}),
]
