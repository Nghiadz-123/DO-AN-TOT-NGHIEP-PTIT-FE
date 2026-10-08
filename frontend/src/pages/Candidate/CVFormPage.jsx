import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import cvApi from '@/api/cvApi'
import Badge from '@/components/common/Badge'
import FileDropzone from '@/components/common/FileDropzone'
import Loading from '@/components/common/Loading'
import SkillInput from '@/components/common/SkillInput'
import useAuth from '@/hooks/useAuth'
import { useLocations } from '@/hooks/useCatalog'
import useFetch from '@/hooks/useFetch'
import { CV_ACCEPT, CV_MAX_SIZE, EDUCATION_LEVELS, FEATURES, JOB_LEVELS, JOB_TYPES, WORK_MODES } from '@/utils/constants'
import { fileExtension, fileTitle, validateCvFile } from '@/utils/file'
import { formatDate, formatFileSize, getErrorMessage } from '@/utils/formatters'

const EMPTY_FORM = {
  title: '',
  desiredPosition: '',
  type: 'full_time',
  workMode: 'onsite',
  level: 'fresher',
  locationId: '',
  yearsOfExperience: 0,
  educationLevel: 'bachelor',
  salaryMin: '',
  salaryMax: '',
  isSalaryNegotiable: false,
  skills: [],
  summary: '',
  isDefault: false,
}

const toForm = (cv) => ({
  ...EMPTY_FORM,
  title: cv.title,
  desiredPosition: cv.desiredPosition ?? '',
  type: cv.type || 'full_time',
  workMode: cv.workMode || 'onsite',
  level: cv.level || 'fresher',
  locationId: cv.locationId ?? '',
  yearsOfExperience: cv.yearsOfExperience ?? 0,
  educationLevel: cv.educationLevel ?? '',
  salaryMin: cv.salaryMin ?? '',
  salaryMax: cv.salaryMax ?? '',
  isSalaryNegotiable: Boolean(cv.isSalaryNegotiable),
  skills: cv.skills ?? [],
  summary: cv.summary ?? '',
  isDefault: Boolean(cv.isDefault),
})

// CV mới: điền sẵn từ hồ sơ cá nhân. locationId = null nghĩa là chưa chọn -> lấy theo nơi làm việc mong muốn
const newForm = (user) => ({ ...EMPTY_FORM, desiredPosition: user.title ?? '', summary: user.about ?? '', locationId: null })

// Chỉ cho chuyển hướng trong ứng dụng (tránh open redirect)
const safeRedirect = (value) => (value?.startsWith('/') && !value.startsWith('//') ? value : '/cv')

const FILE_TONES = { pdf: 'danger', doc: 'primary', docx: 'primary' }

