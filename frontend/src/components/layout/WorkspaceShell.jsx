import { useEffect, useRef } from 'react'
import { Link, Outlet, matchPath, useLocation, useNavigationType } from 'react-router-dom'
import Header from '@/components/layout/Header'

// Khung trang làm việc có thanh bên (nhà tuyển dụng, quản trị). Màn < 1024px: thanh bên thành một hàng cuộn ngang.
// sections: [{ title, links: [{ to, label, icon, end, match }] }]; match(pathname) thay cho so khớp theo `to`
export default function WorkspaceShell({ brand, sections, navLabel }) {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  const navRef = useRef(null)

  const isActive = (link) =>
    link.match ? link.match(pathname) : Boolean(matchPath({ path: link.to, end: Boolean(link.end) }, pathname))

  // Sang trang mới thì về đầu trang; bấm Quay lại (POP) thì để trình duyệt giữ vị trí cũ
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navigationType])

  // Hàng cuộn ngang trên màn hẹp: đưa mục đang mở vào giữa tầm nhìn
  useEffect(() => {
    const nav = navRef.current
    const active = nav?.querySelector('[aria-current="page"]')
    if (!active || nav.scrollWidth <= nav.clientWidth) return
    nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2
  }, [pathname])

  return (
    <>
      <a href="#main-content" className="skip-link">
        Bỏ qua tới nội dung chính
      </a>
      <Header />
      <div className="workspace">
        <aside className="workspace-sidebar">
          <div className="workspace-brand">{brand}</div>
          <nav ref={navRef} className="workspace-nav" aria-label={navLabel}>
            {sections.map((section, index) => (
              <div key={section.title ?? index} className="workspace-nav-group">
                {section.title && <p className="workspace-nav-title">{section.title}</p>}
                {section.links.map((link) => {
                  const active = isActive(link)
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={active ? 'active' : undefined}
                      aria-current={active ? 'page' : undefined}
                    >
                      <link.icon />
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
        </aside>
        <main id="main-content" className="workspace-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </>
  )
}
