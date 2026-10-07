import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import applicationApi from '@/api/applicationApi'
import jobApi from '@/api/jobApi'
import { RecommendationBadge } from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import Pagination from '@/components/common/Pagination'
import ScoreCircle from '@/components/common/ScoreCircle'
import useFetch from '@/hooks/useFetch'
import { AI_RECOMMENDATION, APPLICATION_STATUS, FEATURES, PAGE_SIZE } from '@/utils/constants'
import { formatDate, getErrorMessage } from '@/utils/formatters'

const ORDERINGS = { newest: '-applied_at', oldest: 'applied_at' }
const byAiScore = (a, b) => (b.aiReview?.score ?? -1) - (a.aiReview?.score ?? -1)

// Ô chọn trạng thái: trạng thái hiện tại + các bước pipeline hợp lệ tiếp theo
function StatusSelect({ application, onChange }) {
  const options = [application.status, ...application.allowedTransitions]
  return (
    <select
      className="input input-sm"
      value={application.status}
      disabled={!application.allowedTransitions.length}
      onChange={(e) => onChange(application, e.target.value)}
    >
      {options.map((key) => (
        <option key={key} value={key}>
          {APPLICATION_STATUS[key]?.label ?? key}
        </option>
      ))}
    </select>
  )
}

export default function ApplicantsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const jobId = searchParams.get('jobId') ?? ''
  const status = searchParams.get('status') ?? ''
  const keyword = searchParams.get('q') ?? ''
  const sort = searchParams.get('sort') ?? (FEATURES.ai ? 'score' : 'newest')
  const page = Number(searchParams.get('page') ?? 1)
  const [search, setSearch] = useState(keyword)

  const { data: jobsPage, loading: loadingJobs } = useFetch(() => jobApi.getMine({ pageSize: 100 }), [])
  const {
    data,
    loading,
    error,
    setData,
    reload,
  } = useFetch(
    () =>
      applicationApi.list({
        jobId,
        status,
        keyword,
        ordering: ORDERINGS[sort] ?? ORDERINGS.newest,
        page,
        pageSize: PAGE_SIZE,
      }),
    [jobId, status, keyword, sort, page],
  )

  const [screening, setScreening] = useState(false)
  const [minScore, setMinScore] = useState(0)
  const [onlyPotential, setOnlyPotential] = useState(false)
  const [actionError, setActionError] = useState('')

  const setParams = (changes) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    if (!('page' in changes)) next.delete('page')
    setSearchParams(next)
  }

  if (loadingJobs) return <Loading />
  const jobs = jobsPage?.results ?? []
  if (!jobs.length) {
    return (
      <EmptyState
        title="Chưa có tin tuyển dụng"
        description="Đăng tin để bắt đầu nhận hồ sơ ứng viên."
        action={
          <Link to="/recruiter/jobs/new" className="btn btn-primary">
            Đăng tin mới
          </Link>
        }
      />
    )
  }

  const list = data?.results ?? []
  const replace = (updated) =>
    setData((page) => ({ ...page, results: page.results.map((a) => (a.id === updated.id ? updated : a)) }))

  const changeStatus = async (application, newStatus) => {
    let rejectionReason = ''
    if (newStatus === 'rejected') {
      const reason = window.prompt(`Lý do từ chối ${application.candidate.fullName} (không bắt buộc):`, '')
      if (reason === null) return
      rejectionReason = reason
    }
    setActionError('')
    try {
      replace(await applicationApi.updateStatus(application.id, newStatus, { rejectionReason }))
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  // ---- AI sàng lọc (chỉ có ở chế độ mock, giai đoạn sau nối với module AI của backend)
  const screened = list.filter((a) => a.aiReview)
  const potential = list.filter(
    (a) => a.aiReview?.recommendation === 'strong' && ['applied', 'screening'].includes(a.status),
  )

  const handleScreen = async () => {
    setScreening(true)
    setActionError('')
    try {
      await applicationApi.screenByJob(jobId)
      setParams({ sort: 'score' })
      reload()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setScreening(false)
    }
  }

  const invitePotential = async () => {
    if (!window.confirm(`Mời ${potential.length} ứng viên được AI đánh giá "Rất phù hợp" vào vòng phỏng vấn?`)) return
    try {
      const updated = await Promise.all(potential.map((a) => applicationApi.updateStatus(a.id, 'interview')))
      updated.forEach(replace)
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  const visible = FEATURES.ai
    ? list
        .filter((a) => !minScore || (a.aiReview && a.aiReview.score >= minScore))
        .filter((a) => !onlyPotential || a.aiReview?.recommendation === 'strong')
        .sort(sort === 'score' ? byAiScore : () => 0)
    : list

  const currentJob = jobs.find((j) => j.id === jobId)

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{FEATURES.ai ? 'Ứng viên & AI sàng lọc' : 'Ứng viên'}</h1>
          <p className="text-muted">
            {FEATURES.ai
              ? 'AI chấm điểm mức độ phù hợp giữa CV và yêu cầu tuyển dụng, xếp hạng hồ sơ tiềm năng'
              : 'Xem hồ sơ và chuyển ứng viên qua các vòng tuyển dụng'}
          </p>
        </div>
      </div>

      <div className="card filter-bar">
        <label className="inline-field">
          <span>Tin tuyển dụng:</span>
          <select className="input" value={jobId} onChange={(e) => setParams({ jobId: e.target.value })}>
            <option value="">Tất cả tin tuyển dụng</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.applicantCount})
              </option>
            ))}
          </select>
        </label>
        {FEATURES.ai && (
          <button className="btn btn-primary" onClick={handleScreen} disabled={screening || !jobId || !list.length}>
            {screening ? 'AI đang sàng lọc...' : screened.length ? '🤖 Sàng lọc lại bằng AI' : '🤖 Sàng lọc bằng AI'}
          </button>
        )}
      </div>

      {currentJob && (
        <p className="text-muted">
          Kỹ năng yêu cầu:{' '}
          {currentJob.skills.map((s) => (
            <span key={s} className="tag">
              {s}
            </span>
          ))}
        </p>
      )}

      {actionError && <div className="alert alert-error">{actionError}</div>}

      {FEATURES.ai && screened.length > 0 && (
        <div className="grid grid-4">
          <div className="card stat-card">
            <span className="text-muted">Đã sàng lọc</span>
            <strong>
              {screened.length}/{list.length}
            </strong>
          </div>
          {Object.entries(AI_RECOMMENDATION).map(([key, meta]) => (
            <div key={key} className="card stat-card">
              <span className="text-muted">{meta.label}</span>
              <strong className={`text-${meta.tone}`}>
                {screened.filter((a) => a.aiReview.recommendation === key).length}
              </strong>
            </div>
          ))}
        </div>
      )}

      {FEATURES.ai && potential.length > 0 && (
        <div className="alert alert-success">
          ✨ AI tìm thấy {potential.length} ứng viên tiềm năng chưa được mời phỏng vấn.{' '}
          <button className="btn btn-primary btn-sm" onClick={invitePotential}>
            Mời phỏng vấn
          </button>
        </div>
      )}

      <div className="card filter-bar">
        <select className="input" value={status} onChange={(e) => setParams({ status: e.target.value })}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(APPLICATION_STATUS).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>
        <form
          className="inline-field filter-keyword"
          onSubmit={(e) => {
            e.preventDefault()
            setParams({ q: search.trim() })
          }}
        >
          <input
            className="input"
            placeholder="Tìm theo tên, email, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-outline">Tìm</button>
        </form>
        {FEATURES.ai && (
          <>
            <label className="inline-field">
              <span>Điểm AI tối thiểu: {minScore}</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
              />
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={onlyPotential} onChange={(e) => setOnlyPotential(e.target.checked)} />
              Chỉ ứng viên AI đánh giá “Rất phù hợp”
            </label>
          </>
        )}
        <select className="input" value={sort} onChange={(e) => setParams({ sort: e.target.value })}>
          {FEATURES.ai && <option value="score">Sắp xếp: Điểm AI cao nhất</option>}
          <option value="newest">Sắp xếp: Mới nộp nhất</option>
          <option value="oldest">Sắp xếp: Nộp sớm nhất</option>
        </select>
      </div>

      {loading && !data && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}
      {data && (
        <>
          {FEATURES.ai && list.length > 0 && screened.length === 0 && jobId && (
            <div className="alert alert-info">
              Các hồ sơ chưa được AI đánh giá. Bấm “Sàng lọc bằng AI” để chấm điểm và xếp hạng tự động.
            </div>
          )}
          {visible.length === 0 ? (
            <EmptyState
              title={data.count ? 'Không có hồ sơ khớp bộ lọc' : 'Chưa có hồ sơ ứng tuyển'}
              description={data.count ? 'Thử bỏ bớt bộ lọc.' : undefined}
            />
          ) : (
            <div className="card table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ứng viên</th>
                    {!jobId && <th>Vị trí ứng tuyển</th>}
                    {FEATURES.ai && <th>Điểm AI</th>}
                    {FEATURES.ai && <th>Kỹ năng phù hợp</th>}
                    <th>Ngày nộp</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((a, index) => (
                    <tr key={a.id}>
                      <td className="text-muted">{(page - 1) * PAGE_SIZE + index + 1}</td>
                      <td>
                        <strong>{a.candidate.fullName}</strong>
                        <div className="text-muted">
                          {[a.candidate.headline, a.candidate.yearsOfExperience != null && `${a.candidate.yearsOfExperience} năm KN`]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </td>
                      {!jobId && <td>{a.job?.title}</td>}
                      {FEATURES.ai && (
                        <td>
                          {a.aiReview ? (
                            <div className="score-cell">
                              <ScoreCircle score={a.aiReview.score} size={44} showLabel={false} />
                              <RecommendationBadge value={a.aiReview.recommendation} />
                            </div>
                          ) : (
                            <span className="text-muted">Chưa lọc</span>
                          )}
                        </td>
                      )}
                      {FEATURES.ai && (
                        <td>
                          {a.aiReview ? (
                            <div className="tags">
                              {a.aiReview.matchedSkills.map((s) => (
                                <span key={s} className="tag tag-success">
                                  {s}
                                </span>
                              ))}
                              {a.aiReview.missingSkills.length > 0 && (
                                <span className="tag tag-muted">-{a.aiReview.missingSkills.length} thiếu</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      )}
                      <td>{formatDate(a.appliedAt)}</td>
                      <td>
                        <StatusSelect application={a} onChange={changeStatus} />
                      </td>
                      <td>
                        <Link to={`/recruiter/applicants/${a.id}`} className="btn btn-outline btn-sm">
                          Xem hồ sơ
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            count={data.count}
            onChange={(p) => setParams({ page: String(p) })}
          />
        </>
      )}
    </>
  )
}
