import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import { FEATURES, ROLES, USE_MOCK } from '@/utils/constants'
import { getErrorMessage } from '@/utils/formatters'

// Khi gọi API thật, tài khoản demo có sau khi chạy `python manage.py seed_demo` ở backend
const DEMO_ACCOUNTS = [
  FEATURES.candidate && { label: 'Ứng viên demo', email: 'candidate@demo.com' },
  { label: 'Nhà tuyển dụng demo', email: 'recruiter@demo.com' },
  { label: 'Admin demo', email: 'admin@demo.com' },
].filter(Boolean)
const SHOW_DEMO = USE_MOCK || import.meta.env.DEV

const homeOf = (user) => {
  if (user.role === ROLES.RECRUITER) return '/recruiter'
  if (user.role === ROLES.ADMIN) return '/admin'
  return '/jobs'
}

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={homeOf(user)} replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const loggedIn = await login(form)
      const from = location.state?.from?.pathname
      navigate(from || homeOf(loggedIn), { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1>Đăng nhập</h1>
        <p className="text-muted">Chào mừng bạn quay lại Smart ATS</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" className="input" required value={form.email} onChange={set('email')} />
        </div>
        <div className="form-group">
          <label htmlFor="password">Mật khẩu</label>
          <input
            id="password"
            type="password"
            className="input"
            required
            value={form.password}
            onChange={set('password')}
          />
        </div>
        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        {SHOW_DEMO && (
          <div className="demo-accounts">
            <small className="text-muted">
              {USE_MOCK ? 'Dùng thử nhanh (mật khẩu 123456):' : 'Tài khoản demo từ seed_demo (mật khẩu 123456):'}
            </small>
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setForm({ email: a.email, password: '123456' })}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        <p className="text-center">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </form>
    </div>
  )
}
