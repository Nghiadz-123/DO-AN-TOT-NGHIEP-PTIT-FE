import { Link } from 'react-router-dom'
import adminApi from '@/api/adminApi'
import { StatusBadge } from '@/components/common/Badge'
import Loading from '@/components/common/Loading'
import useFetch from '@/hooks/useFetch'
import { formatDate } from '@/utils/formatters'

const STATS = [
  { key: 'total_users', label: 'Tổng người dùng', icon: '♙', tone: 'blue' },
  { key: 'total_companies', label: 'Doanh nghiệp', icon: '▤', tone: 'violet' },
  { key: 'total_jobs', label: 'Tin tuyển dụng', icon: '▣', tone: 'green' },
  { key: 'total_applications', label: 'Lượt ứng tuyển', icon: '↗', tone: 'orange' },
]

export default function AdminDashboardPage() {
  const { data, loading, error } = useFetch(() => adminApi.getOverview(), [])

  if (loading) return <Loading />
  if (error) return <div className="alert alert-error">Không tải được dữ liệu quản trị: {error}</div>

  return (
    <>
      <div className="admin-page-heading">
        <div><span className="admin-eyebrow">TRUNG TÂM ĐIỀU HÀNH</span><h1>Tổng quan hệ thống</h1><p>Theo dõi hoạt động và xử lý các mục cần quản trị.</p></div>
        <div className="admin-date-chip">● Dữ liệu trực tiếp</div>
      </div>

      <div className="admin-stat-grid">
        {STATS.map((stat) => <article className="card admin-stat-card" key={stat.key}>
          <div className={`admin-stat-icon ${stat.tone}`}>{stat.icon}</div>
          <div><span>{stat.label}</span><strong>{data[stat.key] ?? 0}</strong></div>
          <div className="admin-stat-foot">{stat.key === 'total_companies' ? <>{data.pending_companies ?? 0} chờ xác minh</> : stat.key === 'total_jobs' ? <>{data.published_jobs ?? 0} đang hiển thị</> : stat.key === 'total_users' ? <>{data.candidates_count ?? 0} ứng viên · {data.employers_count ?? 0} nhà tuyển dụng</> : 'Tổng cộng trên nền tảng'}</div>
        </article>)}
      </div>

      <section className="card admin-review-banner">
        <div className="admin-review-symbol">✓</div>
        <div><strong>{data.pending_companies ?? 0} doanh nghiệp đang chờ xác minh</strong><p>Kiểm tra thông tin doanh nghiệp để giữ dữ liệu nền tảng đáng tin cậy.</p></div>
        <Link className="btn btn-primary" to="/admin/companies?status=pending">Xem danh sách <span>→</span></Link>
      </section>

      <section className="card admin-table-card">
        <div className="admin-section-heading"><div><h2>Người dùng mới</h2><p>5 tài khoản vừa tham gia nền tảng</p></div><Link className="admin-text-link" to="/admin/users">Tất cả người dùng →</Link></div>
        <div className="table-wrap"><table className="table admin-table"><thead><tr><th>Người dùng</th><th>Vai trò</th><th>Ngày tham gia</th><th>Trạng thái</th></tr></thead><tbody>
          {(data.recent_users ?? []).map((user) => <tr key={user.id}><td><div className="admin-person"><span className="admin-avatar">{(user.full_name || user.email || 'U').charAt(0).toUpperCase()}</span><div><strong>{user.full_name || 'Chưa cập nhật'}</strong><small>{user.email}</small></div></div></td><td><span className="admin-role">{user.role === 'admin' ? 'Quản trị viên' : user.role === 'employer' ? 'Nhà tuyển dụng' : 'Ứng viên'}</span></td><td>{formatDate(user.created_at)}</td><td><span className={`badge ${user.is_active ? 'badge-success' : 'badge-neutral'}`}>{user.is_active ? 'Đang hoạt động' : 'Đã khóa'}</span></td></tr>)}
          {!(data.recent_users ?? []).length && <tr><td colSpan="4" className="text-muted">Chưa có người dùng mới.</td></tr>}
        </tbody></table></div>
      </section>
    </>
  )
}
