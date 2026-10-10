import useAuth from '@/hooks/useAuth'
import { API_URL } from '@/utils/constants'

// Backend chưa có API quản trị: xác minh công ty, duyệt kỹ năng... làm trong Django Admin
const DJANGO_ADMIN_URL = `${new URL(API_URL).origin}/admin/`

export default function AdminPage() {
  const { user } = useAuth()

  const name = user?.fullName || user?.full_name || 'Admin'

  return (
    <div className="admin-page">
      <div className="admin-welcome">
        <h2>Bảng điều khiển Quản trị viên</h2>
        <p className="text-muted">Xin chào, {name} (Admin)</p>
      </div>

      <div className="card admin-info-card">
        <h3>Trang quản trị Django</h3>
        <p className="text-muted">
          Xác minh công ty, duyệt kỹ năng mới, quản lý người dùng và tin tuyển dụng (đăng nhập bằng tài khoản superuser).
        </p>
        <a href={DJANGO_ADMIN_URL} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
          Mở Django Admin
        </a>
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

