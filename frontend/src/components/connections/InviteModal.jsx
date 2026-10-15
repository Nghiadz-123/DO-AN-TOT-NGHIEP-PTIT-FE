import { useState } from 'react'
import connectionApi from '@/api/connectionApi'
import Modal from '@/components/common/Modal'
import useAuth from '@/hooks/useAuth'
import { getErrorMessage } from '@/utils/formatters'

// Khớp backend connections.services.MESSAGE_MAX_LENGTH
const MESSAGE_MAX = 500

const defaultMessage = (user, candidateName, jobTitle) =>
  [
    `Chào ${candidateName}, mình là ${user.fullName}${user.position ? ` (${user.position})` : ''} tại ${user.companyName}.`,
    jobTitle
      ? `Hồ sơ của bạn rất phù hợp với vị trí "${jobTitle}", mình muốn kết nối để trao đổi thêm.`
      : 'Hồ sơ của bạn rất phù hợp với công ty, mình muốn kết nối để trao đổi thêm.',
  ].join(' ')

// Nhà tuyển dụng gửi lời mời kết bạn tới ứng viên. candidate = { userId, fullName }, job = { id, title } (tùy chọn)
export default function InviteModal({ candidate, job, onClose, onSent }) {
  const { user } = useAuth()
  const [message, setMessage] = useState(() => defaultMessage(user, candidate.fullName, job?.title).slice(0, MESSAGE_MAX))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const send = async () => {
    setSending(true)
    setError('')
    try {
      onSent(await connectionApi.sendRequest({ userId: candidate.userId, jobId: job?.id, message }))
    } catch (err) {
      setError(getErrorMessage(err))
      setSending(false)
    }
  }

  return (
    <Modal
      open
      title={`Kết bạn với ${candidate.fullName}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary" disabled={sending} onClick={send}>
            {sending ? 'Đang gửi...' : 'Gửi lời mời'}
          </button>
        </>
      }
    >
      <p className="text-muted">
        Khi ứng viên chấp nhận, hai bên trở thành bạn bè và có thể nhắn tin trực tiếp. Lời nhắn dưới đây sẽ là tin nhắn
        đầu tiên của cuộc trò chuyện.
      </p>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-group">
        <label htmlFor="invite-message">
          Lời nhắn ({message.length}/{MESSAGE_MAX})
        </label>
        <textarea
          id="invite-message"
          className="input"
          rows={5}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
    </Modal>
  )
}
