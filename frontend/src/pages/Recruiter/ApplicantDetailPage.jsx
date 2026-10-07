import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import applicationApi from '@/api/applicationApi'
import { RecommendationBadge, StatusBadge } from '@/components/common/Badge'
import Loading from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import ScoreCircle from '@/components/common/ScoreCircle'
import CVParsedInfo from '@/components/cv/CVParsedInfo'
import useFetch from '@/hooks/useFetch'
import { APPLICATION_STATUS, FEATURES, JOB_LEVELS, TRANSITION_LABELS } from '@/utils/constants'
import { formatDate, formatDateTime, formatFileSize, getErrorMessage, labelOf, saveBlob } from '@/utils/formatters'

const VIEWABLE_TYPES = ['application/pdf', 'text/plain']

function RatingStars({ value, onChange, disabled }) {
  return (
    <div className="rating" role="radiogroup" aria-label="Đánh giá ứng viên">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} sao`}
          className={`rating-star ${n <= (value ?? 0) ? 'active' : ''}`}
          disabled={disabled}
          onClick={() => onChange(value === n ? null : n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function ChangeStatusModal({ target, candidateName, onClose, onConfirm }) {
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const isReject = target === 'rejected'

  const confirm = async () => {
    setSaving(true)
    await onConfirm({ note, rejectionReason: reason })
    setSaving(false)
  }

  return (
    <Modal
      open
      title={`${TRANSITION_LABELS[target] ?? 'Chuyển trạng thái'}: ${candidateName}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button className={`btn ${isReject ? 'btn-danger' : 'btn-primary'}`} disabled={saving} onClick={confirm}>
            {saving ? 'Đang lưu...' : 'Xác nhận'}
          </button>
        </>
      }
    >
      <p>
        Hồ sơ sẽ chuyển sang trạng thái <StatusBadge status={target} />
      </p>
      {isReject && (
        <div className="form-group">
          <label htmlFor="reason">Lý do từ chối</label>
          <textarea id="reason" className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
      <div className="form-group">
        <label htmlFor="note">Ghi chú nội bộ (lưu vào lịch sử)</label>
        <textarea
          id="note"
          className="input"
          rows={3}
          placeholder="VD: Hẹn phỏng vấn 9h sáng thứ Hai"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  )
}

