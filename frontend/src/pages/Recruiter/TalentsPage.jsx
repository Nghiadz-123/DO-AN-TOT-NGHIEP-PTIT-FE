import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import jobApi from '@/api/jobApi'
import talentApi from '@/api/talentApi'
import Badge, { JobStatusBadge } from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import Pagination from '@/components/common/Pagination'
import ScoreCircle from '@/components/common/ScoreCircle'
import InvitationBadge from '@/components/invitations/InvitationBadge'
import InviteModal from '@/components/invitations/InviteModal'
import TalentCVModal from '@/components/talents/TalentCVModal'
import useFetch from '@/hooks/useFetch'
import { JOB_LEVELS, PAGE_SIZE } from '@/utils/constants'
import { formatDate, formatFileSize, labelOf } from '@/utils/formatters'

const SCORE_FILTERS = [
  { value: '', label: 'Mọi mức điểm' },
  { value: '50', label: 'Từ 50 điểm' },
  { value: '70', label: 'Từ 70 điểm' },
  { value: '85', label: 'Từ 85 điểm' },
]

// Khớp trọng số backend talents/matching.py WEIGHTS
const CRITERIA = [
  { key: 'skills', label: 'Kỹ năng', max: 60 },
  { key: 'experience', label: 'Kinh nghiệm', max: 20 },
  { key: 'level', label: 'Cấp bậc', max: 10 },
  { key: 'location', label: 'Địa điểm', max: 10 },
]

// Thư mời ứng tuyển tin đang xem: đã gửi thì hiện trạng thái; ứng viên đã nộp hồ sơ vào tin thì không cần mời
function InviteAction({ talent, onInvite }) {
  if (talent.invitation) {
    return (
      <>
        <span className="text-muted small">Đã gửi thư mời</span>
        <InvitationBadge invitation={talent.invitation} />
      </>
    )
  }
  if (talent.applicationId) return null
  return (
    <button className="btn btn-primary btn-sm" onClick={onInvite}>
      ✉ Gửi thư mời
    </button>
  )
}