function FileCard({ name, size, note, action }) {
  const ext = fileExtension(name)
  return (
    <div className="file-card">
      <span className={`file-card-icon badge-${FILE_TONES[ext] ?? 'neutral'}`}>{ext.toUpperCase() || 'FILE'}</span>
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
  const done = percent >= 100
  return (
    <div className="upload-progress" role="status">
      <div className="progress">
        <div className="progress-bar progress-bar-primary" style={{ width: `${percent}%` }} />
      </div>
      <small className="text-muted">
        {!done ? `Đang tải file lên... ${percent}%` : FEATURES.ai ? 'Đang đọc và bóc tách nội dung CV...' : 'Đang lưu CV...'}
      </small>
    </div>
  )
}

function CVForm({ initial, cv }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const locations = useLocations()
  const [form, setForm] = useState(initial)
  const [file, setFile] = useState(null)
  const [replacing, setReplacing] = useState(false)
  const [fileError, setFileError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(null)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const locationId = form.locationId ?? String(locations.find((l) => l.name === user.location)?.id ?? '')
  const canReplaceFile = !cv || cv.applicationCount === 0

  const showError = (message) => {
    setError(message)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pickFile = (picked) => {
    const invalid = validateCvFile(picked)
    if (invalid) return setFileError(invalid)
    setFileError('')
    setFile(picked)
    // Gợi ý tên CV theo tên file nếu chưa nhập
    if (!form.title.trim()) setForm({ ...form, title: fileTitle(picked.name) })
  }

  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/cv'))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!cv && !file) return showError('Vui lòng chọn file CV để tải lên.')
    const salaryMin = form.salaryMin === '' ? null : Number(form.salaryMin)
    const salaryMax = form.salaryMax === '' ? null : Number(form.salaryMax)
    if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
      return showError('Mức lương mong muốn tối thiểu không được lớn hơn tối đa.')
    }
    if (!form.skills.length) {
      return showError(
        FEATURES.ai
          ? 'Vui lòng nhập ít nhất một kỹ năng (AI dùng để gợi ý việc làm phù hợp).'
          : 'Vui lòng nhập ít nhất một kỹ năng để nhà tuyển dụng đánh giá hồ sơ.',
      )
    }
    const data = { ...form, locationId }

    setSaving(true)
    setError('')
    setProgress(file ? 0 : null)
    try {
      const options = { file, onProgress: setProgress }
      const saved = cv ? await cvApi.update(cv.id, data, options) : await cvApi.create(data, options)
      navigate(safeRedirect(searchParams.get('redirect')), {
        state: { message: cv ? `Đã lưu thay đổi CV "${saved.title}".` : `Đã tải lên CV "${saved.title}".` },
      })
    } catch (err) {
      showError(getErrorMessage(err))
      setSaving(false)
      setProgress(null)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label>File CV *</label>
        {file ? (
          <FileCard
            name={file.name}
            size={file.size}
            note={cv ? 'Sẽ thay cho file hiện tại' : 'Sẵn sàng tải lên'}
            action={
              <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={() => setFile(null)}>
                Chọn file khác
              </button>
            }
          />
        ) : cv && !replacing ? (
          <>
            <FileCard
              name={cv.fileName}
              size={cv.fileSize}
              note={`Tải lên ngày ${formatDate(cv.uploadedAt)}`}
              action={
                canReplaceFile && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReplacing(true)}>
                    Thay file
                  </button>
                )
              }
            />
            {!canReplaceFile && (
              <small className="text-muted">
                CV đã dùng cho {cv.applicationCount} đơn ứng tuyển nên không thể thay file. Nếu nội dung thay đổi nhiều,
                hãy <Link to="/cv/new">tải lên CV mới</Link>.
              </small>
            )}
          </>
        ) : (
          <>
            <FileDropzone
              accept={CV_ACCEPT}
              onFile={pickFile}
              disabled={saving}
              hint={`PDF, DOC, DOCX · tối đa ${CV_MAX_SIZE / 1024 / 1024}MB`}
            />
            {cv && (
              <button type="button" className="btn btn-ghost btn-sm align-start" onClick={() => setReplacing(false)}>
                Giữ file hiện tại
              </button>
            )}
          </>
        )}
        {fileError && <small className="text-danger">{fileError}</small>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="title">Tên CV *</label>
          <input
            id="title"
            className="input"
            required
            maxLength={255}
            placeholder="VD: CV Frontend Developer 2026"
            value={form.title}
            onChange={set('title')}
          />
        </div>
        <div className="form-group">
          <label htmlFor="desiredPosition">Vị trí mong muốn *</label>
          <input
            id="desiredPosition"
            className="input"
            required
            maxLength={255}
            placeholder="VD: Frontend Developer (ReactJS)"
            value={form.desiredPosition}
            onChange={set('desiredPosition')}
          />
        </div>
      </div>

      <div className="form-row form-row-3">
        <div className="form-group">
          <label htmlFor="type">Hình thức mong muốn</label>
          <select id="type" className="input" value={form.type} onChange={set('type')}>
            {JOB_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="workMode">Chế độ làm việc</label>
          <select id="workMode" className="input" value={form.workMode} onChange={set('workMode')}>
            {WORK_MODES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="level">Cấp bậc hiện tại</label>
          <select id="level" className="input" value={form.level} onChange={set('level')}>
            {JOB_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row form-row-3">
        <div className="form-group">
          <label htmlFor="locationId">Nơi làm việc mong muốn *</label>
          <select
            id="locationId"
            className="input"
            required
            value={locationId}
            onChange={(e) => setForm({ ...form, locationId: e.target.value })}
          >
            <option value="">Chọn địa điểm</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="yearsOfExperience">Số năm kinh nghiệm</label>
          <input
            id="yearsOfExperience"
            type="number"
            min="0"
            max="50"
            step="0.5"
            className="input"
            value={form.yearsOfExperience}
            onChange={set('yearsOfExperience')}
          />
        </div>
        <div className="form-group">
          <label htmlFor="educationLevel">Trình độ học vấn</label>
          <select id="educationLevel" className="input" value={form.educationLevel} onChange={set('educationLevel')}>
            <option value="">Chọn trình độ</option>
            {EDUCATION_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="salaryMin">Lương mong muốn tối thiểu (triệu)</label>
          <input id="salaryMin" type="number" min="0" step="0.5" className="input" value={form.salaryMin} onChange={set('salaryMin')} />
        </div>
        <div className="form-group">
          <label htmlFor="salaryMax">Lương mong muốn tối đa (triệu)</label>
          <input id="salaryMax" type="number" min="0" step="0.5" className="input" value={form.salaryMax} onChange={set('salaryMax')} />
        </div>
      </div>
      <div className="form-group">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.isSalaryNegotiable}
            onChange={(e) => setForm({ ...form, isSalaryNegotiable: e.target.checked })}
          />
          Lương có thể thỏa thuận
        </label>
      </div>

      <div className="form-group">
        <label>Kỹ năng *</label>
        <SkillInput value={form.skills} onChange={(skills) => setForm({ ...form, skills })} />
        <small className="text-muted">
          {FEATURES.ai
            ? 'AI dùng danh sách kỹ năng này để gợi ý việc làm và chấm điểm mức độ phù hợp với từng tin tuyển dụng.'
            : 'Kỹ năng được chuẩn hóa theo danh mục chung, giúp so khớp hồ sơ với yêu cầu của tin tuyển dụng.'}
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="summary">Giới thiệu bản thân & mục tiêu nghề nghiệp</label>
        <textarea
          id="summary"
          className="input"
          rows={4}
          maxLength={2000}
          placeholder="VD: 1,5 năm kinh nghiệm ReactJS, mong muốn phát triển lên Middle Frontend trong 2 năm tới."
          value={form.summary}
          onChange={set('summary')}
        />
      </div>

      <div className="form-group">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.isDefault}
            disabled={cv?.isDefault}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          />
          Đặt làm CV chính
          {cv?.isDefault && <Badge tone="primary">Đang là CV chính</Badge>}
        </label>
        <small className="text-muted">CV chính được chọn sẵn mỗi khi bạn nộp hồ sơ ứng tuyển.</small>
      </div>

      {saving && progress !== null && <UploadProgress percent={progress} />}

      <div className="actions form-footer">
        <button type="button" className="btn btn-ghost" disabled={saving} onClick={goBack}>
          Hủy
        </button>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? (file ? 'Đang tải lên...' : 'Đang lưu...') : cv ? 'Lưu thay đổi' : 'Tải CV lên'}
        </button>
      </div>
    </form>
  )
}

export default function CVFormPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data: cv, loading, error } = useFetch(() => (id ? cvApi.getById(id) : Promise.resolve(null)), [id])

  return (
    <div className="narrow">
      <div className="page-header">
        <div>
          <h1>{id ? 'Chỉnh sửa CV' : 'Tải CV mới'}</h1>
          <p className="text-muted">
            {cv ? (
              <>
                Cập nhật lần cuối {formatDate(cv.updatedAt)} · Quản lý tại <Link to="/cv">danh sách CV</Link>
              </>
            ) : (
              'Tải file CV và khai báo mong muốn công việc để nhà tuyển dụng đánh giá hồ sơ chính xác hơn.'
            )}
          </p>
        </div>
      </div>
      {loading && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}
      {!loading && !error && <CVForm key={id ?? 'new'} cv={cv} initial={cv ? toForm(cv) : newForm(user)} />}
    </div>
  )
}
