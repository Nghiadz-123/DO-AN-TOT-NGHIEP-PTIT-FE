import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronDown, CircleCheck, Eye, Mail, MapPin, Send, TriangleAlert, Wallet, X } from 'lucide-react'
import candidateApi from '@/api/candidateApi'
import invitationApi from '@/api/invitationApi'
import Badge from '@/components/common/Badge'
import CompanyLogo from '@/components/common/CompanyLogo'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import Pagination from '@/components/common/Pagination'
import { SkeletonCards } from '@/components/common/Skeleton'
import ApplyModal from '@/components/jobs/ApplyModal'
import useFetch from '@/hooks/useFetch'
import useInbox from '@/hooks/useInbox'
import { INVITATION_STATUS, PAGE_SIZE } from '@/utils/constants'
import { formatDate, formatSalary, getErrorMessage } from '@/utils/formatters'

const TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ phản hồi' },
  { value: 'accepted', label: 'Đã ứng tuyển' },
  { value: 'declined', label: 'Đã từ chối' },
]

function InvitationCard({ item, open, busy, onToggle, onApply, onDecline }) {
  const { job, sender } = item
  const pending = item.status === 'pending'
  const accepting = job.status === 'published'
  const unread = pending && !item.readAt
  const status = INVITATION_STATUS[item.status]
  const messageId = `invitation-message-${item.id}`

  return (
    <article className={`card invitation-card ${unread ? 'invitation-unread' : ''} ${busy ? 'row-busy' : ''}`}>
      <div className="invitation-card-head">
        <CompanyLogo name={job.company} src={job.companyLogo} />
        <div className="invitation-info">
          <div className="invitation-title">
            <h2>
              <Link to={`/jobs/${job.id}`}>{job.title}</Link>
            </h2>
            {unread && <Badge tone="danger">Mới</Badge>}
          </div>
          <span className="text-muted">{job.company}</span>
          <ul className="job-meta">
            {job.location && (
              <li>
                <MapPin />
                {job.location}
              </li>
            )}
            <li>
              <Wallet />
              {formatSalary(job.salaryMin, job.salaryMax, job.isSalaryNegotiable)}
            </li>
            <li>
              <Mail />
              Nhận ngày {formatDate(item.createdAt)}
              {sender && ` · ${sender.fullName}${sender.position ? ` (${sender.position})` : ''}`}
            </li>
          </ul>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div id={messageId} className="invitation-message">
        <p className={`pre-line ${open ? '' : 'clamp-2'}`}>{item.message}</p>
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm invitation-toggle"
          aria-expanded={open}
          aria-controls={messageId}
          onClick={onToggle}
        >
          <ChevronDown />
          {open ? 'Thu gọn' : 'Đọc thư'}
        </button>
        {pending && accepting && (
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={onApply}>
            <Send />
            Ứng tuyển ngay
          </button>
        )}
        {pending && !accepting && <Badge>Tin đã ngừng nhận hồ sơ</Badge>}
        {pending && (
          <button type="button" className="btn btn-ghost btn-sm text-danger" disabled={busy} onClick={onDecline}>
            <X />
            Từ chối
          </button>
        )}
        {item.status === 'accepted' && (
          <Link to="/my-applications" className="btn btn-outline btn-sm">
            Xem đơn ứng tuyển
          </Link>
        )}
      </div>
    </article>
  )
}

