import { NavLink, Outlet } from 'react-router-dom'
import CompanyLogo from '@/components/common/CompanyLogo'
import Header from '@/components/layout/Header'
import useAuth from '@/hooks/useAuth'
import { FEATURES } from '@/utils/constants'

export default function RecruiterLayout() {
  const { user } = useAuth()

  return (
    <>
      <Header />
      <div className="recruiter-layout">
        <aside className="sidebar">
          <div className="sidebar-company">
            <CompanyLogo name={user.companyName} src={user.companyLogo} />
            <strong>{user.companyName}</strong>
          </div>
          <NavLink to="/recruiter" end>
            📊 Tổng quan
          </NavLink>
          <NavLink to="/recruiter/jobs" end>
            📋 Tin tuyển dụng
          </NavLink>
          <NavLink to="/recruiter/jobs/new">➕ Đăng tin mới</NavLink>
          <NavLink to="/recruiter/applicants">👥 {FEATURES.ai ? 'Ứng viên & AI sàng lọc' : 'Ứng viên'}</NavLink>
          <NavLink to="/recruiter/company">🏢 Hồ sơ công ty</NavLink>
          <NavLink to="/recruiter/account">👤 Tài khoản</NavLink>
        </aside>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </>
  )
}
