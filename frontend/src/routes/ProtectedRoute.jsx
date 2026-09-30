import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Loading from '@/components/common/Loading'
import useAuth from '@/hooks/useAuth'

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return <Outlet />
}
