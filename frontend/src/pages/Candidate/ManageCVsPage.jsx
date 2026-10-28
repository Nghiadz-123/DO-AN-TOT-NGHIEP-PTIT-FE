import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  CircleCheck,
  Download,
  Ellipsis,
  Eye,
  FilePen,
  FileText,
  FileUp,
  Gauge,
  Pencil,
  Star,
  Trash,
  TriangleAlert,
  X,
} from 'lucide-react'
import aiApi from '@/api/aiApi'
import candidateApi from '@/api/candidateApi'
import cvApi from '@/api/cvApi'
import Badge from '@/components/common/Badge'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DropdownMenu from '@/components/common/DropdownMenu'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import ScoreCircle from '@/components/common/ScoreCircle'
import { SkeletonCards } from '@/components/common/Skeleton'
import useFetch from '@/hooks/useFetch'
import { CV_PARSE_STATUS, FEATURES } from '@/utils/constants'
import { fileExtension } from '@/utils/file'
import { formatDate, formatFileSize, getErrorMessage, saveBlob } from '@/utils/formatters'

const VIEWABLE_TYPES = ['application/pdf']

const scrollBehavior = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')

export default function ManageCVsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [flash] = useState(location.state?.message ?? '')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [preview, setPreview] = useState(null) // { cv, url }
  const [savingPublic, setSavingPublic] = useState(false)
  const [deleting, setDeleting] = useState(null) // CV đang chờ xác nhận xóa
  const previewRef = useRef(null)

  const { data: cvs, loading, error, reload } = useFetch(() => cvApi.getMine(), [])
  const { data: profile, setData: setProfile } = useFetch(() => candidateApi.getProfile(), [])
  const isPublic = Boolean(profile?.isPublic)
  const defaultCv = cvs?.find((cv) => cv.isDefault)
  // Điểm AI đã chấm của từng CV (chỉ đọc kết quả đã lưu, không gọi AI); lỗi thì coi như chưa chấm
  const { data: analyses } = useFetch(
    () => (FEATURES.candidateAi ? aiApi.getAnalyses().catch(() => []) : Promise.resolve([])),
    [],
  )
  const scores = Object.fromEntries((analyses ?? []).map((a) => [a.cvId, a.score?.total]))

  // Thông báo sau khi lưu chỉ hiện một lần: xóa state để tải lại trang không hiện lại
  useEffect(() => {
    if (location.state?.message) navigate(location.pathname, { replace: true })
  }, [location, navigate])

  useEffect(() => () => preview && URL.revokeObjectURL(preview.url), [preview])
  useEffect(() => {
    if (preview) previewRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
  }, [preview])

  const run = async (cv, task) => {
    setBusyId(cv.id)
    setActionError('')
    try {
      await task()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const openFile = (cv, { download = false } = {}) =>
    run(cv, async () => {
      const viewable = !download && VIEWABLE_TYPES.includes(cv.mimeType)
      const { blob, fileName } = await (viewable ? cvApi.view(cv.id) : cvApi.download(cv.id))
      if (!viewable) return saveBlob(blob, fileName)
      setPreview({ cv, url: URL.createObjectURL(blob) })
    })

  const setDefault = (cv) =>
    run(cv, async () => {
      await cvApi.setDefault(cv.id)
      reload()
    })

  const togglePublic = async (value) => {
    setSavingPublic(true)
    setActionError('')
    try {
      setProfile(await candidateApi.setPublic(value))
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setSavingPublic(false)
    }
  }

  const confirmDelete = () => {
    const cv = deleting
    setDeleting(null)
    run(cv, async () => {
      await cvApi.remove(cv.id)
      if (preview?.cv.id === cv.id) setPreview(null)
      reload()
    })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>CV của tôi</h1>
          <p className="text-muted">Quản lý các CV dùng để ứng tuyển. CV chính được chọn sẵn mỗi khi bạn nộp hồ sơ.</p>
        </div>
        <div className="actions">
          <Link to="/create-cv" className="btn btn-outline">
            <FilePen />
            Tạo CV
          </Link>
          <Link to="/cv/new" className="btn btn-primary">
            <FileUp />
            Tải CV mới
          </Link>
        </div>
      </div>

      {flash && (
        <div className="alert alert-success" role="status">
          <CircleCheck />
          <div className="alert-content">{flash}</div>
        </div>
      )}
      {actionError && (
        <div className="alert alert-error" role="alert">
          <TriangleAlert />
          <div className="alert-content">{actionError}</div>
        </div>
      )}
      {loading && !cvs && <SkeletonCards count={2} className="cv-list" label="Đang tải danh sách CV" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {profile && defaultCv && (
        <section className="card public-cv-panel">
          <div className="public-cv-text">
            <h2 id="public-cv-title">Công khai CV cho nhà tuyển dụng</h2>
            <p className="text-muted">
              {isPublic
                ? `Nhà tuyển dụng đang tìm thấy và xem được CV chính "${defaultCv.title}" của bạn, có thể gửi thư mời ứng tuyển. Muốn công khai CV khác, hãy đặt CV đó làm CV chính.`
                : 'Bật để nhà tuyển dụng tìm thấy CV chính của bạn ở mục Tìm ứng viên và gửi thư mời ứng tuyển. Công ty bạn đã ứng tuyển luôn xem được hồ sơ bạn đã nộp.'}
            </p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              role="switch"
              aria-labelledby="public-cv-title"
              checked={isPublic}
              disabled={savingPublic}
              onChange={(e) => togglePublic(e.target.checked)}
            />
            <span className="switch-text">{isPublic ? 'Đang bật' : 'Đang tắt'}</span>
          </label>
        </section>
      )}

      {cvs &&
        (cvs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Bạn chưa có CV nào"
            description="Tải CV lên hoặc tạo CV trực tuyến để ứng tuyển nhanh và để nhà tuyển dụng xem được hồ sơ của bạn."
            action={
              <div className="actions">
                <Link to="/cv/new" className="btn btn-primary">
                  <FileUp />
                  Tải CV đầu tiên
                </Link>
                <Link to="/create-cv" className="btn btn-outline">
                  <FilePen />
                  Tạo CV trực tuyến
                </Link>
              </div>
            }
          />
        ) : (
          <ul className="cv-list" aria-label="Danh sách CV">
            {cvs.map((cv) => {
              const status = CV_PARSE_STATUS[cv.parseStatus]
              const busy = busyId === cv.id
              const ext = fileExtension(cv.fileName)
              const score = scores[cv.id]
              return (
                <li key={cv.id} className={`card cv-card ${busy ? 'row-busy' : ''}`} aria-busy={busy}>
                  <span className={`file-icon file-icon-${ext}`} aria-hidden="true">
                    {ext.toUpperCase() || 'FILE'}
                  </span>
                  <div className="cv-card-main">
                    <div className="cv-title">
                      <Link to={`/cv/${cv.id}/edit`} className="cv-card-name">
                        {cv.title}
                      </Link>
                      {cv.isDefault && (
                        <Badge tone="primary">
                          <Star />
                          CV chính
                        </Badge>
                      )}
                      {cv.isDefault && isPublic && <Badge tone="success">Đang công khai</Badge>}
                    </div>
                    <p className="cv-card-meta">
                      {cv.fileName} · <span className="nowrap">{formatFileSize(cv.fileSize)}</span> · Cập nhật{' '}
                      {formatDate(cv.updatedAt)}
                    </p>
                    <div className="cv-card-status">
                      {status && <Badge tone={status.tone}>{status.label}</Badge>}
                      {cv.applicationCount > 0 ? (
                        <Link to="/my-applications" className="inline-link">
                          Đã dùng cho {cv.applicationCount} đơn
                        </Link>
                      ) : (
                        <span className="text-muted small">Chưa dùng để ứng tuyển</span>
                      )}
                    </div>
                    {cv.parseError && <p className="field-error">{cv.parseError}</p>}
                  </div>
                  {FEATURES.candidateAi && (
                    <Link to={`/cv-analysis?cvId=${cv.id}`} className="cv-card-score">
                      {score != null ? (
                        <ScoreCircle score={score} size={48} showLabel={false} />
                      ) : (
                        <span className="cv-card-score-empty" aria-hidden="true">
                          <Gauge />
                        </span>
                      )}
                      <span>{score != null ? 'Xem điểm AI' : 'Chấm điểm AI'}</span>
                    </Link>
                  )}
                  <div className="cv-card-actions">
                    <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => openFile(cv)}>
                      <Eye />
                      Xem
                    </button>
                    <DropdownMenu
                      label={`Thao tác khác với CV ${cv.title}`}
                      trigger={<Ellipsis />}
                      items={[
                        { label: 'Tải về', icon: Download, onClick: () => openFile(cv, { download: true }), disabled: busy },
                        { label: 'Sửa thông tin', icon: Pencil, to: `/cv/${cv.id}/edit` },
                        ...(cv.isDefault
                          ? []
                          : [{ label: 'Đặt làm CV chính', icon: Star, onClick: () => setDefault(cv), disabled: busy }]),
                        ...(cv.applicationCount === 0
                          ? [
                              { divider: true },
                              { label: 'Xóa CV', icon: Trash, onClick: () => setDeleting(cv), danger: true, disabled: busy },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        ))}

      {preview && (
        <section className="card" ref={previewRef} aria-labelledby="cv-preview-title">
          <div className="cv-panel-head">
            <div>
              <h2 id="cv-preview-title">{preview.cv.title}</h2>
              <p className="text-muted">{preview.cv.fileName}</p>
            </div>
            <div className="actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => openFile(preview.cv, { download: true })}>
                <Download />
                Tải về
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreview(null)}>
                <X />
                Đóng
              </button>
            </div>
          </div>
          <iframe className="cv-viewer" src={preview.url} title={`Xem CV ${preview.cv.title}`} />
        </section>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xóa CV?"
        message={deleting && `CV "${deleting.title}" sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.`}
        confirmLabel="Xóa CV"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
