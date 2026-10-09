import { Link, NavLink, useNavigate } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import { FEATURES, ROLES } from '@/utils/constants'

// ai: chỉ hiện khi backend đã có module AI (FEATURES.ai)
const CANDIDATE_LINKS = [
  { to: '/jobs', label: 'Tìm việc' },
  { to: '/cv', label: 'CV của tôi' },
  { to: '/cv-analysis', label: 'AI chấm điểm CV', ai: true },
  { to: '/recommended-jobs', label: 'Việc làm phù hợp', ai: true },
  { to: '/my-applications', label: 'Đơn ứng tuyển' },
].filter((link) => !link.ai || FEATURES.ai)

const RECRUITER_LINKS = [
  { to: '/jobs', label: 'Việc làm' },
  { to: '/recruiter', label: 'Trang tuyển dụng' },
]

const ADMIN_LINKS = [
  { to: '/admin', label: 'Trang quản trị' },
]

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const links =
    user?.role === ROLES.ADMIN
      ? ADMIN_LINKS
      : user?.role === ROLES.RECRUITER
      ? RECRUITER_LINKS
      : user
      ? CANDIDATE_LINKS
      : [{ to: '/jobs', label: 'Tìm việc' }]

  const getUserProfilePath = () => {
    if (user?.role === ROLES.ADMIN) return '/admin'
    if (user?.role === ROLES.RECRUITER) return '/recruiter'
    return '/profile'
  }

  const name = user?.fullName || user?.full_name || 'User'

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
              <Link to={getUserProfilePath()} className="user-chip">
                <span className="avatar">{name.charAt(0)}</span>
                <span className="user-name">{name}</span>
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

