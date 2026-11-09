import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, TriangleAlert } from 'lucide-react'
import PasswordInput from '@/components/common/PasswordInput'
import AuthAside from '@/components/layout/AuthAside'
import useAuth from '@/hooks/useAuth'
import { ROLES } from '@/utils/constants'
import { getErrorMessage } from '@/utils/formatters'

const homeOf = (user) => {
  if (user.role === ROLES.RECRUITER) return '/recruiter'
  if (user.role === ROLES.ADMIN) return '/admin'
  return '/'
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
      <div className="auth-shell">
        <AuthAside title="Chào mừng bạn quay lại" />
        <form className="auth-card" onSubmit={handleSubmit}>
          <h1>Đăng nhập</h1>
          <p className="text-muted">Đăng nhập để ứng tuyển và theo dõi hồ sơ của bạn trên Smart ATS</p>

          {error && (
            <div className="alert alert-error" role="alert">
              <TriangleAlert />
              <div className="alert-content">{error}</div>
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
          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <PasswordInput
              id="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={set('password')}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? <span className="spinner" aria-hidden="true" /> : <LogIn />}
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <p className="auth-switch">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
