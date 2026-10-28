import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness, Check, CircleCheck, Info, Pencil, Plus, Search, Send, Target } from 'lucide-react'
import jobApi from '@/api/jobApi'
import talentApi from '@/api/talentApi'
import ActiveFilters from '@/components/common/ActiveFilters'
import Badge, { JobStatusBadge } from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import Pagination from '@/components/common/Pagination'
import ScoreCircle from '@/components/common/ScoreCircle'
import { SkeletonCards, SkeletonLines } from '@/components/common/Skeleton'
import InvitationBadge from '@/components/invitations/InvitationBadge'
import InviteModal from '@/components/invitations/InviteModal'
import TalentCard from '@/components/talents/TalentCard'
import TalentCVModal from '@/components/talents/TalentCVModal'
import useFetch from '@/hooks/useFetch'
import { PAGE_SIZE } from '@/utils/constants'

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
    <button type="button" className="btn btn-primary btn-sm" onClick={onInvite}>
      <Send />
      Gửi thư mời
    </button>
  )
}

function MatchDetails({ talent }) {
  return (
    <>
      <div className="talent-breakdown">
        {CRITERIA.map((c) => (
          <div key={c.key} className="analysis-section">
            <div className="analysis-section-head">
              <span>{c.label}</span>
              <strong className="tabular-nums">
                {talent.breakdown[c.key]}/{c.max}
              </strong>
            </div>
            <div className="progress" aria-hidden="true">
              <div className="progress-bar" style={{ width: `${(talent.breakdown[c.key] / c.max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {(talent.matchedSkills.length > 0 || talent.missingSkills.length > 0) && (
        <div className="talent-skills">
          {talent.matchedSkills.length > 0 && (
            <div className="talent-skill-row">
              <span className="talent-skill-label">Khớp yêu cầu</span>
              <ul className="tags">
                {talent.matchedSkills.map((s) => (
                  <li key={s} className="tag tag-success">
                    <Check />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {talent.missingSkills.length > 0 && (
            <div className="talent-skill-row">
              <span className="talent-skill-label">Chưa thấy trong CV</span>
              <ul className="tags">
                {talent.missingSkills.map((s) => (
                  <li key={s} className="tag tag-muted">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {talent.reasons.length > 0 && (
        <ul className="match-reasons">
          {talent.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </>
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

  const { data: jobsPage, loading: loadingJobs, error: jobsError, reload: reloadJobs } = useFetch(
    () => jobApi.getMine({ pageSize: 100 }),
    [],
  )
  const jobs = jobsPage?.results ?? []
  // Mặc định: tin đang tuyển mới nhất
  const jobId = searchParams.get('jobId') || (jobs.find((j) => j.status === 'published') ?? jobs[0])?.id || ''
  const job = jobs.find((j) => j.id === jobId)

  const { data, loading, error, setData, reload } = useFetch(
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

  const header = (
    <div className="page-header">
      <div>
        <h1>Ứng viên phù hợp</h1>
        <p className="text-muted">
          CV của ứng viên khớp với yêu cầu tin tuyển dụng, xếp theo điểm phù hợp. Gửi thư mời để ứng viên nộp hồ sơ vào
          tin.
        </p>
      </div>
    </div>
  )

  if (loadingJobs) {
    return (
      <>
        {header}
        <div className="card">
          <SkeletonLines lines={3} label="Đang tải tin tuyển dụng" />
        </div>
      </>
    )
  }
  if (jobsError) {
    return (
      <>
        {header}
        <ErrorState message={jobsError} onRetry={reloadJobs} />
      </>
    )
  }
  if (!jobs.length) {
    return (
      <>
        {header}
        <EmptyState
          icon={BriefcaseBusiness}
          title="Chưa có tin tuyển dụng"
          description="Đăng tin kèm kỹ năng yêu cầu để hệ thống tìm ứng viên có CV phù hợp."
          action={
            <Link to="/recruiter/jobs/new" className="btn btn-primary">
              <Plus />
              Đăng tin mới
            </Link>
          }
        />
      </>
    )
  }

  const activeFilters = [
    keyword && { key: 'q', label: 'Từ khóa', value: keyword },
    minScore && { key: 'minScore', label: 'Điểm', value: SCORE_FILTERS.find((f) => f.value === minScore)?.label ?? minScore },
    hideApplied && { key: 'hideApplied', label: 'Ẩn', value: 'ứng viên đã ứng tuyển' },
  ].filter(Boolean)

  const clearFilters = () => {
    setSearch('')
    setParams({ q: '', minScore: '', hideApplied: '' })
  }

  return (
    <>
      {header}

      <div className="card toolbar">
        <div className="toolbar-fields">
          <div className="form-group toolbar-field-wide">
            <label htmlFor="talent-job">Tin tuyển dụng</label>
            <select id="talent-job" className="input" value={jobId} onChange={(e) => setParams({ jobId: e.target.value })}>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="talent-score">Điểm phù hợp</label>
            <select
              id="talent-score"
              className="input"
              value={minScore}
              onChange={(e) => setParams({ minScore: e.target.value })}
            >
              {SCORE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
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
            <span className="visually-hidden">Tìm theo tên, tiêu đề hồ sơ</span>
            <input
              type="search"
              className="input"
              placeholder="Tìm theo tên, tiêu đề hồ sơ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-outline">
            Tìm
          </button>
        </form>
        <label className="switch">
          <input
            type="checkbox"
            role="switch"
            checked={hideApplied}
            onChange={(e) => setParams({ hideApplied: e.target.checked ? '1' : '' })}
          />
          <span>Ẩn ứng viên đã ứng tuyển</span>
        </label>
      </div>

      {job && (
        <div className="skill-summary">
          <JobStatusBadge status={job.status} />
          <span className="text-muted small">Kỹ năng yêu cầu:</span>
          {job.skills.length ? (
            <ul className="tags">
              {job.skills.map((s) => (
                <li key={s} className="tag">
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-muted small">Tin chưa có kỹ năng yêu cầu.</span>
          )}
          <Link to={`/recruiter/jobs/${job.id}/edit`} className="btn btn-ghost btn-sm">
            <Pencil />
            Sửa kỹ năng
          </Link>
        </div>
      )}

      <div className="alert alert-info">
        <Info />
        <div className="alert-content">
          Chỉ hiển thị ứng viên công khai CV hoặc đã ứng tuyển vào công ty. Điểm được tính từ CV chính và hồ sơ của ứng
          viên: kỹ năng (60), kinh nghiệm (20), cấp bậc (10), địa điểm (10).
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

      {notice && (
        <div className="alert alert-success" role="status">
          <CircleCheck />
          <div className="alert-content">{notice}</div>
        </div>
      )}
      {loading && !data && (
        <SkeletonCards count={3} className="talent-list" label="Đang so khớp CV với yêu cầu tuyển dụng" />
      )}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data &&
        (data.results.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Chưa tìm thấy ứng viên phù hợp"
            description={
              activeFilters.length
                ? 'Thử bỏ bớt bộ lọc.'
                : 'Chưa có CV nào khớp kỹ năng yêu cầu của tin này. Thử bổ sung kỹ năng hoặc tên gọi khác của kỹ năng.'
            }
            action={
              activeFilters.length > 0 ? (
                <button type="button" className="btn btn-outline" onClick={clearFilters}>
                  Xóa bộ lọc
                </button>
              ) : (
                <Link to={`/recruiter/jobs/${jobId}/edit`} className="btn btn-outline">
                  <Pencil />
                  Sửa kỹ năng của tin
                </Link>
              )
            }
          />
        ) : (
          <div className={`talent-list ${loading ? 'is-refreshing' : ''}`}>
            {data.results.map((talent, index) => (
              <TalentCard
                key={talent.candidate.id}
                talent={talent}
                rank={(data.page - 1) * PAGE_SIZE + index + 1}
                onViewCv={() => setViewing(talent.candidate)}
                aside={<ScoreCircle score={talent.score} size={84} />}
                badges={
                  (talent.candidate.isOpenToWork || talent.applicationId) && (
                    <>
                      {talent.candidate.isOpenToWork && <Badge tone="success">Đang tìm việc</Badge>}
                      {talent.applicationId && (
                        <Link to={`/recruiter/applicants/${talent.applicationId}`} className="badge badge-info badge-link">
                          Đã ứng tuyển tin này
                          <ArrowRight />
                        </Link>
                      )}
                    </>
                  )
                }
                actions={
                  <InviteAction
                    talent={talent}
                    onInvite={() => {
                      setNotice('')
                      setInviting(talent)
                    }}
                  />
                }
              >
                <MatchDetails talent={talent} />
              </TalentCard>
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
