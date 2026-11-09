import { useEffect } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'

export default function MainLayout() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()

  // Sang trang mới thì về đầu trang; bấm Quay lại (POP) thì để trình duyệt giữ vị trí cũ
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navigationType])

  return (
    <>
      <a href="#main-content" className="skip-link">
        Bỏ qua tới nội dung chính
      </a>
      <Header />
      <main id="main-content" className="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
