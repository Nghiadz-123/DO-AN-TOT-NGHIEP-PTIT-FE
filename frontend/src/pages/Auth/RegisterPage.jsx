import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import { FEATURES, ROLES } from '@/utils/constants'
import { getErrorMessage } from '@/utils/formatters'

// Chi cho phep dang ky candidate va recruiter, khong cho dang ky admin
const ROLE_OPTIONS = [
  {
    value: ROLES.CANDIDATE,
    title: 'Ứng viên',
    text: FEATURES.ai ? 'Tìm việc, chấm điểm CV bằng AI' : 'Tải CV, tìm việc và ứng tuyển',
  },
  {
    value: ROLES.RECRUITER,
    title: 'Nhà tuyển dụng',
    text: FEATURES.ai ? 'Đăng tin, AI sàng lọc hồ sơ' : 'Đăng tin, quản lý hồ sơ ứng viên',
  },
]

// Trang đích sau khi đăng ký. Dùng chung cho guard bên dưới: khi user vừa được tạo, guard render trước
// lệnh navigate nên hai nơi phải cùng đích
// Ứng viên mới chưa có CV -> trang tải CV
const homeOf = (user) => (user.role === ROLES.RECRUITER ? '/recruiter' : FEATURES.ai ? '/cv-analysis' : '/cv/new')

export default function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    role: ROLES.CANDIDATE,
    fullName: '',
    email: '',
    companyName: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={homeOf(user)} replace />

  const isRecruiter = form.role === ROLES.RECRUITER
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) return setError('Mật khẩu phải có ít nhất 8 ký tự.')
    if (form.password !== form.confirmPassword) return setError('Mật khẩu xác nhận không khớp.')

    setSubmitting(true)
    setError('')
    try {
      const { confirmPassword: _confirm, ...data } = form
      if (!isRecruiter) delete data.companyName
      const newUser = await register(data)
      navigate(homeOf(newUser), { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1>Tạo tài khoản</h1>

        <div className="role-picker">
          {ROLE_OPTIONS.map((r) => (
            <label
              key={r.value}
              className={`role-option ${form.role === r.value ? 'selected' : ''} ${r.disabled ? 'disabled' : ''}`}
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={form.role === r.value}
                disabled={r.disabled}
                onChange={set('role')}
              />
              <strong>{r.title}</strong>
              <small className="text-muted">{r.text}</small>
            </label>
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label htmlFor="fullName">Họ và tên</label>
          <input id="fullName" className="input" required value={form.fullName} onChange={set('fullName')} />
        </div>
        {isRecruiter && (
          <div className="form-group">
            <label htmlFor="companyName">Tên công ty</label>
            <input
              id="companyName"
              className="input"
              required
              value={form.companyName}
              onChange={set('companyName')}
            />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" className="input" required value={form.email} onChange={set('email')} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              className="input"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={set('password')}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
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
        <small className="text-muted">Mật khẩu tối thiểu 8 ký tự, không quá đơn giản hoặc chỉ gồm chữ số.</small>
        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </button>
        <p className="text-center">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </div>
  )
}
