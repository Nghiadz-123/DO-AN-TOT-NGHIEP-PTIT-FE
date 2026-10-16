import { Link, NavLink, useNavigate } from 'react-router-dom'
import CountBadge from '@/components/common/CountBadge'
import useAuth from '@/hooks/useAuth'
import useInbox from '@/hooks/useInbox'
import { FEATURES, ROLES } from '@/utils/constants'

// ai: chỉ hiện khi bật AI cho ứng viên (FEATURES.candidateAi); badge: khóa số đếm trong useInbox().summary
const CANDIDATE_LINKS = [
  { to: '/companies', label: 'Công ty' },
  { to: '/cv', label: 'CV của tôi' },
  { to: '/create-cv', label: 'Tạo CV' },
  { to: '/cv-analysis', label: 'AI chấm điểm CV', ai: true },
  { to: '/recommended-jobs', label: 'Việc làm phù hợp', ai: true },
  { to: '/my-applications', label: 'Đơn ứng tuyển' },
  { to: '/invitations', label: '✉ Thư mời', badge: 'newInvitations', badgeLabel: 'thư mời chưa xem' },
  { to: '/favorites', label: '♥ Yêu thích' },
].filter((link) => !link.ai || FEATURES.candidateAi)

const GUEST_LINKS = [
  { to: '/companies', label: 'Công ty' },
]

const RECRUITER_LINKS = [
  { to: '/jobs', label: 'Việc làm' },
  { to: '/recruiter', label: 'Trang tuyển dụng' },
]

const ADMIN_LINKS = [
  { to: '/admin', label: 'Trang quản trị' },
]

export default function Header() {
  const { user, logout } = useAuth()
  const { summary } = useInbox()
  const navigate = useNavigate()

  const links =
    user?.role === ROLES.ADMIN
      ? ADMIN_LINKS
      : user?.role === ROLES.RECRUITER
      ? RECRUITER_LINKS
      : user
      ? CANDIDATE_LINKS
      : GUEST_LINKS

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
              {l.badge && <CountBadge count={summary[l.badge]} label={l.badgeLabel} />}
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

