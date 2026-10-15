import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import chatApi from '@/api/chatApi'
import Loading from '@/components/common/Loading'
import { ParticipantAvatar } from '@/components/connections/Participant'
import usePolling from '@/hooks/usePolling'
import { formatDateTime, getErrorMessage, participantSubtitle } from '@/utils/formatters'

const POLL_INTERVAL = 3_000
// Khớp backend messaging.services.BODY_MAX_LENGTH
const BODY_MAX = 2000
// Cách đáy dưới ngưỡng này coi như đang ở cuối: có tin mới thì tự cuộn xuống
const NEAR_BOTTOM = 80

// Gộp tin nhắn theo id (tin vừa gửi có thể về lại qua lần hỏi định kỳ), sắp theo thứ tự gửi
const mergeMessages = (current, incoming) => {
  const byId = new Map(current.map((m) => [m.id, m]))
  incoming.forEach((m) => byId.set(m.id, m))
  return [...byId.values()].sort((a, b) => a.id - b.id)
}

// Khung trò chuyện của một hội thoại. Dùng key={conversation.id} để đổi hội thoại là khởi tạo lại
export default function ChatThread({ conversation, backTo, onRead, onSent }) {
  const [messages, setMessages] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const stickToBottom = useRef(true)
  const restoreOffset = useRef(null) // khoảng cách tới đáy trước khi chèn tin cũ, để giữ nguyên vị trí đang đọc
  const polling = useRef(false)
  const { id } = conversation

  const markRead = useCallback(() => {
    chatApi
      .markRead(id)
      .then(() => onRead(id))
      .catch(() => {})
  }, [id, onRead])

  useEffect(() => {
    let active = true
    chatApi
      .getMessages(id)
      .then((page) => {
        if (!active) return
        setMessages(page.messages)
        setHasMore(page.hasMore)
        if (page.messages.some((m) => !m.isMine && !m.readAt)) markRead()
      })
      .catch((err) => active && setError(getErrorMessage(err)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id, markRead])

  // Hỏi định kỳ tin nhắn mới hơn tin cuối đang có
  usePolling(async () => {
    if (loading || polling.current) return
    polling.current = true
    try {
      const { messages: fresh } = await chatApi.getMessages(id, { after: messages.at(-1)?.id ?? 0 })
      if (fresh.length) {
        setMessages((list) => mergeMessages(list, fresh))
        if (fresh.some((m) => !m.isMine)) markRead()
      }
    } catch {
      // lỗi mạng tạm thời: thử lại ở lần hỏi sau
    } finally {
      polling.current = false
    }
  }, POLL_INTERVAL)

  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    if (restoreOffset.current !== null) {
      el.scrollTop = el.scrollHeight - restoreOffset.current
      restoreOffset.current = null
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, loading])

  const handleScroll = () => {
    const el = listRef.current
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM
  }

  const loadOlder = async () => {
    setLoadingOlder(true)
    try {
      const page = await chatApi.getMessages(id, { before: messages[0].id })
      const el = listRef.current
      restoreOffset.current = el.scrollHeight - el.scrollTop
      setMessages((list) => mergeMessages(page.messages, list))
      setHasMore(page.hasMore)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoadingOlder(false)
    }
  }

  const send = async (e) => {
    e?.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setError('')
    try {
      const message = await chatApi.send(id, body)
      stickToBottom.current = true
      setMessages((list) => mergeMessages(list, [message]))
      setText('')
      onSent(id, message)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSending(false)
    }
  }

  // Enter gửi, Shift + Enter xuống dòng; bỏ qua Enter khi bộ gõ tiếng Việt đang ghép chữ
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  const { user } = conversation

  return (
    <section className="chat-thread">
      <header className="chat-thread-head">
        <Link to={backTo} className="btn btn-ghost btn-sm chat-back" aria-label="Quay lại danh sách hội thoại">
          ←
        </Link>
        <ParticipantAvatar user={user} />
        <div className="person-info">
          <strong>{user.fullName}</strong>
          {participantSubtitle(user) && <div className="text-muted small">{participantSubtitle(user)}</div>}
        </div>
      </header>

      <div className="chat-messages" ref={listRef} onScroll={handleScroll} aria-live="polite">
        {hasMore && (
          <button className="btn btn-ghost btn-sm chat-older" disabled={loadingOlder} onClick={loadOlder}>
            {loadingOlder ? 'Đang tải...' : 'Xem tin nhắn cũ hơn'}
          </button>
        )}
        {loading ? (
          <Loading />
        ) : messages.length === 0 ? (
          <div className="chat-empty">Hãy gửi lời chào đầu tiên tới {user.fullName} 👋</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`chat-bubble-row ${m.isMine ? 'mine' : ''}`}>
              <div className="chat-bubble">{m.body}</div>
              <span className="chat-time">{formatDateTime(m.createdAt)}</span>
            </div>
          ))
        )}
      </div>

      {error && <div className="alert alert-error chat-alert">{error}</div>}
      {conversation.canSend ? (
        <form className="chat-composer" onSubmit={send}>
          <textarea
            className="input"
            rows={2}
            maxLength={BODY_MAX}
            placeholder="Nhập tin nhắn... (Enter để gửi, Shift + Enter để xuống dòng)"
            aria-label="Nội dung tin nhắn"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="btn btn-primary" disabled={sending || !text.trim()}>
            {sending ? 'Đang gửi...' : 'Gửi'}
          </button>
        </form>
      ) : (
        <p className="chat-composer text-muted">Hai bạn không còn là bạn bè nên không thể gửi tin nhắn mới.</p>
      )}
    </section>
  )
}
