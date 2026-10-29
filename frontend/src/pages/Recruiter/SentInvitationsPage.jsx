import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Award, CalendarDays, ChevronDown, FileText, MapPin, Search, Send, TriangleAlert, Undo2, UserSearch } from 'lucide-react'
import invitationApi from '@/api/invitationApi'
import jobApi from '@/api/jobApi'
import ActiveFilters from '@/components/common/ActiveFilters'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import Pagination from '@/components/common/Pagination'
import { SkeletonCards } from '@/components/common/Skeleton'
import InvitationBadge from '@/components/invitations/InvitationBadge'
import TalentCVModal from '@/components/talents/TalentCVModal'
import useFetch from '@/hooks/useFetch'
import { JOB_LEVELS, PAGE_SIZE } from '@/utils/constants'
import { formatDate, getErrorMessage, labelOf } from '@/utils/formatters'

const STATUS_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ phản hồi' },
  { value: 'accepted', label: 'Đã ứng tuyển' },
  { value: 'declined', label: 'Đã từ chối' },
]

function InvitationRow({ item, open, busy, onToggle, onViewCv, onWithdraw }) {
  const { candidate } = item
  const messageId = `sent-invitation-${item.id}`

  return (
    <li className={`card invitation-card ${busy ? 'row-busy' : ''}`} aria-busy={busy}>
      <div className="invitation-card-head">
        <span className="avatar avatar-md" aria-hidden="true">
          {candidate.fullName.charAt(0)}
        </span>
        <div className="invitation-info">
          <div className="invitation-title">
            <h2>{candidate.fullName}</h2>
          </div>
          {candidate.headline && <span className="text-muted">{candidate.headline}</span>}
          <ul className="job-meta">
            {candidate.level && (
              <li>
                <Award />
                {labelOf(JOB_LEVELS, candidate.level)}
              </li>
            )}
            {candidate.location && (
              <li>
                <MapPin />
                {candidate.location}
              </li>
            )}
            <li>
              <CalendarDays />
              Gửi ngày {formatDate(item.createdAt)}
              {item.sender && ` · ${item.sender.fullName}`}
            </li>
          </ul>
          <p className="invitation-job small">
            Mời ứng tuyển <Link to={`/jobs/${item.job.id}`}>{item.job.title}</Link>
          </p>
        </div>
        <InvitationBadge invitation={item} />
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
        <button type="button" className="btn btn-ghost btn-sm" onClick={onViewCv}>
          <FileText />
          Xem CV
        </button>
        {item.applicationId && (
          <Link to={`/recruiter/applicants/${item.applicationId}`} className="btn btn-outline btn-sm">
            Xem hồ sơ đã nộp
          </Link>
        )}
        {item.status === 'pending' && (
          <button type="button" className="btn btn-ghost btn-sm text-danger" disabled={busy} onClick={onWithdraw}>
            <Undo2 />
            Thu hồi
          </button>
        )}
      </div>
    </li>
  )
}

