import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Mail,
  MessageSquareText,
  Paperclip,
  RefreshCw,
  Sparkles,
  Star,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react'
import applicationApi from '@/api/applicationApi'
import { RecommendationBadge, StatusBadge } from '@/components/common/Badge'
import ErrorState from '@/components/common/ErrorState'
import Loading from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import ScoreCircle from '@/components/common/ScoreCircle'
import { SkeletonLines } from '@/components/common/Skeleton'
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
          <Star />
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
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Hủy
          </button>
          <button
            type="button"
            className={`btn ${isReject ? 'btn-danger' : 'btn-primary'}`}
            disabled={saving}
            onClick={confirm}
          >
            {saving && <span className="spinner" aria-hidden="true" />}
            {saving ? 'Đang lưu...' : 'Xác nhận'}
          </button>
        </>
      }
    >
      <p className="confirm-message">
        Hồ sơ sẽ chuyển sang trạng thái <StatusBadge status={target} />
      </p>
      {isReject && (
        <div className="form-group">
          <label htmlFor="reason">Lý do từ chối</label>
          <textarea id="reason" className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
      <div className="form-group">
        <label htmlFor="note">Ghi chú nội bộ</label>
        <textarea
          id="note"
          className="input"
          rows={3}
          aria-describedby="note-hint"
          placeholder="VD: Hẹn phỏng vấn 9h sáng thứ Hai"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <small id="note-hint" className="field-hint">
          Lưu vào lịch sử xử lý, ứng viên không thấy ghi chú này.
        </small>
      </div>
    </Modal>
  )
}