function TalentCard({ talent, rank, onViewCv, onInvite }) {
  const { candidate, cv } = talent
  const meta = [
    candidate.yearsOfExperience != null && `${candidate.yearsOfExperience} năm kinh nghiệm`,
    candidate.level && labelOf(JOB_LEVELS, candidate.level),
    candidate.location && `📍 ${candidate.location}`,
  ].filter(Boolean)

  return (
    <article className="card talent-card">
      <div className="talent-card-head">
        <span className="avatar avatar-lg">{candidate.fullName.charAt(0)}</span>
        <div className="talent-card-info">
          <h3>
            <span className="text-muted">#{rank}</span> {candidate.fullName}
          </h3>
          {candidate.headline && <p className="text-primary">{candidate.headline}</p>}
          <div className="job-meta text-muted">
            {meta.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
          <div className="actions talent-badges">
            {candidate.isOpenToWork && <Badge tone="success">Đang tìm việc</Badge>}
            {talent.applicationId && (
              <Link to={`/recruiter/applicants/${talent.applicationId}`}>
                <Badge tone="info">Đã ứng tuyển tin này →</Badge>
              </Link>
            )}
          </div>
        </div>
        <ScoreCircle score={talent.score} size={84} />
      </div>

      <div className="talent-breakdown">
        {CRITERIA.map((c) => (
          <div key={c.key} className="analysis-section">
            <div className="analysis-section-head">
              <span>{c.label}</span>
              <strong>
                {talent.breakdown[c.key]}/{c.max}
              </strong>
            </div>
            <div className="progress">
              <div className="progress-bar progress-bar-primary" style={{ width: `${(talent.breakdown[c.key] / c.max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="tags">
        {talent.matchedSkills.map((s) => (
          <span key={s} className="tag tag-success">
            ✓ {s}
          </span>
        ))}
        {talent.missingSkills.map((s) => (
          <span key={s} className="tag tag-muted" title="Chưa thấy trong CV / hồ sơ">
            {s}
          </span>
        ))}
      </div>

      <ul className="match-reasons">
        {talent.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {candidate.summary && <p className="talent-summary">{candidate.summary}</p>}

      <div className="talent-card-foot">
        <div className="actions">
          <button className="btn btn-outline btn-sm" onClick={onViewCv}>
            📄 Xem CV
          </button>
          <span className="text-muted small">
            {cv.title} · {formatFileSize(cv.fileSize)} · cập nhật {formatDate(cv.updatedAt)}
          </span>
        </div>
        <div className="actions">
          <InviteAction talent={talent} onInvite={onInvite} />
        </div>
      </div>
    </article>
  )
}

export default function TalentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = searchParams.get('q') ?? ''
  const minScore = searchParams.get('minScore') ?? ''
  const hideApplied = searchParams.get('hideApplied') === '1'
  const page = Number(searchParams.get('page') ?? 1)
  const [search, setSearch] = useState(keyword)
  const [viewing, setViewing] = useState(null) // ứng viên đang xem CV
  const [inviting, setInviting] = useState(null) // ứng viên đang mở hộp gửi thư mời
  const [notice, setNotice] = useState('')

  const { data: jobsPage, loading: loadingJobs } = useFetch(() => jobApi.getMine({ pageSize: 100 }), [])
  const jobs = jobsPage?.results ?? []
  // Mặc định: tin đang tuyển mới nhất
  const jobId = searchParams.get('jobId') || (jobs.find((j) => j.status === 'published') ?? jobs[0])?.id || ''
  const job = jobs.find((j) => j.id === jobId)

  const { data, loading, error, setData } = useFetch(
    () =>
      jobId
        ? talentApi.getSuggested(jobId, { keyword, minScore, hideApplied, page, pageSize: PAGE_SIZE })
        : Promise.resolve(null),
    [jobId, keyword, minScore, hideApplied, page],
  )

  const setParams = (changes) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    if (!('page' in changes)) next.delete('page')
    setSearchParams(next)
  }

  const onSent = (invitation) => {
    // Hộp gửi thư cho chọn tin khác: chỉ gắn vào thẻ khi thư thuộc tin đang xem
    if (invitation.job.id === jobId) {
      setData((current) => ({
        ...current,
        results: current.results.map((t) => (t.candidate.id === inviting.candidate.id ? { ...t, invitation } : t)),
      }))
    }
    setNotice(`Đã gửi thư mời ứng tuyển vị trí "${invitation.job.title}" tới ${inviting.candidate.fullName}.`)
    setInviting(null)
  }

  if (loadingJobs) return <Loading />
  if (!jobs.length) {
    return (
      <EmptyState
        title="Chưa có tin tuyển dụng"
        description="Đăng tin kèm kỹ năng yêu cầu để hệ thống tìm ứng viên có CV phù hợp."
        action={
          <Link to="/recruiter/jobs/new" className="btn btn-primary">
            Đăng tin mới
          </Link>
        }
      />
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>🎯 Ứng viên phù hợp</h1>
          <p className="text-muted">
            CV của ứng viên khớp với yêu cầu tin tuyển dụng, xếp theo điểm phù hợp. Gửi thư mời để ứng viên nộp hồ sơ vào
            tin.
          </p>
        </div>
      </div>

      <div className="card filter-bar">
        <label className="inline-field">
          <span>Tin tuyển dụng:</span>
          <select className="input" value={jobId} onChange={(e) => setParams({ jobId: e.target.value })}>
            {jobs.map((j) => (
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
            placeholder="Tìm theo tên, tiêu đề hồ sơ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-outline">Tìm</button>
        </form>
        <select className="input" value={minScore} onChange={(e) => setParams({ minScore: e.target.value })}>
          {SCORE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={hideApplied}
            onChange={(e) => setParams({ hideApplied: e.target.checked ? '1' : '' })}
          />
          Ẩn ứng viên đã ứng tuyển
        </label>
      </div>

      {job && (
        <div className="text-muted job-meta">
          <JobStatusBadge status={job.status} />
          <span>Kỹ năng yêu cầu:</span>
          <span className="tags">
            {job.skills.map((s) => (
              <span key={s} className="tag">
                {s}
              </span>
            ))}
          </span>
          <Link to={`/recruiter/jobs/${job.id}/edit`}>Sửa kỹ năng</Link>
        </div>
      )}

      <div className="alert alert-info">
        Chỉ hiển thị ứng viên công khai CV hoặc đã ứng tuyển vào công ty. Điểm được tính từ CV chính và hồ sơ của ứng
        viên: kỹ năng (60), kinh nghiệm (20), cấp bậc (10), địa điểm (10).
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {loading && !data && <Loading text="Đang so khớp CV với yêu cầu tuyển dụng..." />}
      {error && <div className="alert alert-error">{error}</div>}

      {data &&
        (data.results.length === 0 ? (
          <EmptyState
            title="Chưa tìm thấy ứng viên phù hợp"
            description={
              keyword || minScore || hideApplied
                ? 'Thử bỏ bớt bộ lọc.'
                : 'Chưa có CV nào khớp kỹ năng yêu cầu của tin này. Thử bổ sung kỹ năng hoặc tên gọi khác của kỹ năng.'
            }
          />
        ) : (
          <div className="talent-list">
            {data.results.map((talent, index) => (
              <TalentCard
                key={talent.candidate.id}
                talent={talent}
                rank={(data.page - 1) * PAGE_SIZE + index + 1}
                onViewCv={() => setViewing(talent.candidate)}
                onInvite={() => {
                  setNotice('')
                  setInviting(talent)
                }}
              />
            ))}
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
      {inviting && (
        <InviteModal candidate={inviting.candidate} jobId={jobId} onClose={() => setInviting(null)} onSent={onSent} />
      )}
    </>
  )
}
