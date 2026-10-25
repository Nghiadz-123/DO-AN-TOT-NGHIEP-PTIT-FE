import { useState } from 'react'
import employerApi from '@/api/employerApi'
import ChangePasswordForm from '@/components/common/ChangePasswordForm'
import Loading from '@/components/common/Loading'
import useAuth from '@/hooks/useAuth'
import useFetch from '@/hooks/useFetch'
import { formatDate, getErrorMessage } from '@/utils/formatters'

const COMPANY_ROLES = { owner: 'Chủ sở hữu', admin: 'Quản trị', member: 'Thành viên' }

function ProfileForm({ profile }) {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({ fullName: profile.fullName, phone: profile.phone ?? '', position: profile.position ?? '' })
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const updated = await employerApi.updateProfile(form)
      updateUser({ ...user, fullName: updated.fullName, phone: updated.phone, position: updated.position })
      setMessage({ type: 'success', text: 'Đã lưu thông tin cá nhân.' })
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Thông tin cá nhân</h2>
      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="fullName">Họ và tên *</label>
          <input id="fullName" className="input" required maxLength={150} value={form.fullName} onChange={set('fullName')} />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email đăng nhập</label>
          <input id="email" className="input" value={profile.email} disabled />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="phone">Số điện thoại</label>
          <input id="phone" className="input" maxLength={20} value={form.phone} onChange={set('phone')} />
        </div>
        <div className="form-group">
          <label htmlFor="position">Chức danh</label>
          <input
            id="position"
            className="input"
            maxLength={100}
            placeholder="VD: HR Manager"
            value={form.position}
            onChange={set('position')}
          />
        </div>
      </div>
      <p className="text-muted small">
        Vai trò trong công ty: <strong>{COMPANY_ROLES[profile.companyRole] ?? profile.companyRole}</strong>
        {profile.joinedAt && ` · Tham gia từ ${formatDate(profile.joinedAt)}`}
      </p>
      <button className="btn btn-primary" disabled={saving}>
        {saving ? 'Đang lưu...' : 'Lưu thông tin'}
      </button>
    </form>
  )
}

export default function AccountPage() {
  const { data: profile, loading, error } = useFetch(() => employerApi.getProfile(), [])

  return (
    <div className="narrow stack">
      <div className="page-header">
        <div>
          <h1>Tài khoản</h1>
          <p className="text-muted">Thông tin cá nhân và bảo mật đăng nhập</p>
        </div>
      </div>
      {loading && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}
      {profile && <ProfileForm profile={profile} />}
      <ChangePasswordForm />
    </div>
  )
}
