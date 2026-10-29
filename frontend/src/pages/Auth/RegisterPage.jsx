import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Building, CircleCheck, TriangleAlert, UserPlus, UserRound } from 'lucide-react'
import PasswordInput from '@/components/common/PasswordInput'
import AuthAside from '@/components/layout/AuthAside'
import useAuth from '@/hooks/useAuth'
import { FEATURES, ROLES } from '@/utils/constants'
import { getErrorMessage } from '@/utils/formatters'

// Chi cho phep dang ky candidate va recruiter, khong cho dang ky admin
const ROLE_OPTIONS = [
  {
    value: ROLES.CANDIDATE,
    title: 'Ứng viên',
    text: FEATURES.candidateAi ? 'Tìm việc, chấm điểm CV bằng AI' : 'Tải CV, tìm việc và ứng tuyển',
    icon: UserRound,
  },
  {
    value: ROLES.RECRUITER,
    title: 'Nhà tuyển dụng',
    text: FEATURES.ai ? 'Đăng tin, AI sàng lọc hồ sơ' : 'Đăng tin, quản lý hồ sơ ứng viên',
    icon: Building,
  },
]

// Trang đích sau khi đăng ký. Dùng chung cho guard bên dưới: khi user vừa được tạo, guard render trước
// lệnh navigate nên hai nơi phải cùng đích
// Ứng viên mới chưa có CV -> trang tải CV
const homeOf = (user) =>
  user.role === ROLES.RECRUITER ? '/recruiter' : FEATURES.candidateAi ? '/cv-analysis' : '/cv/new'

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
      <div className="auth-shell">
        <AuthAside title="Bắt đầu hành trình nghề nghiệp mới" />
        <form className="auth-card" onSubmit={handleSubmit}>
          <h1>Tạo tài khoản</h1>
          <p className="text-muted">Miễn phí, chỉ mất chưa đến một phút</p>

          <fieldset className="field-group">
            <legend className="field-label">Bạn là</legend>
            <div className="role-picker">
              {ROLE_OPTIONS.map((r) => (
                <label key={r.value} className={`role-option ${form.role === r.value ? 'selected' : ''}`}>
                  {/* Ẩn kiểu visually-hidden (không phải display:none) để vẫn chọn được bằng bàn phím */}
                  <input
                    type="radio"
                    name="role"
                    className="visually-hidden"
                    value={r.value}
                    checked={form.role === r.value}
                    onChange={set('role')}
                  />
                  <span className="role-option-icon" aria-hidden="true">
                    <r.icon />
                  </span>
                  <strong>{r.title}</strong>
                  <small>{r.text}</small>
                  {form.role === r.value && <CircleCheck className="role-option-check" aria-hidden="true" />}
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <div className="alert alert-error" role="alert">
              <TriangleAlert />
              <div className="alert-content">{error}</div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="fullName">Họ và tên</label>
            <input
              id="fullName"
              className="input"
              required
              autoComplete="name"
              value={form.fullName}
              onChange={set('fullName')}
            />
          </div>
          {isRecruiter && (
            <div className="form-group">
              <label htmlFor="companyName">Tên công ty</label>
              <input
                id="companyName"
                className="input"
                required
                autoComplete="organization"
                value={form.companyName}
                onChange={set('companyName')}
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              required
              autoComplete="email"
              value={form.email}
              onChange={set('email')}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Mật khẩu</label>
              <PasswordInput
                id="password"
                required
                autoComplete="new-password"
                aria-describedby="password-hint"
                value={form.password}
                onChange={set('password')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <PasswordInput
                id="confirmPassword"
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
              />
            </div>
          </div>
          <p id="password-hint" className="field-hint auth-password-hint">
            Mật khẩu tối thiểu 8 ký tự, không quá đơn giản hoặc chỉ gồm chữ số.
          </p>
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? <span className="spinner" aria-hidden="true" /> : <UserPlus />}
            {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </button>
          <p className="auth-switch">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
