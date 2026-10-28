import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FileUp, RefreshCw, Save, TriangleAlert } from 'lucide-react'
import cvApi from '@/api/cvApi'
import Badge from '@/components/common/Badge'
import ErrorState from '@/components/common/ErrorState'
import FileDropzone from '@/components/common/FileDropzone'
import { SkeletonLines } from '@/components/common/Skeleton'
import useFetch from '@/hooks/useFetch'
import { CV_ACCEPT, CV_MAX_SIZE, CV_PARSE_STATUS } from '@/utils/constants'
import { fileExtension, fileTitle, validateCvFile } from '@/utils/file'
import { formatDate, formatFileSize, getErrorMessage } from '@/utils/formatters'

// Chỉ cho chuyển hướng trong ứng dụng (tránh open redirect)
const safeRedirect = (value) => (value?.startsWith('/') && !value.startsWith('//') ? value : '/cv')

function FileCard({ name, size, note, action }) {
  const ext = fileExtension(name)
  return (
    <div className="file-card">
      <span className={`file-icon file-icon-${ext}`} aria-hidden="true">
        {ext.toUpperCase() || 'FILE'}
      </span>
      <div className="file-card-info">
        <strong title={name}>{name}</strong>
        <small className="text-muted">
          {formatFileSize(size)} · {note}
        </small>
      </div>
      {action}
    </div>
  )
}

function UploadProgress({ percent }) {
  return (
    <div className="upload-progress" role="status">
      <div
        className="progress"
        role="progressbar"
        aria-label="Tiến độ tải file"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="progress-bar progress-bar-primary" style={{ width: `${percent}%` }} />
      </div>
      <small className="text-muted">
        {percent < 100 ? `Đang tải file lên... ${percent}%` : 'Đang đọc nội dung CV...'}
      </small>
    </div>
  )
}

function ErrorAlert({ children }) {
  return (
    <div className="alert alert-error" role="alert">
      <TriangleAlert />
      <div className="alert-content">{children}</div>
    </div>
  )
}

// Kết quả bóc tách văn bản của backend (không dùng AI): trạng thái, thông tin liên hệ, số từ
function ParseInfo({ cv }) {
  const status = CV_PARSE_STATUS[cv.parseStatus]
  const contact = cv.parsed?.contact
  return (
    <div className="form-group">
      <span className="field-label">Nội dung CV</span>
      <div>{status && <Badge tone={status.tone}>{status.label}</Badge>}</div>
      {cv.parseError && <p className="field-error">{cv.parseError}</p>}
      {contact && (
        <small className="field-hint">
          {[...contact.emails, ...contact.phones].join(' · ') || 'Không tìm thấy email / số điện thoại trong CV'}
          {cv.parsed.stats && ` · ${cv.parsed.stats.words} từ`}
        </small>
      )}
    </div>
  )
}

function UploadForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [fileError, setFileError] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(null)
  const saving = progress !== null

  const pickFile = (picked) => {
    const invalid = validateCvFile(picked)
    if (invalid) return setFileError(invalid)
    setFileError('')
    setFile(picked)
    // Gợi ý tên CV theo tên file nếu chưa nhập
    if (!title.trim()) setTitle(fileTitle(picked.name))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return setError('Vui lòng chọn file CV để tải lên.')
    setError('')
    setProgress(0)
    try {
      const saved = await cvApi.upload(file, { title, isDefault, onProgress: setProgress })
      navigate(safeRedirect(searchParams.get('redirect')), { state: { message: `Đã tải lên CV "${saved.title}".` } })
    } catch (err) {
      setError(getErrorMessage(err))
      setProgress(null)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="form-group" role="group" aria-labelledby="cv-file-label">
        <span className="field-label" id="cv-file-label">
          File CV<span className="required-mark" aria-hidden="true">*</span>
        </span>
        {file ? (
          <FileCard
            name={file.name}
            size={file.size}
            note="Sẵn sàng tải lên"
            action={
              <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={() => setFile(null)}>
                Chọn file khác
              </button>
            }
          />
        ) : (
          <FileDropzone
            accept={CV_ACCEPT}
            onFile={pickFile}
            disabled={saving}
            hint={`PDF, DOCX · tối đa ${CV_MAX_SIZE / 1024 / 1024}MB`}
          />
        )}
        {fileError && (
          <p className="field-error" role="alert">
            <TriangleAlert />
            {fileError}
          </p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="title">Tên CV</label>
        <input
          id="title"
          className="input"
          maxLength={150}
          placeholder="VD: CV Nhân viên kinh doanh 2026"
          aria-describedby="title-hint"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <small id="title-hint" className="field-hint">
          Bỏ trống thì lấy theo tên file.
        </small>
      </div>

      <div className="form-group">
        <label className="checkbox">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          Đặt làm CV chính
        </label>
        <small className="field-hint">
          CV chính được chọn sẵn mỗi khi bạn nộp hồ sơ. CV đầu tiên tự động là CV chính.
        </small>
      </div>

      {saving && <UploadProgress percent={progress} />}

      <div className="form-footer">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={saving}
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/cv'))}
        >
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" aria-hidden="true" /> : <FileUp />}
          {saving ? 'Đang tải lên...' : 'Tải CV lên'}
        </button>
      </div>
    </form>
  )
}

function EditForm({ cv: initial }) {
  const navigate = useNavigate()
  const [cv, setCv] = useState(initial)
  const [title, setTitle] = useState(initial.title)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const run = async (task) => {
    setSaving(true)
    setError('')
    try {
      return await task()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const saved = await run(() => cvApi.rename(cv.id, title))
    if (saved) navigate('/cv', { state: { message: `Đã lưu thay đổi CV "${saved.title}".` } })
  }

  const reparse = () => run(async () => setCv(await cvApi.reparse(cv.id)))

  return (
    <form className="card" onSubmit={handleSubmit}>
      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="form-group">
        <span className="field-label">File CV</span>
        <FileCard name={cv.fileName} size={cv.fileSize} note={`Tải lên ngày ${formatDate(cv.uploadedAt)}`} />
        <small className="field-hint">
          Không thể thay file của CV đã tải lên. Nếu nội dung thay đổi, hãy <Link to="/cv/new">tải lên CV mới</Link>.
        </small>
      </div>

      <ParseInfo cv={cv} />
      {['pending', 'failed'].includes(cv.parseStatus) && (
        <button type="button" className="btn btn-outline btn-sm align-start" disabled={saving} onClick={reparse}>
          <RefreshCw />
          Đọc lại nội dung CV
        </button>
      )}

      <div className="form-group">
        <label htmlFor="title">
          Tên CV<span className="required-mark" aria-hidden="true">*</span>
        </label>
        <input
          id="title"
          className="input"
          required
          maxLength={150}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {cv.isDefault && <Badge tone="primary">Đang là CV chính</Badge>}

      <div className="form-footer">
        <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => navigate('/cv')}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" aria-hidden="true" /> : <Save />}
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  )
}

export default function CVFormPage() {
  const { id } = useParams()
  const { data: cv, loading, error, reload } = useFetch(() => (id ? cvApi.getById(id) : Promise.resolve(null)), [id])

  return (
    <div className="narrow stack">
      <div className="page-header">
        <div>
          <h1>{id ? 'Chỉnh sửa CV' : 'Tải CV mới'}</h1>
          <p className="text-muted">
            {cv ? (
              <>
                Cập nhật lần cuối {formatDate(cv.updatedAt)} · Quản lý tại <Link to="/cv">danh sách CV</Link>
              </>
            ) : (
              <>
                Tải file CV để ứng tuyển. Mong muốn công việc (vị trí, mức lương, nơi làm việc) khai báo tại{' '}
                <Link to="/profile">hồ sơ cá nhân</Link>.
              </>
            )}
          </p>
        </div>
      </div>
      {loading && (
        <div className="card">
          <SkeletonLines lines={4} label="Đang tải CV" />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && (cv ? <EditForm key={cv.id} cv={cv} /> : <UploadForm />)}
    </div>
  )
}
