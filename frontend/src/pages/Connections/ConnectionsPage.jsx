import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import connectionApi from '@/api/connectionApi'
import Badge from '@/components/common/Badge'
import CountBadge from '@/components/common/CountBadge'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import Pagination from '@/components/common/Pagination'
import { ParticipantAvatar } from '@/components/connections/Participant'
import useAuth from '@/hooks/useAuth'
import useFetch from '@/hooks/useFetch'
import useInbox from '@/hooks/useInbox'
import useOpenChat from '@/hooks/useOpenChat'
import { CONNECTION_STATUS, ROLES } from '@/utils/constants'
import { formatDate, getErrorMessage, participantSubtitle } from '@/utils/formatters'

const PAGE_SIZE = 20

const TABS = {
  received: {
    label: 'Lời mời đã nhận',
    fetch: (params) => connectionApi.getRequests({ ...params, box: 'received' }),
    empty: 'Chưa có lời mời kết bạn nào đang chờ bạn phản hồi.',
  },
  friends: {
    label: 'Bạn bè',
    fetch: connectionApi.getFriends,
    empty: 'Bạn chưa kết bạn với ai.',
  },
  sent: {
    label: 'Lời mời đã gửi',
    fetch: (params) => connectionApi.getRequests({ ...params, box: 'sent' }),
    empty: 'Bạn chưa gửi lời mời kết bạn nào.',
  },
}

// Ứng viên nhận lời mời; nhà tuyển dụng gửi lời mời (từ trang Ứng viên phù hợp)
const TABS_BY_ROLE = { [ROLES.CANDIDATE]: ['received', 'friends'], [ROLES.RECRUITER]: ['friends', 'sent'] }

function ConnectionRow({ item, busy, onAccept, onDecline, onRemove, onChat }) {
  const { user, status, direction } = item
  const pendingReceived = status === 'pending' && direction === 'received'

  return (
    <li className={`person-row ${busy ? 'row-busy' : ''}`}>
      <ParticipantAvatar user={user} />
      <div className="person-info">
        <strong>{user.fullName}</strong>
        {participantSubtitle(user) && <div className="text-muted">{participantSubtitle(user)}</div>}
        <div className="text-muted small">
          {status === 'accepted'
            ? `Kết bạn từ ${formatDate(item.respondedAt)}`
            : `${direction === 'sent' ? 'Đã gửi' : 'Nhận'} lời mời ngày ${formatDate(item.createdAt)}`}
          {item.job && (
            <>
              {' · Về vị trí '}
              {user.role === ROLES.RECRUITER ? <Link to={`/jobs/${item.job.id}`}>{item.job.title}</Link> : item.job.title}
            </>
          )}
        </div>
        {item.message && status !== 'accepted' && <p className="request-message">{item.message}</p>}
      </div>
      <div className="actions person-actions">
        {pendingReceived && (
          <>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={onAccept}>
              Chấp nhận
            </button>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={onDecline}>
              Từ chối
            </button>
          </>
        )}
        {status === 'pending' && direction === 'sent' && (
          <>
            <Badge tone="warning">{CONNECTION_STATUS.pending.label}</Badge>
            <button className="btn btn-ghost btn-sm text-danger" disabled={busy} onClick={onRemove}>
              Hủy lời mời
            </button>
          </>
        )}
        {status === 'declined' && <Badge>{CONNECTION_STATUS.declined.label}</Badge>}
        {status === 'accepted' && (
          <>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={onChat}>
              💬 Nhắn tin
            </button>
            <button className="btn btn-ghost btn-sm text-danger" disabled={busy} onClick={onRemove}>
              Hủy kết bạn
            </button>
          </>
        )}
      </div>
    </li>
  )
}

export default function ConnectionsPage() {
  const { user } = useAuth()
  const { summary, refresh: refreshInbox } = useInbox()
  const openChat = useOpenChat()
  const tabs = TABS_BY_ROLE[user.role] ?? ['friends']
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = tabs.includes(searchParams.get('tab')) ? searchParams.get('tab') : tabs[0]
  const page = Number(searchParams.get('page') ?? 1)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  const { data, loading, error, setData } = useFetch(() => TABS[tab].fetch({ page, pageSize: PAGE_SIZE }), [tab, page])

  const replace = (updated) =>
    setData((current) => ({ ...current, results: current.results.map((c) => (c.id === updated.id ? updated : c)) }))
  const drop = (item) =>
    setData((current) => ({ ...current, count: current.count - 1, results: current.results.filter((c) => c.id !== item.id) }))

  const run = async (item, task) => {
    setBusyId(item.id)
    setActionError('')
    try {
      await task()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const respond = (item, action) =>
    run(item, async () => {
      replace(await connectionApi[action](item.id))
      refreshInbox()
    })

  const remove = (item) => {
    const question =
      item.status === 'accepted'
        ? `Hủy kết bạn với ${item.user.fullName}? Hai bạn sẽ không nhắn tin được cho nhau nữa (vẫn xem được tin nhắn cũ).`
        : `Hủy lời mời kết bạn đã gửi tới ${item.user.fullName}?`
    if (!window.confirm(question)) return
    run(item, async () => {
      await connectionApi.remove(item.id)
      drop(item)
    })
  }

  return (
    <div className="narrow">
      <div className="page-header">
        <div>
          <h1>🤝 Kết nối</h1>
          <p className="text-muted">
            {user.role === ROLES.RECRUITER
              ? 'Ứng viên đã kết bạn và lời mời bạn đã gửi. Tìm thêm ứng viên ở trang Ứng viên phù hợp.'
              : 'Nhà tuyển dụng thấy CV của bạn phù hợp sẽ gửi lời mời kết bạn tại đây. Kết bạn xong hai bên nhắn tin trực tiếp.'}
          </p>
        </div>
        {user.role === ROLES.RECRUITER && (
          <Link to="/recruiter/talents" className="btn btn-primary">
            🎯 Tìm ứng viên phù hợp
          </Link>
        )}
      </div>

      <div className="segmented">
        {tabs.map((key) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setSearchParams({ tab: key })}>
            {TABS[key].label}
            {key === 'received' && <CountBadge count={summary.pendingRequests} label="lời mời đang chờ" />}
          </button>
        ))}
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}
      {loading && !data && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}

      {data &&
        (data.results.length === 0 ? (
          <EmptyState
            title={TABS[tab].empty}
            description={
              user.role === ROLES.CANDIDATE && tab === 'received' ? (
                <>
                  Bật “Cho phép nhà tuyển dụng tìm thấy hồ sơ” trong <Link to="/profile">Hồ sơ cá nhân</Link> và cập
                  nhật <Link to="/cv">CV chính</Link> để nhà tuyển dụng tìm thấy bạn.
                </>
              ) : undefined
            }
          />
        ) : (
          <div className="card">
            <ul className="person-list">
              {data.results.map((item) => (
                <ConnectionRow
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onAccept={() => respond(item, 'accept')}
                  onDecline={() => respond(item, 'decline')}
                  onRemove={() => remove(item)}
                  onChat={() => run(item, () => openChat(item.user.id))}
                />
              ))}
            </ul>
          </div>
        ))}

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          count={data.count}
          onChange={(p) => setSearchParams({ tab, page: String(p) })}
        />
      )}
    </div>
  )
}
