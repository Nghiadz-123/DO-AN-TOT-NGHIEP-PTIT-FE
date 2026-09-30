import { Link } from 'react-router-dom'
import jobApi from '@/api/jobApi'
import { StatusBadge } from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import useAuth from '@/hooks/useAuth'
import useFetch from '@/hooks/useFetch'
import { formatDate } from '@/utils/formatters'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: stats, loading, error } = useFetch(() => jobApi.getRecruiterStats(), [])

  if (loading) return <Loading />
  if (error) return <div className="alert alert-error">{error}</div>

  const cards = [
    { label: 'Tin đang tuyển', value: `${stats.openJobs}/${stats.totalJobs}` },
    { label: 'Tổng hồ sơ', value: stats.totalApplicants },
    { label: 'Hồ sơ chờ xử lý', value: stats.pendingApplicants },
    { label: 'Ứng viên vào vòng trong', value: stats.shortlisted },
    { label: 'Điểm AI trung bình', value: stats.avgScore ?? '—' },
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
            <strong>{c.value}</strong>
          </div>
        ))}
      </div>

      {stats.pendingApplicants > 0 && (
        <div className="alert alert-info">
          🤖 Bạn có {stats.pendingApplicants} hồ sơ chờ xử lý.{' '}
          <Link to="/recruiter/applicants">Dùng AI sàng lọc để tìm ứng viên tiềm năng →</Link>
        </div>
      )}

      <div className="card">
        <div className="page-header">
          <h2>Hồ sơ mới nhận</h2>
          <Link to="/recruiter/applicants">Xem tất cả →</Link>
        </div>
        {stats.recentApplications.length === 0 ? (
          <EmptyState title="Chưa có hồ sơ ứng tuyển" description="Đăng tin tuyển dụng để bắt đầu nhận hồ sơ." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ứng viên</th>
                  <th>Vị trí ứng tuyển</th>
                  <th>Ngày nộp</th>
                  <th>Điểm AI</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stats.recentApplications.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.candidate?.fullName}</strong>
                    </td>
                    <td>{a.job?.title}</td>
                    <td>{formatDate(a.appliedAt)}</td>
                    <td>{a.aiReview ? <strong>{a.aiReview.score}</strong> : <span className="text-muted">Chưa lọc</span>}</td>
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
