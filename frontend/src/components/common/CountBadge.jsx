// Số đếm nhỏ cạnh mục menu (tin nhắn chưa đọc, lời mời đang chờ); 0 thì không hiển thị
export default function CountBadge({ count, label = 'mới' }) {
  if (!count) return null
  return (
    <span className="count-badge" aria-label={`${count} ${label}`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}