export default function InvitationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = TABS.some((t) => t.value === searchParams.get('status')) ? searchParams.get('status') : ''
  const page = Number(searchParams.get('page') ?? 1)
  const { refresh: refreshInbox } = useInbox()
  const [openId, setOpenId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [applying, setApplying] = useState(null) // thư đang mở hộp nộp hồ sơ
  const [declining, setDeclining] = useState(null) // thư đang chờ xác nhận từ chối
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')

  const { data: profile } = useFetch(() => candidateApi.getProfile(), [])
  const { data, loading, error, setData, reload } = useFetch(
    () => invitationApi.getMine({ status, page, pageSize: PAGE_SIZE }),
    [status, page],
  )

  const replace = (updated) =>
    setData((current) => ({ ...current, results: current.results.map((i) => (i.id === updated.id ? updated : i)) }))

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

  const toggle = (item) => {
    const opening = openId !== item.id
    setOpenId(opening ? item.id : null)
    if (opening && !item.readAt) {
      run(item, async () => {
        replace(await invitationApi.markRead(item.id))
        refreshInbox()
      })
    }
  }

  const confirmDecline = () => {
    const item = declining
    setDeclining(null)
    run(item, async () => {
      replace(await invitationApi.decline(item.id))
      refreshInbox()
    })
  }

  // Nộp hồ sơ xong backend tự chuyển thư sang "Đã ứng tuyển": tải lại danh sách để thấy trạng thái mới
  const onApplied = () => {
    setNotice(`Đã nộp hồ sơ vào vị trí "${applying.job.title}". Theo dõi trạng thái ở trang Đơn ứng tuyển.`)
    setApplying(null)
    reload()
    refreshInbox()
  }

  return (
    <div className="narrow stack">
      <div className="page-header">
        <div>
          <h1>Thư mời ứng tuyển</h1>
          <p className="text-muted">
            Nhà tuyển dụng xem CV công khai của bạn và mời bạn ứng tuyển vào tin đang tuyển. Nộp hồ sơ ngay từ thư mời,
            hoặc từ chối nếu vị trí chưa phù hợp.
          </p>
        </div>
      </div>

      {profile && !profile.isPublic && (
        <div className="alert alert-info">
          <Eye />
          <div className="alert-content">
            Bạn chưa công khai CV nên nhà tuyển dụng chỉ thấy hồ sơ của bạn khi bạn ứng tuyển.{' '}
            <Link to="/cv">Công khai CV</Link> để nhận thêm thư mời.
          </div>
        </div>
      )}

      <div className="segmented" role="group" aria-label="Lọc thư mời">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={status === t.value}
            onClick={() => setSearchParams(t.value ? { status: t.value } : {})}
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="alert alert-success" role="status">
          <CircleCheck />
          <div className="alert-content">{notice}</div>
        </div>
      )}
      {actionError && (
        <div className="alert alert-error" role="alert">
          <TriangleAlert />
          <div className="alert-content">{actionError}</div>
        </div>
      )}
      {loading && !data && <SkeletonCards count={2} className="stack" label="Đang tải thư mời" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data &&
        (data.results.length === 0 ? (
          <EmptyState
            icon={Mail}
            title={status ? 'Không có thư mời nào ở mục này' : 'Bạn chưa nhận được thư mời nào'}
            description="Công khai CV và cập nhật CV chính để nhà tuyển dụng dễ tìm thấy bạn."
            action={
              <Link to="/cv" className="btn btn-outline">
                Đến CV của tôi
              </Link>
            }
          />
        ) : (
          <div className={`stack ${loading ? 'is-refreshing' : ''}`}>
            {data.results.map((item) => (
              <InvitationCard
                key={item.id}
                item={item}
                open={openId === item.id}
                busy={busyId === item.id}
                onToggle={() => toggle(item)}
                onApply={() => {
                  setNotice('')
                  setApplying(item)
                }}
                onDecline={() => setDeclining(item)}
              />
            ))}
          </div>
        ))}

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          count={data.count}
          onChange={(p) => setSearchParams({ ...(status && { status }), page: String(p) })}
        />
      )}

      {applying && <ApplyModal job={applying.job} open onClose={() => setApplying(null)} onApplied={onApplied} />}

      <ConfirmDialog
        open={Boolean(declining)}
        title="Từ chối thư mời?"
        message={declining && `Từ chối thư mời ứng tuyển vị trí "${declining.job.title}" của ${declining.job.company}?`}
        confirmLabel="Từ chối thư mời"
        onConfirm={confirmDecline}
        onCancel={() => setDeclining(null)}
      />
    </div>
  )
}
