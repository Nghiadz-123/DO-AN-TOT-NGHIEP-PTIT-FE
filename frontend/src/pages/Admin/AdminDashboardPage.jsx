import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Building, CircleCheck, ClipboardList, RefreshCw, Users } from 'lucide-react'
import adminApi from '@/api/adminApi'
import Badge from '@/components/common/Badge'
import ErrorState from '@/components/common/ErrorState'
import { SkeletonCards, SkeletonLines } from '@/components/common/Skeleton'
import StatCard from '@/components/common/StatCard'
import useFetch from '@/hooks/useFetch'
import { ROLE_LABELS, VERIFICATION_STATUS } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'

const timeOf = (date) => date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const initialOf = (text) => (text || '?').charAt(0).toUpperCase()

function UserStatusBadge({ active }) {
  return <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Đang hoạt động' : 'Đã khóa'}</Badge>
}

export default function AdminDashboardPage() {
  // Ghi lại thời điểm tải để người xem biết số liệu mới tới đâu (trang không tự cập nhật)
  const { data, loading, error, reload } = useFetch(
    async () => ({ ...(await adminApi.getOverview()), fetchedAt: new Date() }),
    [],
  )

  const header = (
    <div className="page-header">
      <div>
        <h1>Tổng quan hệ thống</h1>
        <p className="text-muted">Theo dõi hoạt động và xử lý các mục cần quản trị.</p>
      </div>
      {data && (
        <div className="actions">
          <span className="text-muted small">Cập nhật lúc {timeOf(data.fetchedAt)}</span>
          <button type="button" className="btn btn-outline btn-sm" onClick={reload} disabled={loading}>
            {loading ? <span className="spinner" aria-hidden="true" /> : <RefreshCw />}
            Làm mới
          </button>
        </div>
      )}
    </div>
  )

  if (loading && !data) {
    return (
      <>
        {header}
        <SkeletonCards count={4} className="stat-grid" label="Đang tải số liệu hệ thống" />
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
        <ErrorState title="Không tải được dữ liệu quản trị" message={error} onRetry={reload} />
      </>
    )
  }

  const pending = data.pending_companies ?? 0
  const recentUsers = data.recent_users ?? []
  const recentCompanies = data.recent_companies ?? []

  return (
    <>
      {header}

      <div className={`stat-grid ${loading ? 'is-refreshing' : ''}`}>
        <StatCard
          icon={Users}
          label="Người dùng"
          value={data.total_users ?? 0}
          hint={`${data.candidates_count ?? 0} ứng viên · ${data.employers_count ?? 0} nhà tuyển dụng`}
          to="/admin/users"
        />
        <StatCard
          icon={Building}
          tone="info"
          label="Doanh nghiệp"
          value={data.total_companies ?? 0}
          hint={`${pending} chờ xác minh`}
          to="/admin/companies"
        />
        <StatCard
          icon={BriefcaseBusiness}
          tone="success"
          label="Tin tuyển dụng"
          value={data.total_jobs ?? 0}
          hint={`${data.published_jobs ?? 0} đang tuyển`}
          to="/admin/jobs"
        />
        <StatCard
          icon={ClipboardList}
          tone="warning"
          label="Lượt ứng tuyển"
          value={data.total_applications ?? 0}
          hint="Tổng cộng trên nền tảng"
        />
      </div>

      {pending > 0 ? (
        <section className="card review-banner" aria-labelledby="review-title">
          <span className="icon-tile icon-tile-warning" aria-hidden="true">
            <BadgeCheck />
          </span>
          <div className="review-banner-body">
            <h2 id="review-title">{pending} doanh nghiệp đang chờ xác minh</h2>
            <p className="text-muted small">Kiểm tra thông tin doanh nghiệp để giữ dữ liệu nền tảng đáng tin cậy.</p>
          </div>
          <Link className="btn btn-primary" to="/admin/companies?status=pending">
            Xem danh sách
            <ArrowRight />
          </Link>
        </section>
      ) : (
        <div className="alert alert-success" role="status">
          <CircleCheck />
          <div className="alert-content">Không có doanh nghiệp nào đang chờ xác minh.</div>
        </div>
      )}

      <div className="stack">
        <section className="card table-card" aria-labelledby="recent-users-title">
          <div className="section-head">
            <div>
              <h2 id="recent-users-title">Người dùng mới</h2>
              <p className="text-muted small">{recentUsers.length} tài khoản vừa tham gia nền tảng</p>
            </div>
            <Link className="section-link" to="/admin/users">
              Tất cả
              <ArrowRight />
            </Link>
          </div>
          {recentUsers.length ? (
            <div className="table-wrap">
              <table className="table table-stack">
                <thead>
                  <tr>
                    <th scope="col">Người dùng</th>
                    <th scope="col">Vai trò</th>
                    <th scope="col">Ngày tham gia</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="table-cell-main">
                        <div className="person">
                          <span className="avatar" aria-hidden="true">
                            {initialOf(user.full_name || user.email)}
                          </span>
                          <div className="person-text">
                            <strong>{user.full_name || 'Chưa cập nhật tên'}</strong>
                            <small>{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td data-label="Vai trò">{ROLE_LABELS[user.role] ?? user.role}</td>
                      <td data-label="Ngày tham gia" className="nowrap tabular-nums">
                        {formatDate(user.created_at)}
                      </td>
                      <td data-label="Trạng thái">
                        <UserStatusBadge active={user.is_active} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted table-empty">Chưa có người dùng mới.</p>
          )}
        </section>

        <section className="card table-card" aria-labelledby="recent-companies-title">
          <div className="section-head">
            <div>
              <h2 id="recent-companies-title">Doanh nghiệp mới</h2>
              <p className="text-muted small">{recentCompanies.length} doanh nghiệp vừa đăng ký</p>
            </div>
            <Link className="section-link" to="/admin/companies">
              Tất cả
              <ArrowRight />
            </Link>
          </div>
          {recentCompanies.length ? (
            <div className="table-wrap">
              <table className="table table-stack">
                <thead>
                  <tr>
                    <th scope="col">Doanh nghiệp</th>
                    <th scope="col">Ngày tạo</th>
                    <th scope="col">Xác minh</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCompanies.map((company) => {
                    const status = VERIFICATION_STATUS[company.verification_status]
                    return (
                      <tr key={company.id}>
                        <td className="table-cell-main">
                          <div className="person">
                            <span className="company-logo company-logo-sm" aria-hidden="true">
                              {initialOf(company.name)}
                            </span>
                            <div className="person-text">
                              <strong>{company.name}</strong>
                              <small>{company.tax_code ? `MST ${company.tax_code}` : 'Chưa có mã số thuế'}</small>
                            </div>
                          </div>
                        </td>
                        <td data-label="Ngày tạo" className="nowrap tabular-nums">
                          {formatDate(company.created_at)}
                        </td>
                        <td data-label="Xác minh">
                          <Badge tone={status?.tone}>{status?.label ?? company.verification_status}</Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted table-empty">Chưa có doanh nghiệp mới.</p>
          )}
        </section>
      </div>
    </>
  )
}