export default function SentInvitationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = STATUS_TABS.some((t) => t.value === searchParams.get('status')) ? searchParams.get('status') : ''
  const jobId = searchParams.get('jobId') ?? ''
  const keyword = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? 1)
  const [search, setSearch] = useState(keyword)
  const [openId, setOpenId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [viewing, setViewing] = useState(null) // ứng viên đang xem CV
  const [withdrawing, setWithdrawing] = useState(null) // thư đang chờ xác nhận thu hồi

  const { data: jobsPage } = useFetch(() => jobApi.getMine({ pageSize: 100 }), [])
  const { data, loading, error, reload } = useFetch(
    () => invitationApi.getSent({ status, jobId, keyword, page, pageSize: PAGE_SIZE }),
    [status, jobId, keyword, page],
  )
  const jobs = jobsPage?.results ?? []

  const setParams = (changes) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    if (!('page' in changes)) next.delete('page')
    setSearchParams(next)
  }

  const confirmWithdraw = async () => {
    const item = withdrawing
    setWithdrawing(null)
    setBusyId(item.id)
    setActionError('')
    try {
      await invitationApi.withdraw(item.id)
      reload()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const activeFilters = [
    jobId && { key: 'jobId', label: 'Tin', value: jobs.find((j) => j.id === jobId)?.title ?? 'Tin đã chọn' },
    keyword && { key: 'q', label: 'Từ khóa', value: keyword },
  ].filter(Boolean)

  const clearFilters = () => {
    setSearch('')
    setParams({ jobId: '', q: '' })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Thư mời đã gửi</h1>
          <p className="text-muted">
            Thư mời ứng tuyển công ty đã gửi. Ứng viên nộp hồ sơ vào tin được mời thì thư chuyển sang “Đã ứng tuyển”.
          </p>
        </div>
        <Link to="/recruiter/talent-pool" className="btn btn-primary">
          <UserSearch />
          Tìm ứng viên
        </Link>
      </div>

      <div className="card toolbar">
        <div className="segmented segmented-scroll" role="group" aria-label="Lọc thư mời theo trạng thái">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={status === t.value}
              onClick={() => setParams({ status: t.value })}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="toolbar-row">
          <div className="form-group">
            <label htmlFor="sent-job">Tin tuyển dụng</label>
            <select id="sent-job" className="input" value={jobId} onChange={(e) => setParams({ jobId: e.target.value })}>
              <option value="">Tất cả tin</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>
          <form
            className="toolbar-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              setParams({ q: search.trim() })
            }}
          >
            <label className="input-icon">
              <Search />
              <span className="visually-hidden">Tìm theo tên ứng viên</span>
              <input
                type="search"
                className="input"
                placeholder="Tìm theo tên ứng viên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button type="submit" className="btn btn-outline">
              Tìm
            </button>
          </form>
        </div>
      </div>

      <ActiveFilters
        items={activeFilters}
        onRemove={(key) => {
          if (key === 'q') setSearch('')
          setParams({ [key]: '' })
        }}
        onClear={clearFilters}
      />

      {actionError && (
        <div className="alert alert-error" role="alert">
          <TriangleAlert />
          <div className="alert-content">{actionError}</div>
        </div>
      )}
      {loading && !data && <SkeletonCards count={3} className="stack" label="Đang tải thư mời" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data &&
        (data.results.length === 0 ? (
          <EmptyState
            icon={Send}
            title={status || jobId || keyword ? 'Không có thư mời phù hợp bộ lọc' : 'Công ty chưa gửi thư mời nào'}
            description="Tìm ứng viên công khai CV hoặc xem ứng viên phù hợp với từng tin để gửi thư mời ứng tuyển."
            action={
              <Link to="/recruiter/talent-pool" className="btn btn-outline">
                Tìm ứng viên
              </Link>
            }
          />
        ) : (
          <ul className={`invitation-sent-list ${loading ? 'is-refreshing' : ''}`}>
            {data.results.map((item) => (
              <InvitationRow
                key={item.id}
                item={item}
                open={openId === item.id}
                busy={busyId === item.id}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                onViewCv={() => setViewing(item.candidate)}
                onWithdraw={() => setWithdrawing(item)}
              />
            ))}
          </ul>
        ))}

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          count={data.count}
          onChange={(p) => setParams({ page: String(p) })}
        />
      )}

      {viewing && <TalentCVModal candidate={viewing} onClose={() => setViewing(null)} />}

      <ConfirmDialog
        open={Boolean(withdrawing)}
        title="Thu hồi thư mời?"
        message={
          withdrawing &&
          `Thu hồi thư mời ứng tuyển vị trí "${withdrawing.job.title}" đã gửi tới ${withdrawing.candidate.fullName}?`
        }
        confirmLabel="Thu hồi thư mời"
        onConfirm={confirmWithdraw}
        onCancel={() => setWithdrawing(null)}
      />
    </>
  )
}
