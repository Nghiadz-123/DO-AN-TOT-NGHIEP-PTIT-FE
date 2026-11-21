"""Giả lập API AI (page.route) cho test GIAO DIỆN màn hình Chấm điểm CV.

Chỉ dùng để kiểm tra FE hiển thị đúng các trạng thái (đang chấm, kết quả, lỗi, rỗng) một cách ổn định.
Chất lượng chấm điểm / gợi ý thật do các test đánh dấu @pytest.mark.ai kiểm tra với backend thật.
Định dạng DTO theo FE/frontend/src/api/adapters.js (toCVAnalysis).
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from playwright.sync_api import Page, Route

ANALYSES = "**/candidate/cv-analyses/"
SCORE = "**/candidate/cvs/*/analysis/score/"
SUGGEST = "**/candidate/cvs/*/analysis/suggestions/"

CRITERIA = [
    ("structure", "Bố cục & trình bày", 16, 20),
    ("experience", "Kinh nghiệm", 18, 25),
    ("skills", "Kỹ năng", 15, 20),
    ("education", "Học vấn", 12, 15),
    ("achievements", "Thành tích định lượng", 11, 20),
]


def score_dto() -> dict:
    return {
        "total": sum(c[2] for c in CRITERIA),
        "breakdown": [{"key": k, "label": n, "score": s, "max": m, "reason": f"Lý do {n}"} for k, n, s, m in CRITERIA],
        "strengths": ["Kinh nghiệm bán hàng B2B rõ ràng"],
        "weaknesses": ["Thiếu số liệu định lượng cho thành tích"],
        "scored_at": datetime.now(timezone.utc).isoformat(),
    }


def suggestions_dto(items: list[dict] | None = None) -> dict:
    if items is None:
        items = [
            {"section": "Kinh nghiệm", "issue": "Thiếu số liệu", "suggestion": "Bổ sung kết quả đo được",
             "example_before": "Phụ trách khách hàng", "example_after": "Phụ trách [X] khách hàng, tăng [X%] doanh thu",
             "priority": "high", "job_ids": []},
            {"section": "Kỹ năng", "issue": "Kỹ năng chung chung", "suggestion": "Nêu công cụ cụ thể",
             "example_before": "", "example_after": "CRM (Salesforce), Excel nâng cao", "priority": "medium", "job_ids": []},
            {"section": "Giới thiệu", "issue": "", "suggestion": "Thêm mục tiêu nghề nghiệp 1-2 câu",
             "example_before": "", "example_after": "", "priority": "low", "job_ids": []},
        ]
    return {"items": items, "missing_keywords": [], "reference_jobs": [],
            "suggested_at": datetime.now(timezone.utc).isoformat()}


def analysis_dto(cv_id: str, *, score: bool = False, suggestions: dict | None = None) -> dict:
    return {"cv_id": cv_id, "profile": None, "score": score_dto() if score else None, "suggestions": suggestions}


def _json(route: Route, body, status: int = 200) -> None:
    route.fulfill(status=status, content_type="application/json", body=json.dumps(body))


def mock_analyses(page: Page, analyses: list[dict]) -> None:
    page.route(ANALYSES, lambda route: _json(route, analyses))


def mock_score(page: Page, cv_id: str, *, status: int = 200, hold: list | None = None) -> None:
    """hold: truyền list để giữ request lại (test trạng thái "đang chấm"); gọi hold[0].fulfill(...) để trả về."""

    def handler(route: Route):
        if hold is not None:
            hold.append(route)
            return
        if status != 200:
            _json(route, {"detail": "AI service lỗi (giả lập)."}, status)
        else:
            _json(route, analysis_dto(cv_id, score=True))

    page.route(SCORE, handler)


def mock_suggestions(page: Page, cv_id: str, items: list[dict] | None = None, hold: list | None = None) -> None:
    def handler(route: Route):
        if hold is not None:
            hold.append(route)
            return
        _json(route, analysis_dto(cv_id, suggestions=suggestions_dto(items)))

    page.route(SUGGEST, handler)


def fulfill_json(route: Route, body, status: int = 200) -> None:
    _json(route, body, status)


# ---------------------------------------------------------------- gợi ý việc làm (Việc làm phù hợp)
RECOMMENDED = "**/candidate/cvs/*/recommended-jobs/?*"
EVALUATE = "**/candidate/cvs/*/recommended-jobs/*/evaluate/"


def job_dto(i: int, title: str | None = None, skills: tuple[str, ...] = ("Python", "SQL")) -> dict:
    return {
        "id": f"00000000-0000-0000-0000-{i:012d}", "title": title or f"Việc làm giả lập {i}",
        "company": {"id": f"10000000-0000-0000-0000-{i:012d}", "name": f"Công ty giả lập {i}", "logo_url": None},
        "location": {"id": 1, "name": "Hà Nội"}, "industry": {"id": 1, "name": "Công nghệ thông tin"},
        "job_type": "full_time", "work_mode": "onsite", "level": "staff",
        "salary_min": 10_000_000, "salary_max": 20_000_000, "is_salary_negotiable": False,
        "deadline": "2099-12-31", "skills": [{"name": s} for s in skills], "status": "published",
    }


def recommendation_dto(i: int, score: int, *, evaluated: bool = False) -> dict:
    return {
        "job": job_dto(i), "score": score, "similarity": score / 100, "skill_overlap": 0.5,
        "matched_skills": ["Python"], "missing_skills": ["SQL"],
        "reasons": [f"Vì sao phù hợp: kinh nghiệm Python ({score} điểm)", "Còn thiếu: SQL"],
        "ai_evaluation": {"score": score, "matched_skills": ["Python"], "missing_skills": ["SQL"],
                          "reason": "Đánh giá chi tiết giả lập", "evaluated_at": datetime.now(timezone.utc).isoformat()}
        if evaluated else None,
    }


def mock_recommendations(page: Page, scores: list[int], hold: list | None = None) -> list[dict]:
    """Giả lập GET recommended-jobs: mỗi điểm trong `scores` là 1 tin (điểm cao trước như backend)."""
    items = [recommendation_dto(i + 1, s) for i, s in enumerate(sorted(scores, reverse=True))]

    def handler(route: Route):
        if hold is not None:
            hold.append(route)
            return
        _json(route, items)

    page.route(RECOMMENDED, handler)
    return items


def mock_evaluate(page: Page, hold: list | None = None) -> None:
    def handler(route: Route):
        if hold is not None:
            hold.append(route)
            return
        job_id = route.request.url.rstrip("/").split("/")[-2]
        idx = int(job_id.rsplit("-", 1)[1])
        _json(route, recommendation_dto(idx, 88, evaluated=True))

    page.route(EVALUATE, handler)
