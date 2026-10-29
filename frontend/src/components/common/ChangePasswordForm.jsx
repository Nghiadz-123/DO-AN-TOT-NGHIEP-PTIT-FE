import { useState } from 'react'
import { CircleCheck, KeyRound, TriangleAlert } from 'lucide-react'
import PasswordInput from '@/components/common/PasswordInput'
import useAuth from '@/hooks/useAuth'
import { getErrorMessage } from '@/utils/formatters'

// Đổi mật khẩu cho người dùng đang đăng nhập (dùng ở trang hồ sơ ứng viên và tài khoản NTD)
export default function ChangePasswordForm() {
  const { changePassword } = useAuth()
  const empty = { currentPassword: '', newPassword: '', confirmPassword: '' }
  const [form, setForm] = useState(empty)
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.newPassword.length < 8) return setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự.' })
    if (form.newPassword !== form.confirmPassword) {
      return setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' })
    }
    setSaving(true)
    setMessage(null)
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      setForm(empty)
      setMessage({ type: 'success', text: 'Đã đổi mật khẩu. Các phiên đăng nhập khác đã bị đăng xuất.' })
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2 className="card-section-title">
        <KeyRound />
        Đổi mật khẩu
      </h2>
      {message && (
        <div className={`alert alert-${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
          {message.type === 'error' ? <TriangleAlert /> : <CircleCheck />}
          <div className="alert-content">{message.text}</div>
        </div>
      )}
      <div className="form-group">
        <label htmlFor="currentPassword">Mật khẩu hiện tại</label>
        <PasswordInput
          id="currentPassword"
          required
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={set('currentPassword')}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="newPassword">Mật khẩu mới</label>
          <PasswordInput
            id="newPassword"
            required
            autoComplete="new-password"
            aria-describedby="newPassword-hint"
            value={form.newPassword}
            onChange={set('newPassword')}
          />
          <small id="newPassword-hint" className="field-hint">
            Tối thiểu 8 ký tự.
          </small>
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
          <PasswordInput
            id="confirmPassword"
            required
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
          />
        </div>
      </div>
      <div className="form-footer">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner" aria-hidden="true" />}
          {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
        </button>
      </div>
    </form>
  )
}
