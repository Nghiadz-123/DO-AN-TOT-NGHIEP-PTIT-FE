import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Briefcase,
  BriefcaseBusiness,
  Building,
  ChevronDown,
  ClipboardList,
  FilePen,
  FileText,
  Gauge,
  Heart,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Settings,
  Sparkles,
  Target,
  UserRound,
  X,
} from 'lucide-react'
import CountBadge from '@/components/common/CountBadge'
import DropdownMenu from '@/components/common/DropdownMenu'
import useAuth from '@/hooks/useAuth'
import useInbox from '@/hooks/useInbox'
import { FEATURES, ROLES } from '@/utils/constants'

// ai: chỉ hiện khi bật AI cho ứng viên (FEATURES.candidateAi); icon: dùng trong menu thu gọn
const CANDIDATE_LINKS = [
  { to: '/jobs', label: 'Việc làm', icon: Briefcase },
  { to: '/companies', label: 'Công ty', icon: Building },
  { to: '/recommended-jobs', label: 'Việc làm phù hợp', icon: Target, ai: true },
  { to: '/cv', label: 'CV của tôi', icon: FileText },
  { to: '/create-cv', label: 'Tạo CV', icon: FilePen },
  { to: '/cv-analysis', label: 'Chấm điểm CV', icon: Gauge, ai: true },
  { to: '/my-applications', label: 'Đơn ứng tuyển', icon: ClipboardList },
].filter((link) => !link.ai || FEATURES.candidateAi)

// Lối tắt dạng icon ở header; badge: khóa số đếm trong useInbox().summary
const CANDIDATE_SHORTCUTS = [
  { to: '/invitations', label: 'Thư mời', icon: Mail, badge: 'newInvitations', badgeLabel: 'thư mời chưa xem' },
  { to: '/favorites', label: 'Yêu thích', icon: Heart, desktopOnly: true },
]

const GUEST_LINKS = [
  { to: '/jobs', label: 'Việc làm', icon: Briefcase },
  { to: '/companies', label: 'Công ty', icon: Building },
]

const RECRUITER_LINKS = [
  { to: '/jobs', label: 'Việc làm', icon: Briefcase },
  { to: '/recruiter', label: 'Trang tuyển dụng', icon: LayoutDashboard },
]

const ADMIN_LINKS = [{ to: '/admin', label: 'Trang quản trị', icon: LayoutDashboard }]

// Mục trong menu tài khoản theo vai trò (Đăng xuất luôn ở cuối, tách riêng)
const ACCOUNT_LINKS = {
  [ROLES.CANDIDATE]: [{ to: '/profile', label: 'Hồ sơ cá nhân', icon: UserRound }],
  [ROLES.RECRUITER]: [
    { to: '/recruiter', label: 'Trang tuyển dụng', icon: LayoutDashboard },
    { to: '/recruiter/account', label: 'Tài khoản', icon: Settings },
  ],
  [ROLES.ADMIN]: [{ to: '/admin', label: 'Trang quản trị', icon: LayoutDashboard }],
}

export default function Header() {
  const { user, logout } = useAuth()
  const { summary } = useInbox()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const menuId = useId()
  const toggleRef = useRef(null)
  // Menu thu gọn gắn với trang lúc mở: chuyển trang là tự đóng
  const [menuOpenAt, setMenuOpenAt] = useState(null)
  const menuOpen = menuOpenAt === pathname

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setMenuOpenAt(null)
      toggleRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const role = user?.role
  const links =
    role === ROLES.ADMIN ? ADMIN_LINKS : role === ROLES.RECRUITER ? RECRUITER_LINKS : user ? CANDIDATE_LINKS : GUEST_LINKS
  const shortcuts = role === ROLES.CANDIDATE ? CANDIDATE_SHORTCUTS : []
  const accountLinks = (user && ACCOUNT_LINKS[role]) || []
  const name = user?.fullName || user?.full_name || 'User'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const shortcutLabel = (item) => {
    const count = item.badge ? summary[item.badge] : 0
    return count ? `${item.label} (${count} ${item.badgeLabel})` : item.label
  }

  return (
    <header className={`header ${links.length > 4 ? 'header-wide' : ''}`}>
      <div className="header-inner">
        <Link to="/" className="logo" aria-label="Smart ATS - Trang chủ">
          <span className="logo-mark" aria-hidden="true">
            <BriefcaseBusiness />
          </span>
          <span>
            Smart<span className="logo-accent">ATS</span>
          </span>
        </Link>

        <nav className="nav" aria-label="Điều hướng chính">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}>
              {l.ai && <Sparkles className="nav-ai-icon" />}
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          {shortcuts.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              className={`header-icon-btn ${s.desktopOnly ? 'header-desktop-only' : ''}`}
              aria-label={shortcutLabel(s)}
              title={s.label}
            >
              <s.icon />
              {s.badge && <CountBadge count={summary[s.badge]} label={s.badgeLabel} />}
            </NavLink>
          ))}

          {user ? (
            <div className="header-desktop-only">
              <DropdownMenu
                triggerClassName="user-menu-trigger"
                label={`Tài khoản ${name}`}
                trigger={
                  <>
                    <span className="avatar" aria-hidden="true">
                      {name.charAt(0)}
                    </span>
                    <span className="user-name">{name}</span>
                    <ChevronDown />
                  </>
                }
                header={
                  <>
                    <strong>{name}</strong>
                    <small>{user.email}</small>
                  </>
                }
                items={[...accountLinks, { divider: true }, { label: 'Đăng xuất', icon: LogOut, onClick: handleLogout, danger: true }]}
              />
            </div>
          ) : (
            <div className="actions header-desktop-only">
              <Link to="/login" className="btn btn-ghost btn-sm">
                Đăng nhập
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Đăng ký
              </Link>
            </div>
          )}

          <button
            ref={toggleRef}
            type="button"
            className="header-icon-btn menu-toggle"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            onClick={() => setMenuOpenAt(menuOpen ? null : pathname)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <div id={menuId} className={`mobile-nav ${menuOpen ? 'open' : ''}`}>
        <nav className="mobile-nav-inner" aria-label="Menu">
          {[...links, ...shortcuts].map((l) => (
            <NavLink key={l.to} to={l.to} className="mobile-nav-link">
              <l.icon />
              {l.label}
              {l.badge && <CountBadge count={summary[l.badge]} label={l.badgeLabel} />}
            </NavLink>
          ))}
          {user ? (
            <div className="mobile-nav-section">
              <div className="mobile-nav-user">
                <span className="avatar" aria-hidden="true">
                  {name.charAt(0)}
                </span>
                <div>
                  <strong>{name}</strong>
                  <small>{user.email}</small>
                </div>
              </div>
              {accountLinks.map((l) => (
                <NavLink key={l.to} to={l.to} end className="mobile-nav-link">
                  <l.icon />
                  {l.label}
                </NavLink>
              ))}
              <button type="button" className="mobile-nav-link mobile-nav-danger" onClick={handleLogout}>
                <LogOut />
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="mobile-nav-actions">
              <Link to="/login" className="btn btn-outline">
                Đăng nhập
              </Link>
              <Link to="/register" className="btn btn-primary">
                Đăng ký
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
