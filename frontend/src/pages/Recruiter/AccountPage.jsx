import { useState } from 'react'
import { Save, UserRound } from 'lucide-react'
import employerApi from '@/api/employerApi'
import Badge from '@/components/common/Badge'
import ChangePasswordForm from '@/components/common/ChangePasswordForm'
import ErrorState from '@/components/common/ErrorState'
import FormStatus from '@/components/common/FormStatus'
import { SkeletonLines } from '@/components/common/Skeleton'
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
      <h2 className="card-section-title">
        <UserRound />
        Thông tin cá nhân
      </h2>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="fullName">
            Họ và tên
            <span className="required-mark" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="fullName"
            className="input"
            required
            maxLength={150}
            autoComplete="name"
            value={form.fullName}
            onChange={set('fullName')}
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email đăng nhập</label>
          <input id="email" className="input" value={profile.email} disabled aria-describedby="email-hint" />
          <small id="email-hint" className="field-hint">
            Email đăng nhập không đổi được.
          </small>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="phone">Số điện thoại</label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="input"
            maxLength={20}
            value={form.phone}
            onChange={set('phone')}
          />
        </div>
        <div className="form-group">
          <label htmlFor="position">Chức danh</label>
          <input
            id="position"
            className="input"
            maxLength={100}
            autoComplete="organization-title"
            placeholder="VD: Trưởng phòng nhân sự"
            value={form.position}
            onChange={set('position')}
          />
        </div>
      </div>
      <p className="account-role text-muted small">
        Vai trò trong công ty: <Badge tone="primary">{COMPANY_ROLES[profile.companyRole] ?? profile.companyRole}</Badge>
        {profile.joinedAt && <span>Tham gia từ {formatDate(profile.joinedAt)}</span>}
      </p>
      <div className="form-footer">
        <FormStatus message={message} />
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" aria-hidden="true" /> : <Save />}
          {saving ? 'Đang lưu...' : 'Lưu thông tin'}
        </button>
      </div>
    </form>
  )
}

export default function AccountPage() {
  const { data: profile, loading, error, reload } = useFetch(() => employerApi.getProfile(), [])

  return (
    <div className="narrow stack">
      <div className="page-header">
        <div>
          <h1>Tài khoản</h1>
          <p className="text-muted">Thông tin cá nhân và bảo mật đăng nhập</p>
        </div>
      </div>
      {loading && (
        <div className="card">
          <SkeletonLines lines={4} label="Đang tải thông tin tài khoản" />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={reload} />}
      {profile && <ProfileForm profile={profile} />}
      <ChangePasswordForm />
    </div>
  )
}
