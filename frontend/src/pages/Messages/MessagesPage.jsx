import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import chatApi from '@/api/chatApi'
import ChatThread from '@/components/chat/ChatThread'
import CountBadge from '@/components/common/CountBadge'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import { ParticipantAvatar } from '@/components/connections/Participant'
import useAuth from '@/hooks/useAuth'
import useFetch from '@/hooks/useFetch'
import useInbox from '@/hooks/useInbox'
import usePolling from '@/hooks/usePolling'
import { messagesPath, ROLES } from '@/utils/constants'
import { getErrorMessage } from '@/utils/formatters'
import { normalize } from '@/utils/text'

const POLL_INTERVAL = 10_000

const byLatest = (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)

// Hôm nay: giờ:phút; ngày khác: ngày/tháng
function formatChatTime(value) {
  const date = new Date(value)
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

export default function MessagesPage() {
  const { conversationId } = useParams()
  const { user } = useAuth()
  const { refresh: refreshInbox } = useInbox()
  const [conversations, setConversations] = useState(null)
  const [listError, setListError] = useState('')
  const [search, setSearch] = useState('')
  const isRecruiter = user.role === ROLES.RECRUITER

  const loadConversations = useCallback(
    () =>
      chatApi
        .getConversations()
        .then((list) => {
          setConversations(list)
          setListError('')
        })
        .catch((err) => setListError(getErrorMessage(err))),
    [],
  )

  useEffect(() => {
    loadConversations()
  }, [loadConversations])
  usePolling(loadConversations, POLL_INTERVAL)

  // Hội thoại trên URL chưa có trong danh sách đã tải (vd. ngoài 100 hội thoại gần nhất): tải riêng
  const fromList = conversations?.find((c) => c.id === conversationId)
  const needFetch = Boolean(conversationId && conversations && !fromList)
  const { data: fetched, error: selectedError } = useFetch(
    () => (needFetch ? chatApi.getConversation(conversationId) : Promise.resolve(null)),
    [conversationId, needFetch],
  )
  const selected = fromList ?? (fetched?.id === conversationId ? fetched : null)

  const handleRead = useCallback(
    (id) => {
      setConversations((list) => list?.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)))
      refreshInbox()
    },
    [refreshInbox],
  )

  const handleSent = useCallback((id, message) => {
    setConversations((list) =>
      list
        ?.map((c) =>
          c.id === id
            ? { ...c, lastMessage: { id: message.id, body: message.body, isMine: true }, lastMessageAt: message.createdAt }
            : c,
        )
        .sort(byLatest),
    )
  }, [])

  const keyword = normalize(search)
  const visible = (conversations ?? []).filter((c) => !keyword || normalize(c.user.fullName).includes(keyword))
  const connectionsPath = isRecruiter ? '/recruiter/connections' : '/connections'

  return (
    <>
      <div className="page-header">
        <div>
          <h1>💬 Tin nhắn</h1>
          <p className="text-muted">
            Trò chuyện trực tiếp với {isRecruiter ? 'ứng viên' : 'nhà tuyển dụng'} đã kết bạn với bạn
          </p>
        </div>
        <Link to={connectionsPath} className="btn btn-outline">
          🤝 Kết nối
        </Link>
      </div>

      {listError && <div className="alert alert-error">{listError}</div>}
      {selectedError && <div className="alert alert-error">{selectedError}</div>}

      {!conversations ? (
        !listError && <Loading />
      ) : conversations.length === 0 && !selected ? (
        <EmptyState
          title="Chưa có cuộc trò chuyện nào"
          description={
            isRecruiter
              ? 'Gửi lời mời kết bạn tới ứng viên phù hợp; khi ứng viên chấp nhận, hai bên nhắn tin được với nhau.'
              : 'Khi bạn chấp nhận lời mời kết bạn của nhà tuyển dụng, cuộc trò chuyện sẽ xuất hiện ở đây.'
          }
          action={
            <Link to={isRecruiter ? '/recruiter/talents' : connectionsPath} className="btn btn-primary">
              {isRecruiter ? '🎯 Tìm ứng viên phù hợp' : 'Xem lời mời kết bạn'}
            </Link>
          }
        />
      ) : (
        <div className={`card chat ${selected ? 'has-selection' : ''}`}>
          <aside className="chat-sidebar">
            <div className="chat-search">
              <input
                className="input"
                placeholder="Tìm theo tên..."
                aria-label="Tìm cuộc trò chuyện"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <ul className="chat-list">
              {visible.map((c) => (
                <li key={c.id}>
                  <Link
                    to={messagesPath(user.role, c.id)}
                    className={`chat-list-item ${c.id === conversationId ? 'active' : ''}`}
                  >
                    <ParticipantAvatar user={c.user} />
                    <div className="chat-list-text">
                      <div className="chat-list-top">
                        <strong className="chat-list-name">{c.user.fullName}</strong>
                        <span className="text-muted small nowrap">{formatChatTime(c.lastMessageAt)}</span>
                      </div>
                      {c.user.company && <span className="text-muted small chat-preview">{c.user.company.name}</span>}
                      <span className={`chat-preview ${c.unreadCount ? 'unread' : ''}`}>
                        {c.lastMessage ? `${c.lastMessage.isMine ? 'Bạn: ' : ''}${c.lastMessage.body}` : 'Chưa có tin nhắn'}
                      </span>
                    </div>
                    {/* Hội thoại đang mở được đánh dấu đã đọc ngay khi có tin mới */}
                    <CountBadge count={c.id === conversationId ? 0 : c.unreadCount} label="tin chưa đọc" />
                  </Link>
                </li>
              ))}
              {visible.length === 0 && <li className="text-muted text-center chat-search">Không tìm thấy.</li>}
            </ul>
          </aside>
          {selected ? (
            <ChatThread
              key={selected.id}
              conversation={selected}
              backTo={messagesPath(user.role)}
              onRead={handleRead}
              onSent={handleSent}
            />
          ) : (
            <div className="chat-thread chat-empty">Chọn một cuộc trò chuyện để bắt đầu nhắn tin</div>
          )}
        </div>
      )}
    </>
  )
}
