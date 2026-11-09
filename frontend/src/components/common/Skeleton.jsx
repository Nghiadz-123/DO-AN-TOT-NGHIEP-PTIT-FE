// Khung giữ chỗ khi tải danh sách lần đầu: giữ bố cục ổn định thay cho spinner
export function SkeletonCards({ count = 6, className = 'grid grid-3', label = 'Đang tải danh sách' }) {
  return (
    <div className={className} role="status" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card skeleton-card" aria-hidden="true">
          <div className="skeleton-row">
            <span className="skeleton skeleton-block" />
            <div className="skeleton-stack">
              <span className="skeleton skeleton-title" />
              <span className="skeleton skeleton-line-short" />
            </div>
          </div>
          <span className="skeleton" />
          <span className="skeleton skeleton-line-short" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonLines({ lines = 3, label = 'Đang tải' }) {
  return (
    <div className="skeleton-card" role="status" aria-label={label}>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className={`skeleton ${i === lines - 1 ? 'skeleton-line-short' : ''}`} aria-hidden="true" />
      ))}
    </div>
  )
}
