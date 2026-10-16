import { useState } from 'react'
import { Link } from 'react-router-dom'
import invitationApi from '@/api/invitationApi'
import jobApi from '@/api/jobApi'
import Loading from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import useAuth from '@/hooks/useAuth'
import useFetch from '@/hooks/useFetch'
import { getErrorMessage } from '@/utils/formatters'

// Khớp backend invitations.services.MESSAGE_MAX_LENGTH
const MESSAGE_MAX = 2000

const defaultMessage = (user, candidateName, jobTitle) =>
  `Chào ${candidateName}, mình là ${user.fullName}${user.position ? ` - ${user.position}` : ''} tại ${user.companyName}. ` +
  `Hồ sơ của bạn rất phù hợp với vị trí "${jobTitle}" công ty đang tuyển. ` +
  'Mời bạn xem chi tiết tin tuyển dụng và nộp hồ sơ nhé!'

// Nhà tuyển dụng gửi thư mời ứng tuyển. candidate = { id, fullName }; jobId: tin chọn sẵn (tùy chọn)
export default function InviteModal({ candidate, jobId: initialJobId, onClose, onSent }) {
  const { user } = useAuth()
  const { data: jobsPage, loading, error: loadError } = useFetch(() => jobApi.getMine({ pageSize: 100 }), [])
  const [jobId, setJobId] = useState(initialJobId ?? '')
  const [message, setMessage] = useState(null) // null: dùng thư mẫu theo tin đang chọn
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  // Chỉ mời ứng tuyển vào tin đang nhận hồ sơ
  const openJobs = (jobsPage?.results ?? []).filter((j) => j.status === 'published')
  const job = openJobs.find((j) => j.id === jobId) ?? openJobs[0]
  const text = message ?? (job ? defaultMessage(user, candidate.fullName, job.title) : '')

  const send = async () => {
    setSending(true)
    setError('')
    try {
      onSent(await invitationApi.send({ candidateId: candidate.id, jobId: job.id, message: text }))
    } catch (err) {
      setError(getErrorMessage(err))
      setSending(false)
    }
  }

  return (
    <Modal
      open
      title={`Gửi thư mời tới ${candidate.fullName}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary" disabled={sending || !job || !text.trim()} onClick={send}>
            {sending ? 'Đang gửi...' : '✉ Gửi thư mời'}
          </button>
        </>
      }
    >
      {loading && <Loading />}
      {loadError && <div className="alert alert-error">{loadError}</div>}
      {jobsPage && !job && (
        <div className="alert alert-info">
          Công ty chưa có tin đang tuyển. <Link to="/recruiter/jobs/new">Đăng tin mới</Link> để gửi thư mời ứng tuyển.
        </div>
      )}
      {job && (
        <>
          <p className="text-muted">
            Ứng viên nhận thư ở trang Thư mời và có thể nộp hồ sơ ngay vào tin bạn chọn. Mỗi tin chỉ gửi được một thư
            cho một ứng viên.
          </p>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label htmlFor="invite-job">Mời ứng tuyển vị trí</label>
            <select id="invite-job" className="input" value={job.id} onChange={(e) => setJobId(e.target.value)}>
              {openJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="invite-message">
              Nội dung thư ({text.length}/{MESSAGE_MAX})
            </label>
            <textarea
              id="invite-message"
              className="input"
              rows={6}
              maxLength={MESSAGE_MAX}
              value={text}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </>
      )}
    </Modal>
  )
}
