import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import invitationApi from '@/api/invitationApi'
import jobApi from '@/api/jobApi'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import Pagination from '@/components/common/Pagination'
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

function InvitationRow({ item, busy, onViewCv, onWithdraw }) {
  const { candidate } = item
  const meta = [
    candidate.headline,
    candidate.level && labelOf(JOB_LEVELS, candidate.level),
    candidate.location && `📍 ${candidate.location}`,
  ].filter(Boolean)

  return (
    <li className={`invitation-item ${busy ? 'row-busy' : ''}`}>
      <span className="avatar avatar-md">{candidate.fullName.charAt(0)}</span>
      <div className="invitation-info">
        <strong>{candidate.fullName}</strong>
        {meta.length > 0 && <span className="text-muted">{meta.join(' · ')}</span>}
        <span className="text-muted small">
          Mời ứng tuyển <Link to={`/jobs/${item.job.id}`}>{item.job.title}</Link> · gửi ngày {formatDate(item.createdAt)}
          {item.sender && ` bởi ${item.sender.fullName}`}
        </span>
        <details className="invitation-message">
          <summary>Nội dung thư</summary>
          <p className="pre-line">{item.message}</p>
        </details>
      </div>
      <div className="actions invitation-actions">
        <InvitationBadge invitation={item} />
        {item.applicationId && (
          <Link to={`/recruiter/applicants/${item.applicationId}`} className="btn btn-outline btn-sm">
            Xem hồ sơ đã nộp
          </Link>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onViewCv}>
          📄 CV
        </button>
        {item.status === 'pending' && (
          <button className="btn btn-ghost btn-sm text-danger" disabled={busy} onClick={onWithdraw}>
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
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [viewing, setViewing] = useState(null) // ứng viên đang xem CV

  const { data: jobsPage } = useFetch(() => jobApi.getMine({ pageSize: 100 }), [])
  const { data, loading, error, reload } = useFetch(
    () => invitationApi.getSent({ status, jobId, keyword, page, pageSize: PAGE_SIZE }),
    [status, jobId, keyword, page],
  )

  const setParams = (changes) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    if (!('page' in changes)) next.delete('page')
    setSearchParams(next)
  }

  const withdraw = async (item) => {
    if (!window.confirm(`Thu hồi thư mời ứng tuyển vị trí "${item.job.title}" đã gửi tới ${item.candidate.fullName}?`))
      return
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

  return (
    <>
      <div className="page-header">
        <div>
          <h1>✉ Thư mời đã gửi</h1>
          <p className="text-muted">
            Thư mời ứng tuyển công ty đã gửi. Ứng viên nộp hồ sơ vào tin được mời thì thư chuyển sang “Đã ứng tuyển”.
          </p>
        </div>
        <Link to="/recruiter/talent-pool" className="btn btn-primary">
          🔎 Tìm ứng viên
        </Link>
      </div>

      <div className="segmented">
        {STATUS_TABS.map((t) => (
          <button key={t.value} className={status === t.value ? 'active' : ''} onClick={() => setParams({ status: t.value })}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card filter-bar">
        <label className="inline-field">
          <span>Tin tuyển dụng:</span>
          <select className="input" value={jobId} onChange={(e) => setParams({ jobId: e.target.value })}>
            <option value="">Tất cả tin</option>
            {(jobsPage?.results ?? []).map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </label>
        <form
          className="inline-field filter-keyword"
          onSubmit={(e) => {
            e.preventDefault()
            setParams({ q: search.trim() })
          }}
        >
          <input
            className="input"
            placeholder="Tìm theo tên ứng viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-outline">Tìm</button>
        </form>
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}
      {loading && !data && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}

      {data &&
        (data.results.length === 0 ? (
          <EmptyState
            title={status || jobId || keyword ? 'Không có thư mời phù hợp bộ lọc' : 'Công ty chưa gửi thư mời nào'}
            description="Tìm ứng viên công khai CV hoặc xem ứng viên phù hợp với từng tin để gửi thư mời ứng tuyển."
            action={
              <Link to="/recruiter/talent-pool" className="btn btn-outline">
                Tìm ứng viên
              </Link>
            }
          />
        ) : (
          <div className="card">
            <ul className="invitation-list">
              {data.results.map((item) => (
                <InvitationRow
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onViewCv={() => setViewing(item.candidate)}
                  onWithdraw={() => withdraw(item)}
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
          onChange={(p) => setParams({ page: String(p) })}
        />
      )}

      {viewing && <TalentCVModal candidate={viewing} onClose={() => setViewing(null)} />}
    </>
  )
}
