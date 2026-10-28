import { Eye, EyeOff } from 'lucide-react'
import Badge from '@/components/common/Badge'
import { INVITATION_STATUS } from '@/utils/constants'

// Trạng thái thư mời nhìn từ nhà tuyển dụng; thư đang chờ thì phân biệt ứng viên đã mở hay chưa
export default function InvitationBadge({ invitation }) {
  if (invitation.status === 'pending') {
    return invitation.readAt ? (
      <Badge tone="info">
        <Eye />
        Đã xem, chờ phản hồi
      </Badge>
    ) : (
      <Badge tone="warning">
        <EyeOff />
        Ứng viên chưa xem
      </Badge>
    )
  }
  const meta = INVITATION_STATUS[invitation.status]
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}