function CvPanel({ app, cvFile, cvError }) {
  const [cvTab, setCvTab] = useState('file')
  const { candidate, cv, aiReview } = app
  const hasParsed = FEATURES.ai && Boolean(cv.parsed)

  return (
    <section className="card" aria-labelledby="cv-title">
      <div className="cv-panel-head">
        <div>
          <h2 id="cv-title">CV đã nộp</h2>
          <p className="text-muted small cv-file-name">
            <Paperclip />
            {cv.fileName} ({formatFileSize(cv.fileSize)})
          </p>
        </div>
        <div className="actions">
          {cvFile?.viewable && (
            <a className="btn btn-outline btn-sm" href={cvFile.url} target="_blank" rel="noreferrer">
              <ExternalLink />
              Mở tab mới
            </a>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!cvFile}
            onClick={() => saveBlob(cvFile.blob, cvFile.fileName)}
          >
            <Download />
            Tải xuống
          </button>
        </div>
      </div>

      {hasParsed && (
        <div className="tabs" role="tablist" aria-label="Cách xem CV">
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={cvTab === 'file'}
            onClick={() => setCvTab('file')}
          >
            <FileText />
            File CV gốc
          </button>
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={cvTab === 'parsed'}
            onClick={() => setCvTab('parsed')}
          >
            <Sparkles />
            Tóm tắt AI bóc tách
          </button>
        </div>
      )}

      {hasParsed && cvTab === 'parsed' ? (
        <CVParsedInfo parsed={cv.parsed} highlightSkills={aiReview?.matchedSkills} />
      ) : cvError ? (
        <div className="alert alert-error" role="alert">
          <TriangleAlert />
          <div className="alert-content">{cvError}</div>
        </div>
      ) : !cvFile ? (
        <Loading text="Đang tải CV..." />
      ) : cvFile.viewable ? (
        <iframe className="cv-viewer cv-viewer-tall" src={cvFile.url} title={`CV ${candidate.fullName}`} />
      ) : (
        <div className="empty-state">
          <span className="empty-state-icon">
            <FileText />
          </span>
          <p>
            CV “{cvFile.fileName}” là file Word, trình duyệt không xem trực tiếp được.
            {hasParsed
              ? ' Xem nhanh nội dung ở tab “Tóm tắt AI bóc tách” hoặc tải về để mở bằng Word.'
              : ' Bấm “Tải xuống” để mở bằng Word.'}
          </p>
          <div className="actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => saveBlob(cvFile.blob, cvFile.fileName)}>
              <Download />
              Tải xuống
            </button>
            {hasParsed && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setCvTab('parsed')}>
                Xem tóm tắt AI
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function AiReviewCard({ aiReview, screening, onScreen }) {
  return (
    <section className="card ai-box" aria-labelledby="ai-review-title">
      <h2 id="ai-review-title" className="ai-box-title">
        <Sparkles />
        Đánh giá của AI
      </h2>
      {screening ? (
        <Loading text="AI đang đánh giá hồ sơ..." />
      ) : aiReview ? (
        <>
          <div className="ai-review-score">
            <ScoreCircle score={aiReview.score} size={110} />
            <RecommendationBadge value={aiReview.recommendation} />
          </div>
          <p>{aiReview.summary}</p>
          <h3 className="ai-review-heading">Kỹ năng đáp ứng ({aiReview.matchedSkills.length})</h3>
          <ul className="tags">
            {aiReview.matchedSkills.map((s) => (
              <li key={s} className="tag tag-success">
                <Check />
                {s}
              </li>
            ))}
          </ul>
          {aiReview.missingSkills.length > 0 && (
            <>
              <h3 className="ai-review-heading">Kỹ năng còn thiếu ({aiReview.missingSkills.length})</h3>
              <ul className="tags">
                {aiReview.missingSkills.map((s) => (
                  <li key={s} className="tag tag-danger">
                    <X />
                    {s}
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3 className="ai-review-heading text-success">Điểm mạnh</h3>
          <ul>
            {aiReview.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {aiReview.concerns.length > 0 && (
            <>
              <h3 className="ai-review-heading text-danger">Điểm cần lưu ý</h3>
              <ul>
                {aiReview.concerns.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          <button type="button" className="btn btn-ghost btn-sm align-start" onClick={onScreen}>
            <RefreshCw />
            Đánh giá lại
          </button>
        </>
      ) : (
        <>
          <p className="text-muted">Hồ sơ chưa được AI đánh giá mức độ phù hợp với vị trí.</p>
          <button type="button" className="btn btn-primary align-start" onClick={onScreen}>
            <Sparkles />
            Đánh giá bằng AI
          </button>
        </>
      )}
    </section>
  )
}

export default function ApplicantDetailPage() {
  const { id } = useParams()
  const { data: app, loading, error, setData: setApp, reload } = useFetch(() => applicationApi.getById(id), [id])
  const [target, setTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [screening, setScreening] = useState(false)
  const [actionError, setActionError] = useState('')
  const [cvFile, setCvFile] = useState(null) // { blob, fileName, url, viewable }
  const [cvError, setCvError] = useState('')
  const appId = app?.id

  // Tải sẵn file CV khi mở trang để NTD đọc ngay, không phải bấm "Xem CV"
  useEffect(() => {
    if (!appId) return
    let active = true
    let url = null
    applicationApi
      .downloadCv(appId)
      .then(({ blob, fileName }) => {
        if (!active) return
        url = URL.createObjectURL(blob)
        setCvFile({ blob, fileName, url, viewable: VIEWABLE_TYPES.includes(blob.type.split(';')[0]) })
      })
      .catch((err) => active && setCvError(getErrorMessage(err)))
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [appId])

  const backLink = (
    <Link to={app ? `/recruiter/applicants?jobId=${app.jobId}` : '/recruiter/applicants'} className="back-link">
      <ArrowLeft />
      Danh sách ứng viên
    </Link>
  )

  if (loading) {
    return (
      <>
        {backLink}
        <div className="card">
          <SkeletonLines lines={4} label="Đang tải hồ sơ ứng viên" />
        </div>
      </>
    )
  }
  if (error) {
    return (
      <>
        {backLink}
        <ErrorState message={error} onRetry={reload} />
      </>
    )
  }

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

  const handleScreen = async () => {
    setScreening(true)
    await run(() => applicationApi.screen(app.id))
    setScreening(false)
  }

  const { candidate, job, aiReview } = app
  const forward = app.allowedTransitions.filter((s) => s !== 'rejected')
  const canReject = app.allowedTransitions.includes('rejected')

  return (
    <>
      {backLink}

      <section className="card applicant-header" aria-labelledby="applicant-name">
        <span className="avatar avatar-lg" aria-hidden="true">
          {candidate.fullName.charAt(0)}
        </span>
        <div className="applicant-info">
          <div className="applicant-title">
            <h1 id="applicant-name">{candidate.fullName}</h1>
            <StatusBadge status={app.status} />
          </div>
          <p className="text-muted">
            Ứng tuyển <Link to={`/jobs/${job.id}`}>{job.title}</Link> · nộp ngày {formatDate(app.appliedAt)}
          </p>
        </div>
        <div className="applicant-actions">
          {app.allowedTransitions.length ? (
            <div className="actions">
              {canReject && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-danger"
                  disabled={busy}
                  onClick={() => setTarget('rejected')}
                >
                  <X />
                  {TRANSITION_LABELS.rejected}
                </button>
              )}
              {forward.map((status, index) => (
                <button
                  key={status}
                  type="button"
                  className={`btn btn-sm ${index === 0 ? 'btn-primary' : 'btn-outline'}`}
                  disabled={busy}
                  onClick={() => setTarget(status)}
                >
                  {TRANSITION_LABELS[status] ?? APPLICATION_STATUS[status]?.label}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-muted small">Hồ sơ đã kết thúc quy trình</span>
          )}
        </div>
      </section>

      {actionError && (
        <div className="alert alert-error" role="alert">
          <TriangleAlert />
          <div className="alert-content">{actionError}</div>
        </div>
      )}
      {app.status === 'rejected' && app.rejectionReason && (
        <div className="alert alert-warning">
          <MessageSquareText />
          <div className="alert-content">
            <strong>Lý do từ chối:</strong> {app.rejectionReason}
          </div>
        </div>
      )}

      <div className="layout-sidebar">
        <div className="stack">
          <CvPanel app={app} cvFile={cvFile} cvError={cvError} />

          <section className="card" aria-labelledby="candidate-info-title">
            <h2 id="candidate-info-title" className="card-section-title">
              <UserRound />
              Thông tin ứng viên
            </h2>
            <dl className="info-list info-list-left">
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${candidate.email}`} className="inline-link">
                  {candidate.email}
                </a>
              </dd>
              <dt>Điện thoại</dt>
              <dd>{candidate.phone ? <a href={`tel:${candidate.phone}`}>{candidate.phone}</a> : '—'}</dd>
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
            {candidate.summary && <p className="candidate-summary pre-line">{candidate.summary}</p>}
          </section>

          <section className="card" aria-labelledby="cover-letter-title">
            <h2 id="cover-letter-title" className="card-section-title">
              <Mail />
              Thư giới thiệu
            </h2>
            {app.coverLetter ? (
              <p className="pre-line">{app.coverLetter}</p>
            ) : (
              <p className="text-muted">Ứng viên không gửi thư giới thiệu.</p>
            )}
          </section>
        </div>

        <aside className="stack" aria-label="Đánh giá và lịch sử hồ sơ">
          <section className="card" aria-labelledby="rating-title">
            <h2 id="rating-title" className="card-section-title">
              <Star />
              Đánh giá của bạn
            </h2>
            <RatingStars value={app.rating} onChange={rate} disabled={busy} />
            <p className="field-hint rating-hint">
              {app.rating
                ? `${app.rating}/5 sao. Bấm lại sao đang chọn để bỏ đánh giá.`
                : 'Chưa đánh giá. Bấm vào số sao để chấm hồ sơ.'}
            </p>
          </section>

          <section className="card" aria-labelledby="history-title">
            <h2 id="history-title" className="card-section-title">
              <Clock />
              Lịch sử xử lý
            </h2>
            <ol className="history">
              {[...app.history].reverse().map((h) => (
                <li key={h.id} className="history-item">
                  <div className="history-head">
                    <StatusBadge status={h.toStatus} />
                    <time className="text-muted small tabular-nums" dateTime={h.createdAt}>
                      {formatDateTime(h.createdAt)}
                    </time>
                  </div>
                  <p className="text-muted small">
                    {h.fromStatus
                      ? `${h.changedBy ?? 'Hệ thống'} chuyển từ "${APPLICATION_STATUS[h.fromStatus]?.label}"`
                      : 'Ứng viên nộp hồ sơ'}
                  </p>
                  {h.note && <p className="history-note pre-line">{h.note}</p>}
                </li>
              ))}
            </ol>
          </section>

          {FEATURES.ai && <AiReviewCard aiReview={aiReview} screening={screening} onScreen={handleScreen} />}
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
