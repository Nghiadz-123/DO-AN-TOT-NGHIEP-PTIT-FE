import { useState } from 'react'
import authApi from '@/api/authApi'
import useAuth from '@/hooks/useAuth'
import { useLocations } from '@/hooks/useCatalog'
import { getErrorMessage } from '@/utils/formatters'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const locations = useLocations()
  const [form, setForm] = useState({
    fullName: user.fullName ?? '',
    phone: user.phone ?? '',
    title: user.title ?? '',
    location: user.location ?? '',
    about: user.about ?? '',
  })
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      updateUser(await authApi.updateProfile(form))
      setMessage({ type: 'success', text: 'Đã lưu thông tin hồ sơ.' })
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="narrow">
      <div className="page-header">
        <div>
          <h1>Hồ sơ cá nhân</h1>
          <p className="text-muted">{user.email}</p>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="fullName">Họ và tên</label>
            <input id="fullName" className="input" required value={form.fullName} onChange={set('fullName')} />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Số điện thoại</label>
            <input id="phone" className="input" value={form.phone} onChange={set('phone')} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="title">Vị trí mong muốn</label>
            <input
              id="title"
              className="input"
              placeholder="VD: Frontend Developer"
              value={form.title}
              onChange={set('title')}
            />
          </div>
          <div className="form-group">
            <label htmlFor="location">Nơi làm việc mong muốn</label>
            <select id="location" className="input" value={form.location} onChange={set('location')}>
              <option value="">Chọn địa điểm</option>
              {locations.map((l) => (
                <option key={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="about">Giới thiệu bản thân</label>
          <textarea id="about" className="input" rows={4} value={form.about} onChange={set('about')} />
        </div>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>
    </div>
  )
}
