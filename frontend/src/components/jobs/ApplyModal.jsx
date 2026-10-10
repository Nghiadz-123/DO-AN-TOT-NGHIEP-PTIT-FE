import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import applicationApi from '@/api/applicationApi'
import cvApi from '@/api/cvApi'
import Badge from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import ScoreCircle from '@/components/common/ScoreCircle'
import useFetch from '@/hooks/useFetch'
import { FEATURES } from '@/utils/constants'
import { formatDate, getErrorMessage } from '@/utils/formatters'

export default function ApplyModal({ job, open, onClose, onApplied }) {
  const { data: cvs, loading, error } = useFetch(() => (open ? cvApi.getMine() : Promise.resolve([])), [open])
  const [cvId, setCvId] = useState('')
  const [match, setMatch] = useState(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Mặc định chọn CV chính
  const selectedCvId = cvId || (cvs?.find((cv) => cv.isDefault) ?? cvs?.[0])?.id || ''

  // AI đánh giá nhanh mức độ phù hợp của CV đang chọn với công việc (khi backend có module AI)
  useEffect(() => {
    if (!FEATURES.ai || !open || !selectedCvId) return
    let active = true
    cvApi
      .matchJob(selectedCvId, job.id)
      .then((m) => active && setMatch({ cvId: selectedCvId, ...m }))
      .catch(() => active && setMatch({ cvId: selectedCvId, failed: true }))
    return () => {
      active = false
    }
  }, [open, selectedCvId, job.id])

  const currentMatch = match?.cvId === selectedCvId ? match : null

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const application = await applicationApi.apply({ jobId: job.id, cvId: selectedCvId, coverLetter })
      onApplied(application)
    } catch (err) {
      setSubmitError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const hasCVs = cvs?.length > 0

  return (
    <Modal
      open={open}
      title={`Ứng tuyển: ${job.title}`}
      onClose={onClose}
      footer={
        hasCVs && (
          <>
            <button className="btn btn-ghost" onClick={onClose}>
              Hủy
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !selectedCvId}>
              {submitting ? 'Đang gửi...' : 'Nộp hồ sơ'}
            </button>
          </>
        )
      }
    >
      {loading && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}
      {!loading && !hasCVs && (
        <EmptyState
          title="Bạn chưa có CV nào"
          description="Hãy tải CV lên để ứng tuyển."
          action={
            <Link to={`/cv/new?redirect=/jobs/${job.id}`} className="btn btn-primary">
              Tải CV lên
            </Link>
          }
        />
      )}
      {hasCVs && (
        <>
          <div className="form-group">
            <label>Chọn CV</label>
            <div className="cv-options">
              {cvs.map((cv) => (
                <label key={cv.id} className={`cv-option ${cv.id === selectedCvId ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="cv"
                    checked={cv.id === selectedCvId}
                    onChange={() => setCvId(cv.id)}
                  />
                  <span>
                    <strong>{cv.title || cv.fileName}</strong> {cv.isDefault && <Badge tone="primary">CV chính</Badge>}
                    <small className="text-muted"> · Cập nhật {formatDate(cv.updatedAt ?? cv.uploadedAt)}</small>
                  </span>
                </label>
              ))}
            </div>
            <Link to={`/cv/new?redirect=/jobs/${job.id}`} className="small">
              + Tải CV khác
            </Link>
          </div>

          {FEATURES.ai && (
            <div className="ai-box">
              <div className="ai-box-title">✨ AI đánh giá mức độ phù hợp</div>
              {currentMatch?.failed ? (
                <p className="text-muted">Không thể đánh giá lúc này, bạn vẫn có thể nộp hồ sơ.</p>
              ) : currentMatch ? (
                <div className="match-summary">
                  <ScoreCircle score={currentMatch.score} size={72} />
                  <div>
                    <ul className="match-reasons">
                      {currentMatch.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                    {currentMatch.missingSkills.length > 0 && (
                      <p className="text-muted">Còn thiếu: {currentMatch.missingSkills.join(', ')}</p>
                    )}
                  </div>
                </div>
              ) : (
                <Loading text="Đang phân tích..." />
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="coverLetter">Thư giới thiệu (không bắt buộc)</label>
            <textarea
              id="coverLetter"
              className="input"
              rows={4}
              placeholder="Giới thiệu ngắn gọn về bản thân và lý do bạn phù hợp với vị trí này..."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
          </div>
          {submitError && <div className="alert alert-error">{submitError}</div>}
        </>
      )}
    </Modal>
  )
}
