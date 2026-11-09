import { Link } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness, ChevronRight, Gauge, Inbox, ListChecks, Plus, Users } from 'lucide-react'
import jobApi from '@/api/jobApi'
import { StatusBadge } from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import { SkeletonCards, SkeletonLines } from '@/components/common/Skeleton'
import StatCard from '@/components/common/StatCard'
import useAuth from '@/hooks/useAuth'
import useFetch from '@/hooks/useFetch'
import { APPLICATION_STATUS, FEATURES, JOB_STATUS } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'

// Các vòng của hồ sơ theo thứ tự; từ chối / ứng viên rút là kết thúc nên tách riêng
const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired']
const CLOSED_STAGES = ['rejected', 'withdrawn']
const JOB_SUMMARY = ['draft', 'paused', 'closed', 'expired']

function Pipeline({ byStatus }) {
  const max = Math.max(1, ...STAGES.map((s) => byStatus[s] ?? 0))
  return (
    <>
      <ol className="pipeline">
        {STAGES.map((status, index) => (
          <li key={status}>
            <Link to={`/recruiter/applicants?status=${status}`} className="pipeline-step">
              <span className="pipeline-label">
                <span className="pipeline-index" aria-hidden="true">
                  {index + 1}
                </span>
                {APPLICATION_STATUS[status].label}
              </span>
              <strong className="pipeline-count">{byStatus[status] ?? 0}</strong>
              <span className="pipeline-bar" aria-hidden="true">
                <span style={{ width: `${((byStatus[status] ?? 0) / max) * 100}%` }} />
              </span>
            </Link>
            {index < STAGES.length - 1 && <ChevronRight className="pipeline-arrow" aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <ul className="pipeline-closed">
        {CLOSED_STAGES.map((status) => (
          <li key={status}>
            <Link to={`/recruiter/applicants?status=${status}`} className="inline-link">
              {APPLICATION_STATUS[status].label}: <strong className="tabular-nums">{byStatus[status] ?? 0}</strong>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: stats, loading, error, reload } = useFetch(() => jobApi.getRecruiterStats(), [])

  const header = (
    <div className="page-header">
      <div>
        <h1>Xin chào, {user.fullName}</h1>
        <p className="text-muted">Tổng quan hoạt động tuyển dụng của {user.companyName}</p>
      </div>
      <Link to="/recruiter/jobs/new" className="btn btn-primary">
        <Plus />
        Đăng tin mới
      </Link>
    </div>
  )

  if (loading) {
    return (
      <>
        {header}
        <SkeletonCards count={4} className="stat-grid" label="Đang tải số liệu tuyển dụng" />
        <div className="card">
          <SkeletonLines lines={4} />
        </div>
      </>
    )
  }
  if (error) {
    return (
      <>
        {header}
        <ErrorState message={error} onRetry={reload} />
      </>
    )
  }

  const { jobs, applications, recentApplications } = stats
  const byStatus = applications.byStatus
  const pending = byStatus.applied ?? 0
  const inProgress = (byStatus.screening ?? 0) + (byStatus.interview ?? 0) + (byStatus.offer ?? 0)

  return (
    <>
      {header}

      <div className="stat-grid">
        <StatCard
          icon={BriefcaseBusiness}
          label="Tin đang tuyển"
          value={`${jobs.published}/${jobs.total}`}
          hint="Trên tổng số tin của công ty"
          to="/recruiter/jobs?status=published"
        />
        <StatCard
          icon={Users}
          tone="info"
          label="Tổng hồ sơ"
          value={applications.total}
          hint={`${applications.newLast7Days} hồ sơ trong 7 ngày qua`}
          to="/recruiter/applicants"
        />
        <StatCard
          icon={Inbox}
          tone="warning"
          label="Hồ sơ mới chưa xử lý"
          value={pending}
          hint="Đang chờ bạn xem xét"
          to="/recruiter/applicants?status=applied"
        />
        <StatCard
          icon={ListChecks}
          tone="success"
          label="Đang trong quy trình"
          value={inProgress}
          hint={`Sàng lọc, phỏng vấn, đề nghị · ${byStatus.hired ?? 0} đã tuyển`}
        />
        {FEATURES.ai && <StatCard icon={Gauge} tone="ai" label="Điểm AI trung bình" value={stats.avgAiScore ?? '—'} />}
      </div>

      {pending > 0 && (
        <div className="alert alert-info">
          <Inbox />
          <div className="alert-content">
            Bạn có {pending} hồ sơ mới chưa xử lý
            {applications.newLast7Days > 0 && ` (${applications.newLast7Days} hồ sơ nộp trong 7 ngày qua)`}.{' '}
            <Link to="/recruiter/applicants?status=applied">
              {FEATURES.ai ? 'Dùng AI sàng lọc để tìm ứng viên tiềm năng' : 'Xem và xử lý ngay'}
            </Link>
          </div>
        </div>
      )}

      <section className="card" aria-labelledby="pipeline-title">
        <div className="section-head">
          <div>
            <h2 id="pipeline-title">Quy trình tuyển dụng</h2>
            <p className="text-muted small">Số hồ sơ đang ở từng vòng. Bấm vào một vòng để xem danh sách.</p>
          </div>
        </div>
        <Pipeline byStatus={byStatus} />
        <div className="job-summary">
          <span className="text-muted small">Tin khác:</span>
          <ul className="chip-list">
            {JOB_SUMMARY.map((status) => (
              <li key={status}>
                <Link to={`/recruiter/jobs?status=${status}`} className="chip">
                  {JOB_STATUS[status].label} <span className="segmented-count">({jobs[status] ?? 0})</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card table-card" aria-labelledby="recent-title">
        <div className="section-head">
          <h2 id="recent-title">Hồ sơ mới nhận</h2>
          <Link to="/recruiter/applicants" className="section-link">
            Xem tất cả
            <ArrowRight />
          </Link>
        </div>
        {recentApplications.length === 0 ? (
          <EmptyState
            title="Chưa có hồ sơ ứng tuyển"
            description="Đăng tin tuyển dụng để bắt đầu nhận hồ sơ."
            action={
              <Link to="/recruiter/jobs/new" className="btn btn-outline">
                Đăng tin mới
              </Link>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table table-stack">
              <thead>
                <tr>
                  <th scope="col">Ứng viên</th>
                  <th scope="col">Vị trí ứng tuyển</th>
                  <th scope="col">Ngày nộp</th>
                  {FEATURES.ai && <th scope="col">Điểm AI</th>}
                  <th scope="col">Trạng thái</th>
                  <th scope="col" className="table-cell-actions">
                    <span className="visually-hidden">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((a) => (
                  <tr key={a.id}>
                    <td className="table-cell-main">
                      <div className="person">
                        <span className="avatar" aria-hidden="true">
                          {a.candidate?.fullName?.charAt(0)}
                        </span>
                        <div className="person-text">
                          <strong>{a.candidate?.fullName}</strong>
                          {a.candidate?.headline && <small>{a.candidate.headline}</small>}
                        </div>
                      </div>
                    </td>
                    <td data-label="Vị trí">{a.job?.title}</td>
                    <td data-label="Ngày nộp" className="nowrap tabular-nums">
                      {formatDate(a.appliedAt)}
                    </td>
                    {FEATURES.ai && (
                      <td data-label="Điểm AI">
                        {a.aiReview ? <strong>{a.aiReview.score}</strong> : <span className="text-muted">Chưa lọc</span>}
                      </td>
                    )}
                    <td data-label="Trạng thái">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="table-cell-actions">
                      <Link
                        to={`/recruiter/applicants/${a.id}`}
                        className="btn btn-outline btn-sm"
                        aria-label={`Xem hồ sơ ${a.candidate?.fullName}`}
                      >
                        Xem hồ sơ
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
