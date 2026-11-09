import { useCallback, useEffect, useMemo, useState } from 'react'
import invitationApi from '@/api/invitationApi'
import useAuth from '@/hooks/useAuth'
import { ROLES } from '@/utils/constants'
import { InboxContext } from './InboxContext'

// Chưa có thông báo đẩy: hỏi định kỳ, bỏ qua khi tab đang ẩn
const POLL_INTERVAL = 60_000
const EMPTY = { newInvitations: 0 }

// Số thư mời ứng tuyển ứng viên chưa xem, dùng cho huy hiệu trên menu
export function InboxProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.role === ROLES.CANDIDATE ? user.id : null
  // owner: tài khoản sở hữu số liệu, để không hiện số của tài khoản trước khi đổi tài khoản
  const [state, setState] = useState({ owner: null, summary: EMPTY })

  const refresh = useCallback(() => {
    if (!userId) return
    invitationApi
      .getUnreadCount()
      .then((newInvitations) => setState({ owner: userId, summary: { newInvitations } }))
      // lỗi mạng tạm thời: giữ số cũ, lần hỏi sau sẽ cập nhật
      .catch(() => {})
  }, [userId])

  useEffect(() => {
    if (!userId) return undefined
    refresh()
    const timer = setInterval(() => !document.hidden && refresh(), POLL_INTERVAL)
    const onVisible = () => !document.hidden && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, refresh])

  const value = useMemo(
    () => ({ enabled: userId !== null, summary: state.owner === userId ? state.summary : EMPTY, refresh }),
    [userId, state, refresh],
  )

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>
}