export default function ApplicantDetailPage() {
  const { id } = useParams()
  const { data: app, loading, error, setData: setApp } = useFetch(() => applicationApi.getById(id), [id])
  const [target, setTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [screening, setScreening] = useState(false)
  const [actionError, setActionError] = useState('')
  const [cvPreview, setCvPreview] = useState(null)

  // Giải phóng object URL của bản xem trước CV
  useEffect(() => () => cvPreview && URL.revokeObjectURL(cvPreview.url), [cvPreview])

  if (loading) return <Loading />
  if (error) return <div className="alert alert-error">{error}</div>

  const run = async (action) => {
    setActionError('')
    setBusy(true)
    try {
      setApp(await action())
      return true
    } catch (err) {
      setActionError(getErrorMessage(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  const changeStatus = async ({ note, rejectionReason }) => {
    const ok = await run(() => applicationApi.updateStatus(app.id, target, { note, rejectionReason }))
    if (ok) setTarget(null)
  }

  const rate = (rating) => run(() => applicationApi.rate(app.id, rating))

  const openCv = async (download = false) => {
    setActionError('')
    try {
      const { blob, fileName } = await applicationApi.downloadCv(app.id)
      if (download || !VIEWABLE_TYPES.includes(blob.type.split(';')[0])) return saveBlob(blob, fileName)
      setCvPreview({ url: URL.createObjectURL(blob), fileName })
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  const handleScreen = async () => {
    setScreening(true)
    await run(() => applicationApi.screen(app.id))
    setScreening(false)
  }

  const { candidate, cv, job, aiReview } = app

  return (
    <>
      <Link to={`/recruiter/applicants?jobId=${app.jobId}`} className="back-link">
        ← Danh sách ứng viên
      </Link>

      <div className="card applicant-header">
        <div className="avatar avatar-lg">{candidate.fullName.charAt(0)}</div>
        <div className="applicant-info">
          <h1>{candidate.fullName}</h1>
          <p className="text-muted">
            Ứng tuyển <Link to={`/jobs/${job.id}`}>{job.title}</Link> · {formatDate(app.appliedAt)}
          </p>
          <StatusBadge status={app.status} />
        </div>
        <div className="applicant-actions">
          {app.allowedTransitions.length ? (
            <div className="actions">
              {app.allowedTransitions.map((status) => (
                <button
                  key={status}
                  className={`btn btn-sm ${status === 'rejected' ? 'btn-ghost text-danger' : 'btn-outline'}`}
                  disabled={busy}
                  onClick={() => setTarget(status)}
                >
                  {TRANSITION_LABELS[status] ?? APPLICATION_STATUS[status]?.label}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-muted">Hồ sơ đã kết thúc quy trình</span>
          )}
        </div>
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}
      {app.status === 'rejected' && app.rejectionReason && (
        <div className="alert alert-error">Lý do từ chối: {app.rejectionReason}</div>
      )}

      <div className="layout-sidebar">
        <div className="stack">
          <div className="card">
            <h2>Thông tin ứng viên</h2>
            <dl className="info-list info-list-left">
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${candidate.email}`}>{candidate.email}</a>
              </dd>
              <dt>Điện thoại</dt>
              <dd>{candidate.phone || '—'}</dd>
              <dt>Vị trí hiện tại</dt>
              <dd>{candidate.headline || '—'}</dd>
              <dt>Kinh nghiệm</dt>
              <dd>{candidate.yearsOfExperience != null ? `${candidate.yearsOfExperience} năm` : '—'}</dd>
              {candidate.level && (
                <>
                  <dt>Cấp bậc</dt>
                  <dd>{labelOf(JOB_LEVELS, candidate.level)}</dd>
                </>
              )}
              <dt>Địa điểm</dt>
              <dd>{candidate.location || '—'}</dd>
            </dl>
            {candidate.summary && <p className="candidate-summary">{candidate.summary}</p>}
          </div>

          <div className="card">
            <div className="page-header">
              <h2>CV đã nộp</h2>
              <span className="text-muted">
                📎 {cv.fileName} ({formatFileSize(cv.fileSize)})
              </span>
            </div>
            <div className="actions">
              <button className="btn btn-outline btn-sm" onClick={() => (cvPreview ? setCvPreview(null) : openCv())}>
                {cvPreview ? 'Ẩn CV' : 'Xem CV'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => openCv(true)}>
                ⬇ Tải xuống
              </button>
            </div>
            {cvPreview && <iframe className="cv-viewer" src={cvPreview.url} title={`CV ${candidate.fullName}`} />}
            {FEATURES.ai && cv.parsed && (
              <div className="cv-parsed-box">
                <h3>Thông tin AI bóc tách từ CV</h3>
                <CVParsedInfo parsed={cv.parsed} highlightSkills={aiReview?.matchedSkills} />
              </div>
            )}
          </div>

          <div className="card">
            <h2>Thư giới thiệu</h2>
            {app.coverLetter ? <p>{app.coverLetter}</p> : <p className="text-muted">Ứng viên không gửi thư giới thiệu.</p>}
          </div>
        </div>

        <aside className="stack">
          <div className="card">
            <h3>Đánh giá của bạn</h3>
            <RatingStars value={app.rating} onChange={rate} disabled={busy} />
            <small className="text-muted">Bấm lại sao đang chọn để bỏ đánh giá.</small>
          </div>

          <div className="card">
            <h3>Lịch sử xử lý</h3>
            <ol className="history">
              {[...app.history].reverse().map((h) => (
                <li key={h.id} className="history-item">
                  <div>
                    <StatusBadge status={h.toStatus} />
                    <span className="text-muted small"> {formatDateTime(h.createdAt)}</span>
                  </div>
                  <div className="text-muted small">
                    {h.fromStatus ? `${h.changedBy ?? 'Hệ thống'} chuyển từ "${APPLICATION_STATUS[h.fromStatus]?.label}"` : 'Ứng viên nộp hồ sơ'}
                  </div>
                  {h.note && <p className="history-note">{h.note}</p>}
                </li>
              ))}
            </ol>
          </div>

          {FEATURES.ai && (
            <div className="card ai-box">
              <div className="ai-box-title">🤖 Đánh giá của AI</div>
              {screening ? (
                <Loading text="AI đang đánh giá hồ sơ..." />
              ) : aiReview ? (
                <>
                  <div className="ai-review-score">
                    <ScoreCircle score={aiReview.score} size={110} />
                    <RecommendationBadge value={aiReview.recommendation} />
                  </div>
                  <p>{aiReview.summary}</p>
                  <h4>Kỹ năng đáp ứng ({aiReview.matchedSkills.length})</h4>
                  <div className="tags">
                    {aiReview.matchedSkills.map((s) => (
                      <span key={s} className="tag tag-success">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                  {aiReview.missingSkills.length > 0 && (
                    <>
                      <h4>Kỹ năng còn thiếu ({aiReview.missingSkills.length})</h4>
                      <div className="tags">
                        {aiReview.missingSkills.map((s) => (
                          <span key={s} className="tag tag-danger">
                            ✕ {s}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                  <h4 className="text-success">Điểm mạnh</h4>
                  <ul>
                    {aiReview.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  {aiReview.concerns.length > 0 && (
                    <>
                      <h4 className="text-danger">Điểm cần lưu ý</h4>
                      <ul>
                        {aiReview.concerns.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={handleScreen}>
                    ↻ Đánh giá lại
                  </button>
                </>
              ) : (
                <div className="empty-state">
                  <p className="text-muted">Hồ sơ chưa được AI đánh giá mức độ phù hợp với vị trí.</p>
                  <button className="btn btn-primary" onClick={handleScreen}>
                    🤖 Đánh giá bằng AI
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {target && (
        <ChangeStatusModal
          target={target}
          candidateName={candidate.fullName}
          onClose={() => setTarget(null)}
          onConfirm={changeStatus}
        />
      )}
    </>
  )
}
