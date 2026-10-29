import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarClock,
  CircleCheck,
  FileText,
  Gift,
  ListChecks,
  MapPin,
  Send,
  Wallet,
} from 'lucide-react'
import applicationApi from '@/api/applicationApi'
import jobApi from '@/api/jobApi'
import Badge, { JobStatusBadge, StatusBadge } from '@/components/common/Badge'
import CompanyLogo from '@/components/common/CompanyLogo'
import ErrorState from '@/components/common/ErrorState'
import FavoriteButton from '@/components/common/FavoriteButton'
import { SkeletonLines } from '@/components/common/Skeleton'
import ApplyModal from '@/components/jobs/ApplyModal'
import useAuth from '@/hooks/useAuth'
import useFetch from '@/hooks/useFetch'
import { JOB_LEVELS, JOB_TYPES, ROLES, WORK_MODES } from '@/utils/constants'
import { formatDate, formatSalary, labelOf } from '@/utils/formatters'

export default function JobDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [applyOpen, setApplyOpen] = useState(false)
  const isCandidate = user?.role === ROLES.CANDIDATE

  const { data: job, loading, error, reload } = useFetch(() => jobApi.getById(id), [id])
  const { data: myApplications, setData: setMyApplications } = useFetch(
    () => (isCandidate ? applicationApi.getMine() : Promise.resolve([])),
    [isCandidate],
  )

  if (loading) {
    return (
      <div className="card">
        <SkeletonLines lines={4} label="Đang tải tin tuyển dụng" />
      </div>
    )
  }
  if (error) {
    return (
      <ErrorState
        title="Không tải được tin tuyển dụng"
        message={error}
        onRetry={reload}
        action={
          <Link to="/jobs" className="btn btn-ghost">
            Về danh sách việc làm
          </Link>
        }
      />
    )
  }

  const application = myApplications?.find((a) => a.jobId === job.id)
  const closed = job.status !== 'published'
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.isSalaryNegotiable)

  const renderApplyButton = () => {
    if (user && !isCandidate) return null
    if (closed)
      return (
        <button type="button" className="btn btn-primary btn-lg" disabled>
          Đã ngừng nhận hồ sơ
        </button>
      )
    if (!user)
      return (
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={() => navigate('/login', { state: { from: location } })}
        >
          Đăng nhập để ứng tuyển
        </button>
      )
    if (application)
      return (
        <div className="applied-box">
          <span>
            <CircleCheck />
            Bạn đã ứng tuyển ngày {formatDate(application.appliedAt)}
          </span>
          <StatusBadge status={application.status} />
        </div>
      )
    return (
      <button type="button" className="btn btn-primary btn-lg" onClick={() => setApplyOpen(true)}>
        <Send />
        Ứng tuyển ngay
      </button>
    )
  }

  const applyAction = renderApplyButton()

  return (
    <>
      <Link to="/jobs" className="back-link">
        <ArrowLeft />
        Danh sách việc làm
      </Link>

      <section className="card job-detail-header">
        <CompanyLogo name={job.company} src={job.companyLogo} large />
        <div className="job-detail-info">
          <h1>{job.title}</h1>
          <p className="job-detail-company">
            <Link to={`/companies/${job.companyId}`} className="company-link">
              {job.company}
            </Link>
          </p>
          <ul className="job-meta">
            <li className="job-meta-salary">
              <Wallet />
              {salary}
            </li>
            {job.location && (
              <li>
                <MapPin />
                {job.location}
              </li>
            )}
            <li>
              <CalendarClock />
              Hạn nộp: {formatDate(job.deadline)}
            </li>
          </ul>
          <div className="job-card-badges">
            <Badge tone="info">{labelOf(JOB_TYPES, job.type)}</Badge>
            <Badge>{labelOf(JOB_LEVELS, job.level)}</Badge>
            {closed && <JobStatusBadge status={job.status} />}
          </div>
        </div>
        <div className="job-detail-actions">
          <FavoriteButton type="job" id={job.id} withLabel />
          {applyAction}
        </div>
      </section>

      <div className="layout-sidebar">
        <article className="card job-content">
          <section className="job-section">
            <h2>
              <FileText />
              Mô tả công việc
            </h2>
            <p className="pre-line">{job.description}</p>
          </section>
          <section className="job-section">
            <h2>
              <ListChecks />
              Yêu cầu ứng viên
            </h2>
            <ul>
              {job.requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
          {job.benefits?.length > 0 && (
            <section className="job-section">
              <h2>
                <Gift />
                Quyền lợi
              </h2>
              <ul>
                {job.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>
          )}
          {job.address && (
            <section className="job-section">
              <h2>
                <MapPin />
                Địa điểm làm việc
              </h2>
              <p>{[job.address, job.location].filter(Boolean).join(', ')}</p>
            </section>
          )}
        </article>

        <aside className="stack job-aside">
          <section className="card">
            <h2 className="card-section-title">Kỹ năng yêu cầu</h2>
            <ul className="tags">
              {job.skills.map((s) => (
                <li key={s} className="tag">
                  {s}
                </li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h2 className="card-section-title">Thông tin chung</h2>
            <dl className="info-list">
              {job.industry && (
                <>
                  <dt>Ngành nghề</dt>
                  <dd>
                    <Link to={`/jobs?industry=${job.industryId}`}>{job.industry}</Link>
                  </dd>
                </>
              )}
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
          </section>
        </aside>
      </div>

      {/* Màn hẹp: nút ứng tuyển dính đáy để không phải cuộn ngược lên đầu trang */}
      {applyAction && (
        <div className="apply-bar">
          <div className="apply-bar-info">
            <strong>{job.title}</strong>
            <span>{salary}</span>
          </div>
          {renderApplyButton()}
        </div>
      )}

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
