import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import jobApi from '@/api/jobApi'
import Loading from '@/components/common/Loading'
import useFetch from '@/hooks/useFetch'
import { JOB_LEVELS, JOB_TYPES, LOCATIONS } from '@/utils/constants'
import { getErrorMessage } from '@/utils/formatters'
import { splitLines } from '@/utils/text'

const EMPTY_FORM = {
  title: '',
  location: LOCATIONS[0],
  type: JOB_TYPES[0].value,
  level: 'Junior',
  salaryMin: '',
  salaryMax: '',
  deadline: '',
  skills: [],
  description: '',
  requirements: '',
  benefits: '',
  status: 'open',
}

const toForm = (job) => ({
  ...EMPTY_FORM,
  ...job,
  salaryMin: job.salaryMin ?? '',
  salaryMax: job.salaryMax ?? '',
  requirements: job.requirements.join('\n'),
  benefits: (job.benefits ?? []).join('\n'),
})

function SkillInput({ value, onChange }) {
  const [text, setText] = useState('')

  const add = () => {
    const skills = text
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !value.includes(s))
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
    </div>
  )
}

function JobForm({ initial, jobId }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const salaryMin = form.salaryMin === '' ? null : Number(form.salaryMin)
    const salaryMax = form.salaryMax === '' ? null : Number(form.salaryMax)
    if (!form.skills.length) return setError('Vui lòng nhập ít nhất một kỹ năng yêu cầu (AI dùng để so khớp CV).')
    if (salaryMin && salaryMax && salaryMin > salaryMax) return setError('Mức lương tối thiểu không được lớn hơn tối đa.')

    const data = {
      title: form.title.trim(),
      location: form.location,
      type: form.type,
      level: form.level,
      salaryMin,
      salaryMax,
      deadline: form.deadline,
      skills: form.skills,
      description: form.description.trim(),
      requirements: splitLines(form.requirements),
      benefits: splitLines(form.benefits),
      status: form.status,
    }

    setSaving(true)
    setError('')
    try {
      if (jobId) await jobApi.update(jobId, data)
      else await jobApi.create(data)
      navigate('/recruiter/jobs')
    } catch (err) {
      setError(getErrorMessage(err))
      setSaving(false)
    }
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
          placeholder="VD: Frontend Developer (ReactJS)"
          value={form.title}
          onChange={set('title')}
        />
      </div>

      <div className="form-row form-row-3">
        <div className="form-group">
          <label htmlFor="location">Địa điểm</label>
          <select id="location" className="input" value={form.location} onChange={set('location')}>
            {LOCATIONS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
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
          <label htmlFor="salaryMin">Lương tối thiểu (triệu)</label>
          <input id="salaryMin" type="number" min="0" className="input" value={form.salaryMin} onChange={set('salaryMin')} />
        </div>
        <div className="form-group">
          <label htmlFor="salaryMax">Lương tối đa (triệu)</label>
          <input id="salaryMax" type="number" min="0" className="input" value={form.salaryMax} onChange={set('salaryMax')} />
        </div>
        <div className="form-group">
          <label htmlFor="deadline">Hạn nộp hồ sơ *</label>
          <input id="deadline" type="date" className="input" required value={form.deadline} onChange={set('deadline')} />
        </div>
      </div>

      <div className="form-group">
        <label>Kỹ năng yêu cầu *</label>
        <SkillInput value={form.skills} onChange={(skills) => setForm({ ...form, skills })} />
        <small className="text-muted">AI dùng danh sách kỹ năng này để chấm điểm và xếp hạng hồ sơ ứng viên.</small>
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

      <div className="form-group">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.status === 'open'}
            onChange={(e) => setForm({ ...form, status: e.target.checked ? 'open' : 'closed' })}
          />
          Hiển thị tin và nhận hồ sơ ngay
        </label>
      </div>

      <div className="actions">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          Hủy
        </button>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Đang lưu...' : jobId ? 'Cập nhật tin' : 'Đăng tin'}
        </button>
      </div>
    </form>
  )
}

export default function JobFormPage() {
  const { id } = useParams()
  const { data: job, loading, error } = useFetch(() => (id ? jobApi.getById(id) : Promise.resolve(null)), [id])

  return (
    <div className="narrow">
      <div className="page-header">
        <h1>{id ? 'Chỉnh sửa tin tuyển dụng' : 'Đăng tin tuyển dụng mới'}</h1>
      </div>
      {loading && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}
      {!loading && !error && <JobForm key={id ?? 'new'} jobId={id} initial={job ? toForm(job) : EMPTY_FORM} />}
    </div>
  )
}
