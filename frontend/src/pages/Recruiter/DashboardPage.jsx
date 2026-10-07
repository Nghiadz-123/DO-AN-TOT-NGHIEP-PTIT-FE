import { Link } from 'react-router-dom'
import jobApi from '@/api/jobApi'
import { StatusBadge } from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import useAuth from '@/hooks/useAuth'
import useFetch from '@/hooks/useFetch'
import { FEATURES } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'

const PIPELINE = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: stats, loading, error } = useFetch(() => jobApi.getRecruiterStats(), [])

  if (loading) return <Loading />
  if (error) return <div className="alert alert-error">{error}</div>

  const { jobs, applications, recentApplications } = stats
  const byStatus = applications.byStatus
  const inProgress = (byStatus.screening ?? 0) + (byStatus.interview ?? 0) + (byStatus.offer ?? 0)
  const cards = [
    { label: 'Tin đang tuyển', value: `${jobs.published}/${jobs.total}`, to: '/recruiter/jobs?status=published' },
    { label: 'Tổng hồ sơ', value: applications.total, to: '/recruiter/applicants' },
    { label: 'Hồ sơ mới chưa xử lý', value: byStatus.applied ?? 0, to: '/recruiter/applicants?status=applied' },
    { label: 'Đang trong quy trình', value: inProgress },
    FEATURES.ai
      ? { label: 'Điểm AI trung bình', value: stats.avgAiScore ?? '—' }
      : { label: 'Đã tuyển', value: byStatus.hired ?? 0, to: '/recruiter/applicants?status=hired' },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Xin chào, {user.fullName} 👋</h1>
          <p className="text-muted">Tổng quan hoạt động tuyển dụng của {user.companyName}</p>
        </div>
        <Link to="/recruiter/jobs/new" className="btn btn-primary">
          + Đăng tin mới
        </Link>
      </div>

      <div className="grid grid-5">
        {cards.map((c) => (
          <div key={c.label} className="card stat-card">
            <span className="text-muted">{c.label}</span>
            <strong>{c.to ? <Link to={c.to}>{c.value}</Link> : c.value}</strong>
          </div>
        ))}
      </div>

      {(byStatus.applied ?? 0) > 0 && (
        <div className="alert alert-info">
          {FEATURES.ai ? '🤖 ' : '📥 '}Bạn có {byStatus.applied} hồ sơ mới chưa xử lý
          {applications.newLast7Days > 0 && ` (${applications.newLast7Days} hồ sơ nộp trong 7 ngày qua)`}.{' '}
          <Link to="/recruiter/applicants?status=applied">
            {FEATURES.ai ? 'Dùng AI sàng lọc để tìm ứng viên tiềm năng →' : 'Xem và xử lý ngay →'}
          </Link>
        </div>
      )}

      <div className="card">
        <h2>Pipeline tuyển dụng</h2>
        <div className="pipeline">
          {PIPELINE.map((status) => (
            <Link key={status} to={`/recruiter/applicants?status=${status}`} className="pipeline-step">
              <strong>{byStatus[status] ?? 0}</strong>
              <StatusBadge status={status} />
            </Link>
          ))}
        </div>
        <p className="text-muted small">
          Tin: {jobs.draft} bản nháp · {jobs.paused} tạm dừng · {jobs.closed} đã đóng · {jobs.expired} hết hạn
        </p>
      </div>

      <div className="card">
        <div className="page-header">
          <h2>Hồ sơ mới nhận</h2>
          <Link to="/recruiter/applicants">Xem tất cả →</Link>
        </div>
        {recentApplications.length === 0 ? (
          <EmptyState title="Chưa có hồ sơ ứng tuyển" description="Đăng tin tuyển dụng để bắt đầu nhận hồ sơ." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ứng viên</th>
                  <th>Vị trí ứng tuyển</th>
                  <th>Ngày nộp</th>
                  {FEATURES.ai && <th>Điểm AI</th>}
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.candidate?.fullName}</strong>
                      <div className="text-muted">{a.candidate?.headline}</div>
                    </td>
                    <td>{a.job?.title}</td>
                    <td>{formatDate(a.appliedAt)}</td>
                    {FEATURES.ai && (
                      <td>
                        {a.aiReview ? <strong>{a.aiReview.score}</strong> : <span className="text-muted">Chưa lọc</span>}
                      </td>
                    )}
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td>
                      <Link to={`/recruiter/applicants/${a.id}`} className="btn btn-ghost btn-sm">
                        Xem hồ sơ
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
