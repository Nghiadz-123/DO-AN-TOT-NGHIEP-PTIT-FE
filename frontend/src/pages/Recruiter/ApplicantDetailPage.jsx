import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import applicationApi from '@/api/applicationApi'
import { RecommendationBadge, StatusBadge } from '@/components/common/Badge'
import Loading from '@/components/common/Loading'
import ScoreCircle from '@/components/common/ScoreCircle'
import CVParsedInfo from '@/components/cv/CVParsedInfo'
import useFetch from '@/hooks/useFetch'
import { APPLICATION_STATUS } from '@/utils/constants'
import { formatDate, formatFileSize, getErrorMessage } from '@/utils/formatters'

const QUICK_ACTIONS = [
  { status: 'shortlisted', label: 'Vào vòng trong', className: 'btn-primary' },
  { status: 'interview', label: 'Mời phỏng vấn', className: 'btn-outline' },
  { status: 'rejected', label: 'Từ chối', className: 'btn-ghost text-danger' },
]

export default function ApplicantDetailPage() {
  const { id } = useParams()
  const { data: app, loading, error, setData: setApp } = useFetch(() => applicationApi.getById(id), [id])
  const [screening, setScreening] = useState(false)
  const [actionError, setActionError] = useState('')

  if (loading) return <Loading />
  if (error) return <div className="alert alert-error">{error}</div>

  const run = async (action) => {
    setActionError('')
    try {
      setApp(await action())
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  const changeStatus = (status) => run(() => applicationApi.updateStatus(app.id, status))

  const handleScreen = async () => {
    setScreening(true)
    await run(() => applicationApi.screen(app.id))
    setScreening(false)
  }

  const { candidate, cv, job, aiReview } = app

  return (
    <>
      <Link to={`/recruiter/applicants?jobId=${app.jobId}`} className="back-link">
        ← Danh sách ứng viên
      </Link>

      <div className="card applicant-header">
        <div className="avatar avatar-lg">{candidate.fullName.charAt(0)}</div>
        <div className="applicant-info">
          <h1>{candidate.fullName}</h1>
          <p className="text-muted">
            Ứng tuyển <Link to={`/jobs/${job.id}`}>{job.title}</Link> · {formatDate(app.appliedAt)}
          </p>
          <StatusBadge status={app.status} />
        </div>
        <div className="applicant-actions">
          <div className="actions">
            {QUICK_ACTIONS.filter((a) => a.status !== app.status).map((a) => (
              <button key={a.status} className={`btn btn-sm ${a.className}`} onClick={() => changeStatus(a.status)}>
                {a.label}
              </button>
            ))}
          </div>
          <select className="input input-sm" value={app.status} onChange={(e) => changeStatus(e.target.value)}>
            {Object.entries(APPLICATION_STATUS).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}

      <div className="layout-sidebar">
        <div className="stack">
          <div className="card">
            <div className="page-header">
              <h2>Hồ sơ CV</h2>
              <span className="text-muted">
                📎 {cv.fileName} ({formatFileSize(cv.fileSize)})
              </span>
            </div>
            <CVParsedInfo parsed={cv.parsed} highlightSkills={aiReview?.matchedSkills} />
          </div>
          <div className="card">
            <h2>Thư giới thiệu</h2>
            {app.coverLetter ? <p>{app.coverLetter}</p> : <p className="text-muted">Ứng viên không gửi thư giới thiệu.</p>}
          </div>
        </div>

        <aside className="card ai-box ai-review">
          <div className="ai-box-title">🤖 Đánh giá của AI</div>
          {screening ? (
            <Loading text="AI đang đánh giá hồ sơ..." />
          ) : aiReview ? (
            <>
              <div className="ai-review-score">
                <ScoreCircle score={aiReview.score} size={110} />
                <RecommendationBadge value={aiReview.recommendation} />
              </div>
              <p>{aiReview.summary}</p>

              <h4>Kỹ năng đáp ứng ({aiReview.matchedSkills.length})</h4>
              <div className="tags">
                {aiReview.matchedSkills.map((s) => (
                  <span key={s} className="tag tag-success">
                    ✓ {s}
                  </span>
                ))}
              </div>
              {aiReview.missingSkills.length > 0 && (
                <>
                  <h4>Kỹ năng còn thiếu ({aiReview.missingSkills.length})</h4>
                  <div className="tags">
                    {aiReview.missingSkills.map((s) => (
                      <span key={s} className="tag tag-danger">
                        ✕ {s}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <h4 className="text-success">Điểm mạnh</h4>
              <ul>
                {aiReview.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              {aiReview.concerns.length > 0 && (
                <>
                  <h4 className="text-danger">Điểm cần lưu ý</h4>
                  <ul>
                    {aiReview.concerns.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </>
              )}
              <button className="btn btn-ghost btn-sm" onClick={handleScreen}>
                ↻ Đánh giá lại
              </button>
            </>
          ) : (
            <div className="empty-state">
              <p className="text-muted">Hồ sơ chưa được AI đánh giá mức độ phù hợp với vị trí.</p>
              <button className="btn btn-primary" onClick={handleScreen}>
                🤖 Đánh giá bằng AI
              </button>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
