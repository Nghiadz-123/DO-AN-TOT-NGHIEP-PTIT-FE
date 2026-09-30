import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import applicationApi from '@/api/applicationApi'
import jobApi from '@/api/jobApi'
import Badge, { StatusBadge } from '@/components/common/Badge'
import Loading from '@/components/common/Loading'
import ApplyModal from '@/components/jobs/ApplyModal'
import useAuth from '@/hooks/useAuth'
import useFetch from '@/hooks/useFetch'
import { JOB_LEVELS, JOB_TYPES, ROLES } from '@/utils/constants'
import { formatDate, formatSalary, isExpired, labelOf } from '@/utils/formatters'

export default function JobDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [applyOpen, setApplyOpen] = useState(false)
  const isCandidate = user?.role === ROLES.CANDIDATE

  const { data: job, loading, error } = useFetch(() => jobApi.getById(id), [id])
  const { data: myApplications, setData: setMyApplications } = useFetch(
    () => (isCandidate ? applicationApi.getMine() : Promise.resolve([])),
    [isCandidate],
  )

  if (loading) return <Loading />
  if (error) return <div className="alert alert-error">{error}</div>

  const application = myApplications?.find((a) => a.jobId === job.id)
  const closed = job.status !== 'open' || isExpired(job.deadline)

  const renderApplyButton = () => {
    if (user?.role === ROLES.RECRUITER) return null
    if (closed) return <button className="btn btn-primary btn-lg" disabled>Đã hết hạn nhận hồ sơ</button>
    if (!user)
      return (
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/login', { state: { from: location } })}>
          Đăng nhập để ứng tuyển
        </button>
      )
    if (application)
      return (
        <div className="applied-box">
          <span>Bạn đã ứng tuyển ngày {formatDate(application.appliedAt)}</span>
          <StatusBadge status={application.status} />
        </div>
      )
    return (
      <button className="btn btn-primary btn-lg" onClick={() => setApplyOpen(true)}>
        Ứng tuyển ngay
      </button>
    )
  }

  return (
    <>
      <Link to="/jobs" className="back-link">
        ← Danh sách việc làm
      </Link>

      <div className="card job-detail-header">
        <div className="company-logo company-logo-lg">{job.company.charAt(0)}</div>
        <div className="job-detail-info">
          <h1>{job.title}</h1>
          <p className="text-muted">{job.company}</p>
          <div className="job-meta">
            <span>📍 {job.location}</span>
            <span>💰 {formatSalary(job.salaryMin, job.salaryMax)}</span>
            <span>⏰ Hạn nộp: {formatDate(job.deadline)}</span>
            <Badge tone="info">{labelOf(JOB_TYPES, job.type)}</Badge>
            <Badge>{labelOf(JOB_LEVELS, job.level)}</Badge>
          </div>
        </div>
        <div className="job-detail-actions">{renderApplyButton()}</div>
      </div>

      <div className="layout-sidebar">
        <div className="card">
          <section className="job-section">
            <h2>Mô tả công việc</h2>
            <p>{job.description}</p>
          </section>
          <section className="job-section">
            <h2>Yêu cầu ứng viên</h2>
            <ul>
              {job.requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
          {job.benefits?.length > 0 && (
            <section className="job-section">
              <h2>Quyền lợi</h2>
              <ul>
                {job.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="stack">
          <div className="card">
            <h3>Kỹ năng yêu cầu</h3>
            <div className="tags">
              {job.skills.map((s) => (
                <span key={s} className="tag">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>Thông tin chung</h3>
            <dl className="info-list">
              <dt>Cấp bậc</dt>
              <dd>{labelOf(JOB_LEVELS, job.level)}</dd>
              <dt>Hình thức</dt>
              <dd>{labelOf(JOB_TYPES, job.type)}</dd>
              <dt>Ngày đăng</dt>
              <dd>{formatDate(job.createdAt)}</dd>
              <dt>Số hồ sơ đã nộp</dt>
              <dd>{job.applicantCount}</dd>
            </dl>
          </div>
          {isCandidate && !application && (
            <div className="card ai-box">
              <div className="ai-box-title">✨ Mẹo từ AI</div>
              <p className="text-muted">
                Kiểm tra điểm CV và gợi ý cải thiện trước khi ứng tuyển để tăng cơ hội được chọn.
              </p>
              <Link to="/cv-analysis" className="btn btn-outline btn-sm">
                Chấm điểm CV
              </Link>
            </div>
          )}
        </aside>
      </div>

      {isCandidate && (
        <ApplyModal
          job={job}
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
          onApplied={(app) => {
            setMyApplications((list) => [app, ...(list ?? [])])
            setApplyOpen(false)
          }}
        />
      )}
    </>
  )
}
