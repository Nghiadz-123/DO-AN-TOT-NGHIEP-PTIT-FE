import { useEffect, useState } from 'react'
import authApi from '@/api/authApi'
import { getToken, removeToken, setToken } from '@/utils/storage'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))

  useEffect(() => {
    if (!getToken()) return
    authApi
      .getMe()
      .then(setUser)
      .catch(() => removeToken())
      .finally(() => setLoading(false))
  }, [])

  const startSession = ({ access, user }) => {
    setToken(access)
    setUser(user)
    return user
  }

  const login = async (credentials) => startSession(await authApi.login(credentials))

  const register = async (data) => startSession(await authApi.register(data))

  const logout = () => {
    removeToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  )
}
