import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import candidateApi from '@/api/candidateApi'
import invitationApi from '@/api/invitationApi'
import Badge from '@/components/common/Badge'
import CompanyLogo from '@/components/common/CompanyLogo'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import Pagination from '@/components/common/Pagination'
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

  return (
    <article className={`card invitation-card ${unread ? 'invitation-unread' : ''} ${busy ? 'row-busy' : ''}`}>
      <div className="invitation-card-head">
        <CompanyLogo name={job.company} src={job.companyLogo} />
        <div className="invitation-info">
          <div className="invitation-title">
            <Link to={`/jobs/${job.id}`}>
              <strong>{job.title}</strong>
            </Link>
            {unread && <Badge tone="danger">Mới</Badge>}
          </div>
          <span className="text-muted">{job.company}</span>
          <div className="job-meta text-muted small">
            {job.location && <span>📍 {job.location}</span>}
            <span>💰 {formatSalary(job.salaryMin, job.salaryMax, job.isSalaryNegotiable)}</span>
            <span>
              ✉ Nhận ngày {formatDate(item.createdAt)}
              {sender && ` · ${sender.fullName}${sender.position ? ` (${sender.position})` : ''}`}
            </span>
          </div>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="invitation-message">
        <p className={`pre-line ${open ? '' : 'clamp-2'}`}>{item.message}</p>
      </div>

      <div className="actions">
        <button className="btn btn-ghost btn-sm" onClick={onToggle}>
          {open ? 'Thu gọn' : 'Đọc thư'}
        </button>
        {pending && accepting && (
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={onApply}>
            Ứng tuyển ngay
          </button>
        )}
        {pending && !accepting && <Badge>Tin đã ngừng nhận hồ sơ</Badge>}
        {pending && (
          <button className="btn btn-ghost btn-sm text-danger" disabled={busy} onClick={onDecline}>
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

  const decline = (item) => {
    if (!window.confirm(`Từ chối thư mời ứng tuyển vị trí "${item.job.title}" của ${item.job.company}?`)) return
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
    <div className="narrow">
      <div className="page-header">
        <div>
          <h1>✉ Thư mời ứng tuyển</h1>
          <p className="text-muted">
            Nhà tuyển dụng xem CV công khai của bạn và mời bạn ứng tuyển vào tin đang tuyển. Nộp hồ sơ ngay từ thư mời,
            hoặc từ chối nếu vị trí chưa phù hợp.
          </p>
        </div>
      </div>

      {profile && !profile.isPublic && (
        <div className="alert alert-info">
          Bạn chưa công khai CV nên nhà tuyển dụng chỉ thấy hồ sơ của bạn khi bạn ứng tuyển.{' '}
          <Link to="/cv">Công khai CV</Link> để nhận thêm thư mời.
        </div>
      )}

      <div className="segmented">
        {TABS.map((t) => (
          <button
            key={t.value}
            className={status === t.value ? 'active' : ''}
            onClick={() => setSearchParams(t.value ? { status: t.value } : {})}
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {actionError && <div className="alert alert-error">{actionError}</div>}
      {loading && !data && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}

      {data &&
        (data.results.length === 0 ? (
          <EmptyState
            title={status ? 'Không có thư mời nào ở mục này' : 'Bạn chưa nhận được thư mời nào'}
            description="Công khai CV và cập nhật CV chính để nhà tuyển dụng dễ tìm thấy bạn."
            action={
              <Link to="/cv" className="btn btn-outline">
                Đến CV của tôi
              </Link>
            }
          />
        ) : (
          <div className="stack">
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
                onDecline={() => decline(item)}
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
    </div>
  )
}
