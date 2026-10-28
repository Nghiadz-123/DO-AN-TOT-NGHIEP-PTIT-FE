import { Link } from 'react-router-dom'

// Thẻ số liệu tổng quan (NTD, quản trị). to: cả thẻ là liên kết tới danh sách đã lọc sẵn
export default function StatCard({ icon: Icon, tone = 'primary', label, value, hint, to }) {
  const content = (
    <>
      <span className="stat-card-head">
        <span className="stat-card-label">{label}</span>
        {Icon && (
          <span className={`icon-tile icon-tile-${tone}`} aria-hidden="true">
            <Icon />
          </span>
        )}
      </span>
      <strong className="stat-card-value">{value}</strong>
      {hint && <span className="stat-card-hint">{hint}</span>}
    </>
  )

  return to ? (
    <Link to={to} className="card stat-card card-interactive">
      {content}
    </Link>
  ) : (
    <div className="card stat-card">{content}</div>
  )
}
