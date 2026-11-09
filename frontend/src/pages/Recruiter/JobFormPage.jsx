import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, ListChecks, MapPin, Send, TriangleAlert, Wallet } from 'lucide-react'
import jobApi from '@/api/jobApi'
import { JobStatusBadge } from '@/components/common/Badge'
import ErrorState from '@/components/common/ErrorState'
import { SkeletonLines } from '@/components/common/Skeleton'
import SkillInput from '@/components/common/SkillInput'
import { useIndustries, useLocations } from '@/hooks/useCatalog'
import useFetch from '@/hooks/useFetch'
import { FEATURES, JOB_LEVELS, JOB_TYPES, WORK_MODES } from '@/utils/constants'
import { getErrorMessage } from '@/utils/formatters'
import { splitLines } from '@/utils/text'

const inDays = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)

const EMPTY_FORM = {
  title: '',
  industryId: '',
  locationId: '',
  address: '',
  type: 'full_time',
  workMode: 'onsite',
  level: 'staff',
  minYearsExperience: 0,
  headcount: 1,
  salaryMin: '',
  salaryMax: '',
  isSalaryNegotiable: false,
  deadline: '',
  skills: [],
  description: '',
  requirements: '',
  benefits: '',
}

const toForm = (job) => ({
  ...EMPTY_FORM,
  title: job.title,
  industryId: job.industryId ?? '',
  locationId: job.locationId ?? '',
  address: job.address ?? '',
  type: job.type,
  workMode: job.workMode ?? 'onsite',
  level: job.level,
  minYearsExperience: job.minYearsExperience ?? 0,
  headcount: job.headcount ?? 1,
  salaryMin: job.salaryMin ?? '',
  salaryMax: job.salaryMax ?? '',
  isSalaryNegotiable: Boolean(job.isSalaryNegotiable),
  deadline: job.deadline ?? '',
  skills: job.skills,
  description: job.description,
  requirements: job.requirements.join('\n'),
  benefits: (job.benefits ?? []).join('\n'),
})

// Lỗi gắn với ô nhập: hiện ngay dưới ô và đưa con trỏ về đó
const FIELD_INPUT = { salary: 'salaryMin', skills: 'skills' }

function Required() {
  return (
    <span className="required-mark" aria-hidden="true">
      *
    </span>
  )
}

