import { cleanParams, toConversation, toMessage } from './adapters'
import axiosClient from './axiosClient'

const BASE = '/conversations/'
// Số hội thoại tối đa lấy một lần (backend giới hạn page_size <= 100)
const CONVERSATIONS_LIMIT = 100

// Nhắn tin 1-1 giữa hai tài khoản đã kết bạn. Chưa có WebSocket: giao diện hỏi định kỳ tin nhắn mới (after)
const chatApi = {
  // Có tin nhắn gần nhất trước
  getConversations: async () =>
    (await axiosClient.get(BASE, { params: { page_size: CONVERSATIONS_LIMIT } })).results.map(toConversation),
  getConversation: async (id) => toConversation(await axiosClient.get(`${BASE}${id}/`)),
  // Mở (hoặc lấy lại) hội thoại với một bạn bè theo id tài khoản
  open: async (userId) => toConversation(await axiosClient.post(BASE, { user_id: userId })),

  // Không truyền gì: tin mới nhất; after: tin mới hơn id; before: tin cũ hơn id. Trả về { messages, hasMore }
  getMessages: async (id, { after, before } = {}) => {
    const data = await axiosClient.get(`${BASE}${id}/messages/`, { params: cleanParams({ after, before }) })
    return { messages: data.results.map(toMessage), hasMore: data.has_more }
  },
  send: async (id, body) => toMessage(await axiosClient.post(`${BASE}${id}/messages/`, { body })),
  markRead: (id) => axiosClient.post(`${BASE}${id}/read/`),

  // Số liệu cho huy hiệu trên menu
  getSummary: async () => {
    const data = await axiosClient.get(`${BASE}summary/`)
    return {
      unreadMessages: data.unread_messages,
      unreadConversations: data.unread_conversations,
      pendingRequests: data.pending_requests,
    }
  },
}

export default chatApi
