import { NavLink, Outlet } from 'react-router-dom'
import Header from '@/components/layout/Header'

const LINKS = [
  { to: '/admin', end: true, icon: '▦', label: 'Tổng quan' },
  { to: '/admin/users', icon: '♙', label: 'Người dùng' },
  { to: '/admin/companies', icon: '▤', label: 'Doanh nghiệp' },
  { to: '/admin/jobs', icon: '▣', label: 'Tin tuyển dụng' },
]

export default function AdminLayout() {
  return (
    <>
      <Header />
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-title">
            <span className="admin-mark">A</span>
            <div><strong>Quản trị hệ thống</strong><small>SMART ATS</small></div>
          </div>
          <span className="admin-nav-caption">KHÔNG GIAN QUẢN TRỊ</span>
          <nav className="admin-nav">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end}>
                <span className="admin-nav-icon">{link.icon}</span>{link.label}
              </NavLink>
            ))}
          </nav>
          <div className="admin-sidebar-note"><span className="admin-online-dot" /> Hệ thống đang hoạt động</div>
        </aside>
        <main className="admin-content"><Outlet /></main>
      </div>
    </>
  )
}