function Select({ id, label, value, onChange, options, placeholder, required }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>
        {label}
        {required && <Required />}
      </label>
      <select id={id} className="input" required={required} value={value} onChange={onChange}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function FieldError({ id, error, field }) {
  if (error?.field !== field) return null
  return (
    <p id={id} className="field-error" role="alert">
      <TriangleAlert />
      {error.text}
    </p>
  )
}

function JobForm({ initial, job }) {
  const navigate = useNavigate()
  const locations = useLocations()
  const industries = useIndustries()
  const [form, setForm] = useState(initial)
  const [error, setError] = useState(null) // { text, field? }: field = 'salary' | 'skills'
  const [saving, setSaving] = useState(false)
  const alertRef = useRef(null)

  useEffect(() => {
    if (!error) return
    if (error.field) document.getElementById(FIELD_INPUT[error.field])?.focus()
    else alertRef.current?.focus()
  }, [error])

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const submit = async (publish) => {
    const salaryMin = form.salaryMin === '' ? null : Number(form.salaryMin)
    const salaryMax = form.salaryMax === '' ? null : Number(form.salaryMax)
    if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
      return setError({ field: 'salary', text: 'Mức lương tối thiểu không được lớn hơn tối đa.' })
    }
    if (publish && !form.skills.length) {
      return setError({
        field: 'skills',
        text: FEATURES.ai
          ? 'Vui lòng nhập ít nhất một kỹ năng yêu cầu (AI dùng để so khớp CV).'
          : 'Vui lòng nhập ít nhất một kỹ năng yêu cầu trước khi đăng tin.',
      })
    }
    const data = { ...form, requirements: splitLines(form.requirements), benefits: splitLines(form.benefits) }

    setSaving(true)
    setError(null)
    try {
      if (!job) {
        await jobApi.create(data, { publish })
      } else {
        await jobApi.update(job.id, data)
        if (publish) await jobApi.changeStatus(job.id, 'publish')
      }
      navigate('/recruiter/jobs')
    } catch (err) {
      setError({ text: getErrorMessage(err) })
      setSaving(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Nút submit chính: tạo mới -> đăng ngay; chỉnh sửa -> chỉ lưu
    submit(!job && e.nativeEvent.submitter?.value !== 'draft')
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      {error && !error.field && (
        <div ref={alertRef} className="alert alert-error form-alert" role="alert" tabIndex={-1}>
          <TriangleAlert />
          <div className="alert-content">{error.text}</div>
        </div>
      )}

      <fieldset className="form-section">
        <legend>
          <FileText />
          Thông tin chung
        </legend>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="title">
              Tiêu đề công việc
              <Required />
            </label>
            <input
              id="title"
              className="input"
              required
              maxLength={255}
              placeholder="VD: Nhân viên kinh doanh, Kế toán tổng hợp, Điều dưỡng..."
              value={form.title}
              onChange={set('title')}
            />
          </div>
          <Select
            id="industryId"
            label="Ngành nghề"
            required
            placeholder="Chọn ngành nghề"
            value={form.industryId}
            onChange={set('industryId')}
            options={industries.map((i) => ({ value: i.id, label: i.name }))}
          />
        </div>
        <div className="form-row form-row-3">
          <Select id="type" label="Hình thức" value={form.type} onChange={set('type')} options={JOB_TYPES} />
          <Select id="workMode" label="Chế độ làm việc" value={form.workMode} onChange={set('workMode')} options={WORK_MODES} />
          <Select id="level" label="Cấp bậc" value={form.level} onChange={set('level')} options={JOB_LEVELS} />
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>
          <MapPin />
          Địa điểm và số lượng
        </legend>
        <div className="form-row form-row-3">
          <Select
            id="locationId"
            label="Tỉnh/thành phố"
            required
            placeholder="Chọn địa điểm"
            value={form.locationId}
            onChange={set('locationId')}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
          />
          <div className="form-group">
            <label htmlFor="headcount">Số lượng tuyển</label>
            <input
              id="headcount"
              type="number"
              inputMode="numeric"
              min="1"
              max="1000"
              className="input"
              value={form.headcount}
              onChange={set('headcount')}
            />
          </div>
          <div className="form-group">
            <label htmlFor="minYearsExperience">Kinh nghiệm tối thiểu (năm)</label>
            <input
              id="minYearsExperience"
              type="number"
              inputMode="decimal"
              min="0"
              max="50"
              step="0.5"
              className="input"
              value={form.minYearsExperience}
              onChange={set('minYearsExperience')}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="address">Địa chỉ làm việc</label>
          <input
            id="address"
            className="input"
            maxLength={255}
            placeholder="Số nhà, đường, quận / huyện"
            value={form.address}
            onChange={set('address')}
          />
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>
          <Wallet />
          Lương và hạn nộp
        </legend>
        <div className="form-row form-row-3">
          <div className="form-group">
            <label htmlFor="salaryMin">Lương tối thiểu (triệu)</label>
            <input
              id="salaryMin"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              className="input"
              aria-invalid={error?.field === 'salary' || undefined}
              aria-describedby={error?.field === 'salary' ? 'salary-error' : undefined}
              value={form.salaryMin}
              onChange={set('salaryMin')}
            />
          </div>
          <div className="form-group">
            <label htmlFor="salaryMax">Lương tối đa (triệu)</label>
            <input
              id="salaryMax"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              className="input"
              aria-invalid={error?.field === 'salary' || undefined}
              aria-describedby={error?.field === 'salary' ? 'salary-error' : undefined}
              value={form.salaryMax}
              onChange={set('salaryMax')}
            />
          </div>
          <div className="form-group">
            <label htmlFor="deadline">
              Hạn nộp hồ sơ
              <Required />
            </label>
            <input id="deadline" type="date" className="input" required value={form.deadline} onChange={set('deadline')} />
          </div>
        </div>
        <FieldError id="salary-error" error={error} field="salary" />
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.isSalaryNegotiable}
            onChange={(e) => setForm({ ...form, isSalaryNegotiable: e.target.checked })}
          />
          Lương có thể thỏa thuận
        </label>
      </fieldset>

      <fieldset className="form-section">
        <legend>
          <ListChecks />
          Kỹ năng yêu cầu
        </legend>
        <div className="form-group">
          <label htmlFor="skills">
            Kỹ năng
            <Required />
          </label>
          <SkillInput
            id="skills"
            aria-invalid={error?.field === 'skills' || undefined}
            aria-describedby={error?.field === 'skills' ? 'skills-error skills-hint' : 'skills-hint'}
            value={form.skills}
            onChange={(skills) => setForm({ ...form, skills })}
          />
          <FieldError id="skills-error" error={error} field="skills" />
          <small id="skills-hint" className="field-hint">
            {FEATURES.ai
              ? 'AI dùng danh sách kỹ năng này để chấm điểm và xếp hạng hồ sơ ứng viên.'
              : 'Kỹ năng được chuẩn hóa theo danh mục chung để tìm kiếm và so khớp hồ sơ chính xác.'}
          </small>
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>
          <FileText />
          Nội dung tin
        </legend>
        <div className="form-group">
          <label htmlFor="description">
            Mô tả công việc
            <Required />
          </label>
          <textarea
            id="description"
            className="input"
            rows={5}
            required
            value={form.description}
            onChange={set('description')}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="requirements">
              Yêu cầu ứng viên
              <Required />
            </label>
            <textarea
              id="requirements"
              className="input"
              rows={6}
              required
              aria-describedby="requirements-hint"
              value={form.requirements}
              onChange={set('requirements')}
            />
            <small id="requirements-hint" className="field-hint">
              Mỗi dòng một ý.
            </small>
          </div>
          <div className="form-group">
            <label htmlFor="benefits">Quyền lợi</label>
            <textarea
              id="benefits"
              className="input"
              rows={6}
              aria-describedby="benefits-hint"
              value={form.benefits}
              onChange={set('benefits')}
            />
            <small id="benefits-hint" className="field-hint">
              Mỗi dòng một ý.
            </small>
          </div>
        </div>
      </fieldset>

      <div className="form-footer">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          Hủy
        </button>
        {!job && (
          <button type="submit" className="btn btn-outline" value="draft" disabled={saving}>
            Lưu nháp
          </button>
        )}
        {job?.status === 'draft' && (
          <button type="button" className="btn btn-outline" disabled={saving} onClick={() => submit(true)}>
            Lưu và đăng tin
          </button>
        )}
        <button type="submit" className="btn btn-primary" value="submit" disabled={saving}>
          {saving ? <span className="spinner" aria-hidden="true" /> : !job && <Send />}
          {saving ? 'Đang lưu...' : job ? 'Lưu thay đổi' : 'Đăng tin'}
        </button>
      </div>
    </form>
  )
}

export default function JobFormPage() {
  const { id } = useParams()
  const { data: job, loading, error, reload } = useFetch(
    () => (id ? jobApi.getMineById(id) : Promise.resolve(null)),
    [id],
  )

  return (
    <div className="narrow stack">
      <Link to="/recruiter/jobs" className="back-link">
        <ArrowLeft />
        Tin tuyển dụng
      </Link>
      <div className="page-header">
        <div>
          <h1>{id ? 'Chỉnh sửa tin tuyển dụng' : 'Đăng tin tuyển dụng mới'}</h1>
          {job ? (
            <p className="text-muted page-header-meta">
              Trạng thái: <JobStatusBadge status={job.status} /> · Đổi trạng thái ở{' '}
              <Link to="/recruiter/jobs">danh sách tin</Link>
            </p>
          ) : (
            !id && (
              <p className="text-muted">
                Điền thông tin vị trí cần tuyển. Trường có dấu <span className="required-mark">*</span> là bắt buộc.
              </p>
            )
          )}
        </div>
      </div>
      {loading && (
        <div className="card">
          <SkeletonLines lines={6} label="Đang tải tin tuyển dụng" />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && (
        <JobForm key={id ?? 'new'} job={job} initial={job ? toForm(job) : { ...EMPTY_FORM, deadline: inDays(30) }} />
      )}
    </div>
  )
}
