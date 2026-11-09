import { RefreshCw, TriangleAlert } from 'lucide-react'

// Lỗi tải dữ liệu: nêu nguyên nhân + đường khắc phục (thử lại, hoặc hành động khác qua `action`)
export default function ErrorState({ message, onRetry, title = 'Không tải được dữ liệu', action }) {
  return (
    <div className="empty-state" role="alert">
      <span className="empty-state-icon is-danger">
        <TriangleAlert />
      </span>
      <h2 className="empty-state-title">{title}</h2>
      {message && <p>{message}</p>}
      {(onRetry || action) && (
        <div className="actions">
          {onRetry && (
            <button type="button" className="btn btn-outline" onClick={onRetry}>
              <RefreshCw /> Thử lại
            </button>
          )}
          {action}
        </div>
      )}
    </div>
  )
}
