import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import chatApi from '@/api/chatApi'
import useAuth from '@/hooks/useAuth'
import { messagesPath } from '@/utils/constants'

// Mở (hoặc lấy lại) hội thoại với một bạn bè rồi chuyển tới trang tin nhắn. Lỗi ném ra cho nơi gọi hiển thị
export default function useOpenChat() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return useCallback(
    async (userId) => {
      const conversation = await chatApi.open(userId)
      navigate(messagesPath(user.role, conversation.id))
    },
    [user, navigate],
  )
}
