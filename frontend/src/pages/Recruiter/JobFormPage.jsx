import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import catalogApi from '@/api/catalogApi'
import jobApi from '@/api/jobApi'
import { JobStatusBadge } from '@/components/common/Badge'
import Loading from '@/components/common/Loading'
import { useLocations } from '@/hooks/useCatalog'
import useFetch from '@/hooks/useFetch'
import { FEATURES, JOB_LEVELS, JOB_TYPES, WORK_MODES } from '@/utils/constants'
import { getErrorMessage } from '@/utils/formatters'
import { splitLines } from '@/utils/text'

const inDays = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)

const EMPTY_FORM = {
  title: '',
  locationId: '',
  address: '',
  type: 'full_time',
  workMode: 'onsite',
  level: 'junior',
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

function SkillInput({ value, onChange }) {
  const [text, setText] = useState('')
  const [suggestions, setSuggestions] = useState([])

  // Gợi ý từ danh mục kỹ năng chuẩn hóa (backend gom "ReactJS", "React.js" về "React")
  useEffect(() => {
    const keyword = text.trim()
    if (!keyword) return undefined
    const timer = setTimeout(() => {
      catalogApi
        .searchSkills(keyword)
        .then((items) => setSuggestions(items.map((s) => s.name)))
        .catch(() => setSuggestions([]))
    }, 250)
    return () => clearTimeout(timer)
  }, [text])

  const add = () => {
    const skills = text
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !value.some((v) => v.toLowerCase() === s.toLowerCase()))
    if (skills.length) onChange([...value, ...skills])
    setText('')
  }

  return (
    <div className="skill-input">
      <div className="tags">
        {value.map((s) => (
          <span key={s} className="tag">
            {s}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== s))} aria-label={`Xóa ${s}`}>
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        className="input"
        list="skill-suggestions"
        placeholder="Nhập kỹ năng rồi nhấn Enter (VD: React, Python)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add()
          }
        }}
        onBlur={add}
      />
      <datalist id="skill-suggestions">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  )
}

function JobForm({ initial, job }) {
  const navigate = useNavigate()
  const locations = useLocations()
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const submit = async (publish) => {
    const salaryMin = form.salaryMin === '' ? null : Number(form.salaryMin)
    const salaryMax = form.salaryMax === '' ? null : Number(form.salaryMax)
    if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
      return setError('Mức lương tối thiểu không được lớn hơn tối đa.')
    }
    if (publish && !form.skills.length) {
      return setError(
        FEATURES.ai
          ? 'Vui lòng nhập ít nhất một kỹ năng yêu cầu (AI dùng để so khớp CV).'
          : 'Vui lòng nhập ít nhất một kỹ năng yêu cầu trước khi đăng tin.',
      )
    }
    const data = { ...form, requirements: splitLines(form.requirements), benefits: splitLines(form.benefits) }

    setSaving(true)
    setError('')
    try {
      if (!job) {
        await jobApi.create(data, { publish })
      } else {
        await jobApi.update(job.id, data)
        if (publish) await jobApi.changeStatus(job.id, 'publish')
      }
      navigate('/recruiter/jobs')
    } catch (err) {
      setError(getErrorMessage(err))
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
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="title">Tiêu đề công việc *</label>
        <input
          id="title"
          className="input"
          required
          maxLength={255}
          placeholder="VD: Frontend Developer (ReactJS)"
          value={form.title}
          onChange={set('title')}
        />
      </div>

      <div className="form-row form-row-3">
        <div className="form-group">
          <label htmlFor="type">Hình thức</label>
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
          <label htmlFor="level">Cấp bậc</label>
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
          <label htmlFor="locationId">Tỉnh/thành phố *</label>
          <select id="locationId" className="input" required value={form.locationId} onChange={set('locationId')}>
            <option value="">Chọn địa điểm</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="headcount">Số lượng tuyển</label>
          <input id="headcount" type="number" min="1" max="1000" className="input" value={form.headcount} onChange={set('headcount')} />
        </div>
        <div className="form-group">
          <label htmlFor="minYearsExperience">Kinh nghiệm tối thiểu (năm)</label>
          <input
            id="minYearsExperience"
            type="number"
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
        <input id="address" className="input" maxLength={255} value={form.address} onChange={set('address')} />
      </div>

      <div className="form-row form-row-3">
        <div className="form-group">
          <label htmlFor="salaryMin">Lương tối thiểu (triệu)</label>
          <input id="salaryMin" type="number" min="0" step="0.5" className="input" value={form.salaryMin} onChange={set('salaryMin')} />
        </div>
        <div className="form-group">
          <label htmlFor="salaryMax">Lương tối đa (triệu)</label>
          <input id="salaryMax" type="number" min="0" step="0.5" className="input" value={form.salaryMax} onChange={set('salaryMax')} />
        </div>
        <div className="form-group">
          <label htmlFor="deadline">Hạn nộp hồ sơ *</label>
          <input id="deadline" type="date" className="input" required value={form.deadline} onChange={set('deadline')} />
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
        <label>Kỹ năng yêu cầu *</label>
        <SkillInput value={form.skills} onChange={(skills) => setForm({ ...form, skills })} />
        <small className="text-muted">
          {FEATURES.ai
            ? 'AI dùng danh sách kỹ năng này để chấm điểm và xếp hạng hồ sơ ứng viên.'
            : 'Kỹ năng được chuẩn hóa theo danh mục chung để tìm kiếm và so khớp hồ sơ chính xác.'}
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="description">Mô tả công việc *</label>
        <textarea id="description" className="input" rows={4} required value={form.description} onChange={set('description')} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="requirements">Yêu cầu ứng viên * (mỗi dòng một ý)</label>
          <textarea id="requirements" className="input" rows={5} required value={form.requirements} onChange={set('requirements')} />
        </div>
        <div className="form-group">
          <label htmlFor="benefits">Quyền lợi (mỗi dòng một ý)</label>
          <textarea id="benefits" className="input" rows={5} value={form.benefits} onChange={set('benefits')} />
        </div>
      </div>

      <div className="actions form-footer">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          Hủy
        </button>
        {!job && (
          <button className="btn btn-outline" value="draft" disabled={saving}>
            Lưu nháp
          </button>
        )}
        {job?.status === 'draft' && (
          <button type="button" className="btn btn-outline" disabled={saving} onClick={() => submit(true)}>
            Lưu & đăng tin
          </button>
        )}
        <button className="btn btn-primary" value="submit" disabled={saving}>
          {saving ? 'Đang lưu...' : job ? 'Lưu thay đổi' : 'Đăng tin'}
        </button>
      </div>
    </form>
  )
}

export default function JobFormPage() {
  const { id } = useParams()
  const { data: job, loading, error } = useFetch(() => (id ? jobApi.getMineById(id) : Promise.resolve(null)), [id])

  return (
    <div className="narrow">
      <div className="page-header">
        <div>
          <h1>{id ? 'Chỉnh sửa tin tuyển dụng' : 'Đăng tin tuyển dụng mới'}</h1>
          {job && (
            <p className="text-muted">
              Trạng thái: <JobStatusBadge status={job.status} /> · Đổi trạng thái tại{' '}
              <Link to="/recruiter/jobs">danh sách tin</Link>
            </p>
          )}
        </div>
      </div>
      {loading && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}
      {!loading && !error && (
        <JobForm key={id ?? 'new'} job={job} initial={job ? toForm(job) : { ...EMPTY_FORM, deadline: inDays(30) }} />
      )}
    </div>
  )
}
