import Badge from '@/components/common/Badge'
import { INVITATION_STATUS } from '@/utils/constants'

// Trạng thái thư mời nhìn từ nhà tuyển dụng; thư đang chờ thì phân biệt ứng viên đã mở hay chưa
export default function InvitationBadge({ invitation }) {
  if (invitation.status === 'pending') {
    return invitation.readAt ? (
      <Badge tone="info">Đã xem, chờ phản hồi</Badge>
    ) : (
      <Badge tone="warning">Ứng viên chưa xem</Badge>
    )
  }
  const meta = INVITATION_STATUS[invitation.status]
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}
