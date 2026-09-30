import { Link } from 'react-router-dom'
import EmptyState from '@/components/common/EmptyState'

export default function NotFoundPage() {
  return (
    <EmptyState
      title="404 - Không tìm thấy trang"
      description="Trang bạn tìm không tồn tại hoặc đã bị di chuyển."
      action={
        <Link to="/" className="btn btn-primary">
          Về trang chủ
        </Link>
      }
    />
  )
}
