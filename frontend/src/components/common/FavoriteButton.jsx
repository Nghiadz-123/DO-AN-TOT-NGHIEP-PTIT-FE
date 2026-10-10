import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import useFavorites from '@/hooks/useFavorites'
import { ROLES } from '@/utils/constants'
import { getErrorMessage } from '@/utils/formatters'

// Nút ♥ thêm / bỏ yêu thích một việc làm (type="job") hoặc công ty (type="company").
// Khách được đưa tới trang đăng nhập; nhà tuyển dụng và admin không thấy nút.
export default function FavoriteButton({ type, id, withLabel = false }) {
  const { user } = useAuth()
  const { isFavorite, toggle } = useFavorites()
  const navigate = useNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(false)

  if (user && user.role !== ROLES.CANDIDATE) return null

  const active = isFavorite(type, id)
  const label = active ? 'Bỏ yêu thích' : 'Yêu thích'

  const handleClick = async () => {
    if (!user) return navigate('/login', { state: { from: location } })
    setBusy(true)
    try {
      await toggle(type, id)
    } catch (err) {
      window.alert(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={withLabel ? `btn btn-outline btn-favorite-label ${active ? 'active' : ''}` : `btn-favorite ${active ? 'active' : ''}`}
      aria-pressed={active}
      aria-label={withLabel ? undefined : label}
      title={user ? label : 'Đăng nhập để lưu yêu thích'}
      disabled={busy}
      onClick={handleClick}
    >
      <span aria-hidden="true">{active ? '♥' : '♡'}</span>
      {withLabel && ` ${active ? 'Đã yêu thích' : 'Yêu thích'}`}
    </button>
  )
}
