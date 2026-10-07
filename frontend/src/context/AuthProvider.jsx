import { useEffect, useState } from 'react'
import authApi from '@/api/authApi'
import { SESSION_EXPIRED_EVENT } from '@/api/axiosClient'
import { clearTokens, getRefreshToken, getToken, setTokens } from '@/utils/storage'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))

  useEffect(() => {
    if (!getToken()) return
    authApi
      .getMe()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoading(false))
  }, [])

  // Refresh token hết hạn (axiosClient phát sự kiện) -> đăng xuất
  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])

  const startSession = ({ access, refresh, user }) => {
    setTokens(access, refresh)
    setUser(user)
    return user
  }

  const login = async (credentials) => startSession(await authApi.login(credentials))

  const register = async (data) => startSession(await authApi.register(data))

  const logout = () => {
    const refresh = getRefreshToken()
    if (refresh) authApi.logout(refresh).catch(() => {}) // thu hồi refresh token phía server, lỗi thì bỏ qua
    clearTokens()
    setUser(null)
  }

  // Đổi mật khẩu: server thu hồi mọi phiên cũ và trả token mới cho phiên hiện tại
  const changePassword = async (data) => {
    const tokens = await authApi.changePassword(data)
    setTokens(tokens.access, tokens.refresh)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, changePassword, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  )
}
