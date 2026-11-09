import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <section className="empty-state not-found">
      <span className="empty-state-icon">
        <Compass />
      </span>
      <p className="not-found-code">404</p>
      <h1 className="empty-state-title">Không tìm thấy trang</h1>
      <p>Trang bạn tìm không tồn tại hoặc đã bị di chuyển.</p>
      <div className="actions">
        <Link to="/" className="btn btn-primary">
          Về trang chủ
        </Link>
        <Link to="/jobs" className="btn btn-outline">
          Tìm việc làm
        </Link>
      </div>
    </section>
  )
}
