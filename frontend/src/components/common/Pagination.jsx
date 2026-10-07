// Phân trang theo response chuẩn của API: { count, totalPages, page }
export default function Pagination({ page, totalPages, count, onChange }) {
  if (!totalPages || totalPages <= 1) return null

  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i)

  return (
    <nav className="pagination" aria-label="Phân trang">
      <span className="text-muted">{count} kết quả</span>
      <div className="actions">
        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ‹ Trước
        </button>
        {pages.map((p) => (
          <button
            key={p}
            className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ))}
        <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Sau ›
        </button>
      </div>
    </nav>
  )
}
