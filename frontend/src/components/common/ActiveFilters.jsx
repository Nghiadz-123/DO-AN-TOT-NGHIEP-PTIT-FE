import { X } from 'lucide-react'

// Hàng chip "bộ lọc đang áp dụng": bỏ từng bộ lọc hoặc xóa tất cả
// items: [{ key, label, value }]
export default function ActiveFilters({ items, onRemove, onClear }) {
  if (!items.length) return null

  return (
    <div className="active-filters">
      <span className="active-filters-label">Đang lọc:</span>
      <ul className="chip-list">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className="chip"
              onClick={() => onRemove(item.key)}
              aria-label={`Bỏ lọc ${item.label}: ${item.value}`}
            >
              <span className="active-filter-name">{item.label}:</span> {item.value}
              <X />
            </button>
          </li>
        ))}
      </ul>
      {items.length > 1 && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          Xóa tất cả
        </button>
      )}
    </div>
  )
}
