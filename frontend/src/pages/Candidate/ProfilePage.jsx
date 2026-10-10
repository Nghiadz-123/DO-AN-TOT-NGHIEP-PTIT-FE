import { useState } from 'react'
import candidateApi from '@/api/candidateApi'
import Loading from '@/components/common/Loading'
import useAuth from '@/hooks/useAuth'
import { useLocations } from '@/hooks/useCatalog'
import useFetch from '@/hooks/useFetch'
import { GENDERS, JOB_LEVELS, JOB_TYPES, WORK_MODES } from '@/utils/constants'
import { getErrorMessage } from '@/utils/formatters'

function Select({ id, label, value, onChange, options, placeholder = 'Chưa chọn' }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="input" value={value} onChange={onChange}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ProfileForm({ initial }) {
  const { updateUser } = useAuth()
  const locations = useLocations()
  const [form, setForm] = useState(initial)
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.salaryMin !== '' && form.salaryMax !== '' && Number(form.salaryMin) > Number(form.salaryMax)) {
      return setMessage({ type: 'error', text: 'Mức lương mong muốn tối thiểu không được lớn hơn tối đa.' })
    }
    setSaving(true)
    setMessage(null)
    try {
      const saved = await candidateApi.updateProfile(form)
      setForm(saved)
      updateUser((user) => ({ ...user, fullName: saved.fullName, phone: saved.phone, headline: saved.headline }))
      setMessage({ type: 'success', text: 'Đã lưu thông tin hồ sơ.' })
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setSaving(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <h2>Thông tin cá nhân</h2>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="fullName">Họ và tên *</label>
          <input id="fullName" className="input" required maxLength={150} value={form.fullName} onChange={set('fullName')} />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Số điện thoại</label>
          <input id="phone" className="input" maxLength={20} value={form.phone} onChange={set('phone')} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="dateOfBirth">Ngày sinh</label>
          <input id="dateOfBirth" type="date" className="input" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
        </div>
        <Select id="gender" label="Giới tính" value={form.gender} onChange={set('gender')} options={GENDERS} />
      </div>
      <div className="form-group">
        <label htmlFor="headline">Tiêu đề hồ sơ</label>
        <input
          id="headline"
          className="input"
          maxLength={255}
          placeholder="VD: Kế toán tổng hợp · 3 năm kinh nghiệm"
          value={form.headline}
          onChange={set('headline')}
        />
      </div>
      <div className="form-group">
        <label htmlFor="address">Địa chỉ</label>
        <input id="address" className="input" value={form.address} onChange={set('address')} />
      </div>
      <div className="form-group">
        <label htmlFor="summary">Giới thiệu bản thân & mục tiêu nghề nghiệp</label>
        <textarea id="summary" className="input" rows={4} value={form.summary} onChange={set('summary')} />
      </div>

      <h2>Mong muốn công việc</h2>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="desiredPosition">Vị trí mong muốn</label>
          <input
            id="desiredPosition"
            className="input"
            placeholder="VD: Kế toán tổng hợp, Nhân viên kinh doanh"
            value={form.desiredPosition}
            onChange={set('desiredPosition')}
          />
        </div>
        <Select
          id="locationId"
          label="Nơi làm việc mong muốn"
          value={form.locationId}
          onChange={set('locationId')}
          options={locations.map((l) => ({ value: l.id, label: l.name }))}
          placeholder="Chọn địa điểm"
        />
      </div>
      <div className="form-row form-row-3">
        <Select id="type" label="Hình thức" value={form.type} onChange={set('type')} options={JOB_TYPES} />
        <Select id="workMode" label="Chế độ làm việc" value={form.workMode} onChange={set('workMode')} options={WORK_MODES} />
        <Select id="level" label="Cấp bậc hiện tại" value={form.level} onChange={set('level')} options={JOB_LEVELS} />
      </div>
      <div className="form-row form-row-3">
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
          <label htmlFor="salaryMin">Lương tối thiểu (triệu)</label>
          <input id="salaryMin" type="number" min="0" step="0.5" className="input" value={form.salaryMin} onChange={set('salaryMin')} />
        </div>
        <div className="form-group">
          <label htmlFor="salaryMax">Lương tối đa (triệu)</label>
          <input id="salaryMax" type="number" min="0" step="0.5" className="input" value={form.salaryMax} onChange={set('salaryMax')} />
        </div>
      </div>
      <div className="form-group">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.isOpenToWork}
            onChange={(e) => setForm({ ...form, isOpenToWork: e.target.checked })}
          />
          Đang tìm việc
        </label>
      </div>

      <button className="btn btn-primary" disabled={saving}>
        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </form>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { data: profile, loading, error } = useFetch(() => candidateApi.getProfile(), [])

  return (
    <div className="narrow">
      <div className="page-header">
        <div>
          <h1>Hồ sơ cá nhân</h1>
          <p className="text-muted">{user.email}</p>
        </div>
      </div>
      {loading && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}
      {profile && <ProfileForm initial={profile} />}
    </div>
  )
}
