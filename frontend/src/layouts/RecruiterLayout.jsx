import { NavLink, Outlet } from 'react-router-dom'
import Header from '@/components/layout/Header'
import useAuth from '@/hooks/useAuth'

export default function RecruiterLayout() {
  const { user } = useAuth()

  return (
    <>
      <Header />
      <div className="recruiter-layout">
        <aside className="sidebar">
          <div className="sidebar-company">
            <div className="company-logo">{user.companyName?.charAt(0) ?? 'C'}</div>
            <strong>{user.companyName}</strong>
          </div>
          <NavLink to="/recruiter" end>
            📊 Tổng quan
          </NavLink>
          <NavLink to="/recruiter/jobs" end>
            📋 Tin tuyển dụng
          </NavLink>
          <NavLink to="/recruiter/jobs/new">➕ Đăng tin mới</NavLink>
          <NavLink to="/recruiter/applicants">👥 Ứng viên & AI sàng lọc</NavLink>
        </aside>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </>
  )
}
