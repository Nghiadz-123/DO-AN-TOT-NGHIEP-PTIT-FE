import { useState } from 'react'
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
      <h2>Đổi mật khẩu</h2>
      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      <div className="form-group">
        <label htmlFor="currentPassword">Mật khẩu hiện tại</label>
        <input
          id="currentPassword"
          type="password"
          className="input"
          required
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={set('currentPassword')}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="newPassword">Mật khẩu mới</label>
          <input
            id="newPassword"
            type="password"
            className="input"
            required
            autoComplete="new-password"
            value={form.newPassword}
            onChange={set('newPassword')}
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
          <input
            id="confirmPassword"
            type="password"
            className="input"
            required
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
          />
        </div>
      </div>
      <button className="btn btn-primary" disabled={saving}>
        {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
      </button>
    </form>
  )
}
