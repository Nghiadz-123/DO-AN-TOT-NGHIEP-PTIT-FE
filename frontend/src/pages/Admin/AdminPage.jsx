import useAuth from '@/hooks/useAuth'

export default function AdminPage() {
  const { user } = useAuth()

  const stats = [
    { label: 'Tổng người dùng', value: '9' },
    { label: 'Ứng viên', value: '7' },
    { label: 'Nhà tuyển dụng', value: '2' },
    { label: 'Tin tuyển dụng', value: '9' },
  ]

  const name = user?.fullName || user?.full_name || 'Admin'

  return (
    <div className="admin-page">
      <div className="admin-welcome">
        <h2>Bảng điều khiển Quản trị viên</h2>
        <p className="text-muted">Xin chào, {name} (Admin)</p>
      </div>

      <div className="admin-stats">
        {stats.map((s) => (
          <div key={s.label} className="admin-stat-card card">
            <span className="admin-stat-value">{s.value}</span>
            <span className="admin-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="card admin-info-card">
        <h3>Thông tin tài khoản</h3>
        <table className="admin-table">
          <tbody>
            <tr>
              <td>Email</td>
              <td>{user?.email}</td>
            </tr>
            <tr>
              <td>Vai trò</td>
              <td>Quản trị viên</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card admin-info-card">
        <h3>Chức năng sắp ra mắt</h3>
        <ul className="admin-feature-list">
          <li>Quản lý người dùng (khóa/mở khóa tài khoản)</li>
          <li>Quản lý tin tuyển dụng (duyệt/ẩn tin)</li>
          <li>Báo cáo thống kê toàn hệ thống</li>
          <li>Cấu hình hệ thống AI</li>
        </ul>
      </div>
    </div>
  )
}

