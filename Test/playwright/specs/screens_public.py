"""Đặc tả màn hình công khai (KBKTCN sheet "Trang chủ"): Trang chủ, Tìm kiếm và lọc việc làm, Chi tiết tin
tuyển dụng, Công ty."""
from __future__ import annotations

from pages.candidate_pages import JobDetailPage
from pages.form_base import page_factory
from pages.public_pages import CompanyListPage, HomeSearch, JobListPage
from specs.model import GUEST, Screen, Widget
from utils.ats_api import results
from utils.constants_fe import JOB_LEVELS, JOB_TYPES, POSTED_WITHIN

HOME, JOBS, JOB_DETAIL, COMPANIES = "home", "jobs", "job_detail", "companies"


def _job_title(env) -> str:
    jobs = results(env.public.jobs(page_size=50))
    return jobs[0]["title"] if jobs else ""


def _company_name(env) -> str:
    items = [c for c in results(env.public.companies(page_size=50)) if c.get("name")]
    return items[0]["name"] if items else ""


def _shared_job(env) -> None:
    env.data["job_id"] = env.fixtures("shared_employer").jobs[0]["id"]


def _names(kind: str, placeholder: str):
    def _get(env):
        items = env.public.locations() if kind == "locations" else env.public.industries()
        return [placeholder] + [i["name"] for i in items]
    return _get


def _fixed(placeholder: str, options):
    return lambda env: [placeholder] + [o[1] for o in options]


SCREENS = [
    Screen(key=HOME, function="Trang chủ", mark="home", page=page_factory(HomeSearch), role=GUEST, path="/",
           layout_items=(("label", "Từ khóa tìm việc"), ("label", "Địa điểm làm việc"), ("button", "Tìm việc"),
                         ("text", "Từ khóa phổ biến:"), ("region", "Ngành nghề nổi bật"),
                         ("region", "Việc làm mới nhất"), ("region", "Nhà tuyển dụng nổi bật"))),
    Screen(key=JOBS, function="Tìm kiếm và lọc việc làm", mark="jobs", page=page_factory(JobListPage), role=GUEST,
           path="/jobs", heading="Tìm kiếm việc làm",
           layout_items=(("label", "Từ khóa tìm việc"), ("button", "Tìm kiếm"), ("text", "Ngành nghề"),
                         ("text", "Địa điểm"), ("text", "Hình thức"), ("text", "Cấp bậc"), ("text", "Thời gian đăng"),
                         ("region", "Kết quả tìm kiếm"))),
    Screen(key=JOB_DETAIL, function="Chi tiết tin tuyển dụng", mark="job_detail", page=page_factory(JobDetailPage),
           role=GUEST, prepare=_shared_job,
           layout_items=(("link", "Công ty Auto Dùng Chung"), ("heading", "Mô tả công việc"),
                         ("heading", "Yêu cầu ứng viên"), ("heading", "Kỹ năng yêu cầu"), ("heading", "Thông tin chung"),
                         ("button", "Đăng nhập để ứng tuyển"), ("button", "Yêu thích"))),
    Screen(key=COMPANIES, function="Công ty", mark="companies", page=page_factory(CompanyListPage), role=GUEST,
           path="/companies", heading="Công ty",
           layout_items=(("label", "Tên công ty"), ("button", "Tìm kiếm"), ("text", "Ngành nghề"), ("text", "Địa điểm"),
                         ("region", "Danh sách công ty"))),
]


def _hover(screen: str, group: str, label: str, options) -> Widget:
    return Widget(screen, group, "hover", label=label, locate=lambda po, lb=label: po.hover(lb),
                  extra={"options": options})


WIDGETS = [
    # ---------- Trang chủ
    Widget(HOME, "Textbox Từ khóa tìm việc", "search", label="Từ khóa tìm việc", sample=_job_title),
    Widget(HOME, "Combobox Địa điểm làm việc", "select", label="Địa điểm làm việc",
           extra={"options": _names("locations", "Tất cả địa điểm")}),
    Widget(HOME, "Button Tìm việc", "label", locate=lambda po: po.search_button, extra={"text": "Tìm việc"}),
    # ---------- Tìm kiếm việc làm
    Widget(JOBS, "Textbox Từ khóa tìm việc", "search", label="Từ khóa tìm việc", sample=_job_title),
    _hover(JOBS, "Combobox Ngành nghề", "Ngành nghề", _names("industries", "Tất cả ngành nghề")),
    _hover(JOBS, "Combobox Địa điểm", "Địa điểm", _names("locations", "Tất cả địa điểm")),
    _hover(JOBS, "Combobox Hình thức", "Hình thức", _fixed("Tất cả hình thức", JOB_TYPES)),
    _hover(JOBS, "Combobox Cấp bậc", "Cấp bậc", _fixed("Tất cả cấp bậc", JOB_LEVELS)),
    _hover(JOBS, "Combobox Thời gian đăng", "Thời gian đăng", _fixed("Bất kỳ lúc nào", POSTED_WITHIN)),
    Widget(JOBS, "Phân trang", "pagination", sample=_job_title),
    # ---------- Công ty
    Widget(COMPANIES, "Textbox Tên công ty", "search", label="Tên công ty", sample=_company_name),
    _hover(COMPANIES, "Combobox Ngành nghề", "Ngành nghề", _names("industries", "Tất cả ngành nghề")),
    _hover(COMPANIES, "Combobox Địa điểm", "Địa điểm", _names("locations", "Tất cả địa điểm")),
    Widget(COMPANIES, "Phân trang", "pagination", sample=_company_name),
    Widget(COMPANIES, "Chi tiết công ty", "pagination", sample=_company_name),
    # ---------- Chi tiết tin
    Widget(JOB_DETAIL, "Button Ứng tuyển", "label", locate=lambda po: po.login_to_apply,
           extra={"text": "Đăng nhập để ứng tuyển"}),
]
