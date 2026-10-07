import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import applicationApi from '@/api/applicationApi'
import jobApi from '@/api/jobApi'
import Badge, { JobStatusBadge, StatusBadge } from '@/components/common/Badge'
import CompanyLogo from '@/components/common/CompanyLogo'
import Loading from '@/components/common/Loading'
import ApplyModal from '@/components/jobs/ApplyModal'
import useAuth from '@/hooks/useAuth'
import useFetch from '@/hooks/useFetch'
import { FEATURES, JOB_LEVELS, JOB_TYPES, ROLES, WORK_MODES } from '@/utils/constants'
import { formatDate, formatSalary, labelOf } from '@/utils/formatters'

export default function JobDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [applyOpen, setApplyOpen] = useState(false)
  const isCandidate = FEATURES.candidate && user?.role === ROLES.CANDIDATE

  const { data: job, loading, error } = useFetch(() => jobApi.getById(id), [id])
  const { data: myApplications, setData: setMyApplications } = useFetch(
    () => (isCandidate ? applicationApi.getMine() : Promise.resolve([])),
    [isCandidate],
  )

  if (loading) return <Loading />
  if (error) return <div className="alert alert-error">{error}</div>

  const application = myApplications?.find((a) => a.jobId === job.id)
  const closed = job.status !== 'published'

  const renderApplyButton = () => {
    if (user?.role === ROLES.RECRUITER) return null
    if (closed) return <button className="btn btn-primary btn-lg" disabled>Đã ngừng nhận hồ sơ</button>
    if (!FEATURES.candidate) return <span className="text-muted">Ứng tuyển trực tuyến sẽ sớm ra mắt</span>
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
        <CompanyLogo name={job.company} src={job.companyLogo} large />
        <div className="job-detail-info">
          <h1>{job.title}</h1>
          <p className="text-muted">{job.company}</p>
          <div className="job-meta">
            {job.location && <span>📍 {job.location}</span>}
            <span>💰 {formatSalary(job.salaryMin, job.salaryMax, job.isSalaryNegotiable)}</span>
            <span>⏰ Hạn nộp: {formatDate(job.deadline)}</span>
            <Badge tone="info">{labelOf(JOB_TYPES, job.type)}</Badge>
            <Badge>{labelOf(JOB_LEVELS, job.level)}</Badge>
            {closed && <JobStatusBadge status={job.status} />}
          </div>
        </div>
        <div className="job-detail-actions">{renderApplyButton()}</div>
      </div>

      <div className="layout-sidebar">
        <div className="card">
          <section className="job-section">
            <h2>Mô tả công việc</h2>
            <p className="pre-line">{job.description}</p>
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
          {job.address && (
            <section className="job-section">
              <h2>Địa điểm làm việc</h2>
              <p>{[job.address, job.location].filter(Boolean).join(', ')}</p>
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
              {job.workMode && (
                <>
                  <dt>Chế độ làm việc</dt>
                  <dd>{labelOf(WORK_MODES, job.workMode)}</dd>
                </>
              )}
              {job.headcount > 0 && (
                <>
                  <dt>Số lượng tuyển</dt>
                  <dd>{job.headcount}</dd>
                </>
              )}
              <dt>Kinh nghiệm</dt>
              <dd>{job.minYearsExperience ? `Từ ${job.minYearsExperience} năm` : 'Không yêu cầu'}</dd>
              <dt>Ngày đăng</dt>
              <dd>{formatDate(job.publishedAt ?? job.createdAt)}</dd>
              <dt>Số hồ sơ đã nộp</dt>
              <dd>{job.applicantCount}</dd>
            </dl>
          </div>
          {FEATURES.ai && isCandidate && !application && (
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
