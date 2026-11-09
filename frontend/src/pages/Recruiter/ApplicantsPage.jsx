import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BriefcaseBusiness, Plus, RefreshCw, Search, Sparkles, TriangleAlert, Users } from 'lucide-react'
import applicationApi from '@/api/applicationApi'
import jobApi from '@/api/jobApi'
import ActiveFilters from '@/components/common/ActiveFilters'
import { RecommendationBadge } from '@/components/common/Badge'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import Pagination from '@/components/common/Pagination'
import ScoreCircle from '@/components/common/ScoreCircle'
import { SkeletonLines } from '@/components/common/Skeleton'
import StatCard from '@/components/common/StatCard'
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
      aria-label={`Trạng thái hồ sơ của ${application.candidate.fullName}`}
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

  const { data: jobsPage, loading: loadingJobs, error: jobsError, reload: reloadJobs } = useFetch(
    () => jobApi.getMine({ pageSize: 100 }),
    [],
  )
  const { data, loading, error, setData, reload } = useFetch(
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
  const [rejecting, setRejecting] = useState(null) // hồ sơ đang chờ nhập lý do từ chối
  const [reason, setReason] = useState('')
  const [invitingPotential, setInvitingPotential] = useState(false)

  const setParams = (changes) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    if (!('page' in changes)) next.delete('page')
    setSearchParams(next)
  }

  const header = (
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
  )

  if (loadingJobs) {
    return (
      <>
        {header}
        <div className="card">
          <SkeletonLines lines={5} label="Đang tải danh sách ứng viên" />
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
  const jobs = jobsPage?.results ?? []
  if (!jobs.length) {
    return (
      <>
        {header}
        <EmptyState
          icon={BriefcaseBusiness}
          title="Chưa có tin tuyển dụng"
          description="Đăng tin để bắt đầu nhận hồ sơ ứng viên."
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

  const list = data?.results ?? []
  const replace = (updated) =>
    setData((current) => ({ ...current, results: current.results.map((a) => (a.id === updated.id ? updated : a)) }))

  const updateStatus = async (application, newStatus, rejectionReason = '') => {
    setActionError('')
    try {
      replace(await applicationApi.updateStatus(application.id, newStatus, { rejectionReason }))
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  // Từ chối cần hỏi lý do trước; các bước khác đổi ngay
  const changeStatus = (application, newStatus) => {
    if (newStatus === 'rejected') return setRejecting(application)
    updateStatus(application, newStatus)
  }

  const closeReject = () => {
    setRejecting(null)
    setReason('')
  }

  const confirmReject = () => {
    const application = rejecting
    const note = reason
    closeReject()
    updateStatus(application, 'rejected', note)
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
    setInvitingPotential(false)
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
  const activeFilters = [
    currentJob && { key: 'jobId', label: 'Tin', value: currentJob.title },
    status && { key: 'status', label: 'Trạng thái', value: APPLICATION_STATUS[status]?.label ?? status },
    keyword && { key: 'q', label: 'Từ khóa', value: keyword },
  ].filter(Boolean)

  const clearFilters = () => {
    setSearch('')
    setParams({ jobId: '', status: '', q: '' })
  }

  return (
    <>
      {header}

      <div className="card toolbar">
        <div className="toolbar-fields">
          <div className="form-group">
            <label htmlFor="applicant-job">Tin tuyển dụng</label>
            <select id="applicant-job" className="input" value={jobId} onChange={(e) => setParams({ jobId: e.target.value })}>
              <option value="">Tất cả tin tuyển dụng</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.applicantCount})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="applicant-status">Trạng thái</label>
            <select
              id="applicant-status"
              className="input"
              value={status}
              onChange={(e) => setParams({ status: e.target.value })}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(APPLICATION_STATUS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="applicant-sort">Sắp xếp</label>
            <select id="applicant-sort" className="input" value={sort} onChange={(e) => setParams({ sort: e.target.value })}>
              {FEATURES.ai && <option value="score">Điểm AI cao nhất</option>}
              <option value="newest">Mới nộp nhất</option>
              <option value="oldest">Nộp sớm nhất</option>
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
            <span className="visually-hidden">Tìm ứng viên theo tên, email, số điện thoại</span>
            <input
              type="search"
              className="input"
              placeholder="Tìm theo tên, email, số điện thoại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-outline">
            Tìm
          </button>
        </form>
        {FEATURES.ai && (
          <div className="toolbar-ai">
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
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleScreen}
              disabled={screening || !jobId || !list.length}
            >
              {screening ? <span className="spinner" aria-hidden="true" /> : screened.length ? <RefreshCw /> : <Sparkles />}
              {screening ? 'AI đang sàng lọc...' : screened.length ? 'Sàng lọc lại bằng AI' : 'Sàng lọc bằng AI'}
            </button>
          </div>
        )}
      </div>

      <ActiveFilters
        items={activeFilters}
        onRemove={(key) => {
          if (key === 'q') setSearch('')
          setParams({ [key]: '' })
        }}
        onClear={clearFilters}
      />

      {currentJob && currentJob.skills.length > 0 && (
        <div className="skill-summary">
          <span className="text-muted small">Kỹ năng yêu cầu của tin:</span>
          <ul className="tags">
            {currentJob.skills.map((s) => (
              <li key={s} className="tag">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {actionError && (
        <div className="alert alert-error" role="alert">
          <TriangleAlert />
          <div className="alert-content">{actionError}</div>
        </div>
      )}

      {FEATURES.ai && screened.length > 0 && (
        <div className="stat-grid">
          <StatCard icon={Sparkles} tone="ai" label="Đã sàng lọc" value={`${screened.length}/${list.length}`} />
          {Object.entries(AI_RECOMMENDATION).map(([key, meta]) => (
            <StatCard
              key={key}
              label={meta.label}
              value={screened.filter((a) => a.aiReview.recommendation === key).length}
            />
          ))}
        </div>
      )}

      {FEATURES.ai && potential.length > 0 && (
        <div className="alert alert-success">
          <Sparkles />
          <div className="alert-content">
            AI tìm thấy {potential.length} ứng viên tiềm năng chưa được mời phỏng vấn.{' '}
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setInvitingPotential(true)}>
              Mời phỏng vấn
            </button>
          </div>
        </div>
      )}

      {loading && !data && (
        <div className="card">
          <SkeletonLines lines={5} label="Đang tải hồ sơ ứng tuyển" />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <>
          {FEATURES.ai && list.length > 0 && screened.length === 0 && jobId && (
            <div className="alert alert-ai">
              <Sparkles />
              <div className="alert-content">
                Các hồ sơ chưa được AI đánh giá. Bấm “Sàng lọc bằng AI” để chấm điểm và xếp hạng tự động.
              </div>
            </div>
          )}
          {visible.length === 0 ? (
            <EmptyState
              icon={Users}
              title={data.count ? 'Không có hồ sơ khớp bộ lọc' : 'Chưa có hồ sơ ứng tuyển'}
              description={data.count ? 'Thử bỏ bớt bộ lọc.' : 'Hồ sơ ứng viên nộp vào các tin của công ty sẽ hiện ở đây.'}
              action={
                activeFilters.length > 0 && (
                  <button type="button" className="btn btn-outline" onClick={clearFilters}>
                    Xóa bộ lọc
                  </button>
                )
              }
            />
          ) : (
            <div className={`card table-card ${loading ? 'is-refreshing' : ''}`}>
              <div className="table-wrap">
                <table className="table table-stack">
                  <thead>
                    <tr>
                      <th scope="col" className="table-col-index">
                        #
                      </th>
                      <th scope="col">Ứng viên</th>
                      {!jobId && <th scope="col">Vị trí ứng tuyển</th>}
                      {FEATURES.ai && <th scope="col">Điểm AI</th>}
                      {FEATURES.ai && <th scope="col">Kỹ năng phù hợp</th>}
                      <th scope="col">Ngày nộp</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col" className="table-cell-actions">
                        <span className="visually-hidden">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((a, index) => (
                      <tr key={a.id}>
                        <td className="table-col-index text-muted tabular-nums">{(page - 1) * PAGE_SIZE + index + 1}</td>
                        <td className="table-cell-main">
                          <div className="person">
                            <span className="avatar" aria-hidden="true">
                              {a.candidate.fullName.charAt(0)}
                            </span>
                            <div className="person-text">
                              <Link to={`/recruiter/applicants/${a.id}`} className="table-title">
                                {a.candidate.fullName}
                              </Link>
                              <small>
                                {[
                                  a.candidate.headline,
                                  a.candidate.yearsOfExperience != null && `${a.candidate.yearsOfExperience} năm KN`,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </small>
                            </div>
                          </div>
                        </td>
                        {!jobId && <td data-label="Vị trí">{a.job?.title}</td>}
                        {FEATURES.ai && (
                          <td data-label="Điểm AI">
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
                          <td data-label="Kỹ năng phù hợp">
                            {a.aiReview ? (
                              <div className="tags">
                                {a.aiReview.matchedSkills.map((s) => (
                                  <span key={s} className="tag tag-success">
                                    {s}
                                  </span>
                                ))}
                                {a.aiReview.missingSkills.length > 0 && (
                                  <span className="tag tag-muted">Thiếu {a.aiReview.missingSkills.length}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        )}
                        <td data-label="Ngày nộp" className="nowrap tabular-nums">
                          {formatDate(a.appliedAt)}
                        </td>
                        <td data-label="Trạng thái">
                          <StatusSelect application={a} onChange={changeStatus} />
                        </td>
                        <td className="table-cell-actions">
                          <Link
                            to={`/recruiter/applicants/${a.id}`}
                            className="btn btn-outline btn-sm"
                            aria-label={`Xem hồ sơ ${a.candidate.fullName}`}
                          >
                            Xem hồ sơ
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

      <ConfirmDialog
        open={Boolean(rejecting)}
        title="Từ chối hồ sơ?"
        message={rejecting && `Hồ sơ của ${rejecting.candidate.fullName} sẽ chuyển sang trạng thái "Từ chối".`}
        confirmLabel="Từ chối hồ sơ"
        onConfirm={confirmReject}
        onCancel={closeReject}
      >
        <div className="form-group">
          <label htmlFor="reject-reason">Lý do từ chối (không bắt buộc)</label>
          <textarea
            id="reject-reason"
            className="input"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </ConfirmDialog>

      {FEATURES.ai && (
        <ConfirmDialog
          open={invitingPotential}
          tone="primary"
          title="Mời phỏng vấn ứng viên tiềm năng?"
          message={`Mời ${potential.length} ứng viên được AI đánh giá "Rất phù hợp" vào vòng phỏng vấn?`}
          confirmLabel="Mời phỏng vấn"
          onConfirm={invitePotential}
          onCancel={() => setInvitingPotential(false)}
        />
      )}
    </>
  )
}
