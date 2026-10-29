import { Link } from 'react-router-dom'
import { BriefcaseBusiness } from 'lucide-react'

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="logo-mark" aria-hidden="true">
            <BriefcaseBusiness />
          </span>
          <div>
            <strong>Smart ATS</strong>
            <span>Nền tảng tuyển dụng đa ngành nghề</span>
          </div>
        </div>
        <nav aria-label="Liên kết cuối trang">
          <ul className="footer-links">
            <li>
              <Link to="/jobs">Việc làm</Link>
            </li>
            <li>
              <Link to="/companies">Công ty</Link>
            </li>
          </ul>
        </nav>
        <p>© {YEAR} Smart ATS</p>
      </div>
    </footer>
  )
}
