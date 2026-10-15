import { useCallback, useEffect, useMemo, useState } from 'react'
import chatApi from '@/api/chatApi'
import useAuth from '@/hooks/useAuth'
import { CHAT_ROLES } from '@/utils/constants'
import { InboxContext } from './InboxContext'

// Chưa có WebSocket: hỏi định kỳ, bỏ qua khi tab đang ẩn
const POLL_INTERVAL = 20_000
const EMPTY = { unreadMessages: 0, unreadConversations: 0, pendingRequests: 0 }

// Số tin nhắn chưa đọc và lời mời kết bạn đang chờ, dùng cho huy hiệu trên menu
export function InboxProvider({ children }) {
  const { user } = useAuth()
  const userId = user && CHAT_ROLES.includes(user.role) ? user.id : null
  // owner: tài khoản sở hữu số liệu, để không hiện số của tài khoản trước khi đổi tài khoản
  const [state, setState] = useState({ owner: null, summary: EMPTY })

  const refresh = useCallback(() => {
    if (!userId) return
    chatApi
      .getSummary()
      .then((summary) => setState({ owner: userId, summary }))
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
