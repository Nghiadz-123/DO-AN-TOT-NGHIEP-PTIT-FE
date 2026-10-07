import { Link, NavLink, useNavigate } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import { ROLES } from '@/utils/constants'

const CANDIDATE_LINKS = [
  { to: '/jobs', label: 'Tìm việc' },
  { to: '/cv-analysis', label: 'CV & AI chấm điểm' },
  { to: '/recommended-jobs', label: 'Việc làm phù hợp' },
  { to: '/my-applications', label: 'Đơn ứng tuyển' },
]

const RECRUITER_LINKS = [
  { to: '/jobs', label: 'Việc làm' },
  { to: '/recruiter', label: 'Trang tuyển dụng' },
]

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const links = user?.role === ROLES.RECRUITER ? RECRUITER_LINKS : user ? CANDIDATE_LINKS : [{ to: '/jobs', label: 'Tìm việc' }]

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          Smart<span>ATS</span>
        </Link>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <Link to={user.role === ROLES.CANDIDATE ? '/profile' : '/recruiter/account'} className="user-chip">
                <span className="avatar">{user.fullName.charAt(0)}</span>
                <span className="user-name">{user.fullName}</span>
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Đăng nhập
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
