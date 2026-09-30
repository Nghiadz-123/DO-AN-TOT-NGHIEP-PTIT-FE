import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import applicationApi from '@/api/applicationApi'
import jobApi from '@/api/jobApi'
import { RecommendationBadge } from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import ScoreCircle from '@/components/common/ScoreCircle'
import useFetch from '@/hooks/useFetch'
import { AI_RECOMMENDATION, APPLICATION_STATUS } from '@/utils/constants'
import { formatDate, getErrorMessage } from '@/utils/formatters'

const SORTS = {
  score: (a, b) => (b.aiReview?.score ?? -1) - (a.aiReview?.score ?? -1),
  newest: (a, b) => new Date(b.appliedAt) - new Date(a.appliedAt),
}

export default function ApplicantsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: jobs, loading: loadingJobs } = useFetch(() => jobApi.getMine(), [])
  const jobId = searchParams.get('jobId') || jobs?.[0]?.id

  const {
    data: applicants,
    loading,
    error,
    setData: setApplicants,
  } = useFetch(() => (jobId ? applicationApi.getByJob(jobId) : Promise.resolve([])), [jobId])

  const [screening, setScreening] = useState(false)
  const [minScore, setMinScore] = useState(0)
  const [status, setStatus] = useState('')
  const [onlyPotential, setOnlyPotential] = useState(false)
  const [sortBy, setSortBy] = useState('score')
  const [actionError, setActionError] = useState('')

  if (loadingJobs) return <Loading />
  if (!jobs?.length) {
    return (
      <EmptyState
        title="Chưa có tin tuyển dụng"
        description="Đăng tin để bắt đầu nhận và sàng lọc hồ sơ."
        action={
          <Link to="/recruiter/jobs/new" className="btn btn-primary">
            Đăng tin mới
          </Link>
        }
      />
    )
  }

  const replace = (updated) => setApplicants((list) => list.map((a) => (a.id === updated.id ? updated : a)))

  const handleScreen = async () => {
    setScreening(true)
    setActionError('')
    try {
      setApplicants(await applicationApi.screenByJob(jobId))
      setSortBy('score')
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setScreening(false)
    }
  }

  const changeStatus = async (app, newStatus) => {
    try {
      replace(await applicationApi.updateStatus(app.id, newStatus))
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  const list = applicants ?? []
  const screened = list.filter((a) => a.aiReview)
  const potential = list.filter(
    (a) => a.aiReview?.recommendation === 'strong' && ['pending', 'reviewing'].includes(a.status),
  )

  const shortlistPotential = async () => {
    if (!window.confirm(`Chuyển ${potential.length} ứng viên được AI đánh giá "Rất phù hợp" vào vòng trong?`)) return
    try {
      const updated = await Promise.all(potential.map((a) => applicationApi.updateStatus(a.id, 'shortlisted')))
      updated.forEach(replace)
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  const visible = list
    .filter((a) => !status || a.status === status)
    .filter((a) => !minScore || (a.aiReview && a.aiReview.score >= minScore))
    .filter((a) => !onlyPotential || a.aiReview?.recommendation === 'strong')
    .sort(SORTS[sortBy])

  const currentJob = jobs.find((j) => j.id === jobId)

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Ứng viên & AI sàng lọc</h1>
          <p className="text-muted">AI chấm điểm mức độ phù hợp giữa CV và yêu cầu tuyển dụng, xếp hạng hồ sơ tiềm năng</p>
        </div>
      </div>

      <div className="card filter-bar">
        <label className="inline-field">
          <span>Tin tuyển dụng:</span>
          <select className="input" value={jobId} onChange={(e) => setSearchParams({ jobId: e.target.value })}>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.applicantCount})
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary" onClick={handleScreen} disabled={screening || !list.length}>
          {screening ? 'AI đang sàng lọc...' : screened.length ? '🤖 Sàng lọc lại bằng AI' : '🤖 Sàng lọc bằng AI'}
        </button>
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

      {screened.length > 0 && (
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

      {potential.length > 0 && (
        <div className="alert alert-success">
          ✨ AI tìm thấy {potential.length} ứng viên tiềm năng chưa được xử lý.{' '}
          <button className="btn btn-primary btn-sm" onClick={shortlistPotential}>
            Chuyển vào vòng trong
          </button>
        </div>
      )}

      <div className="card filter-bar">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(APPLICATION_STATUS).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>
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
        <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="score">Sắp xếp: Điểm AI cao nhất</option>
          <option value="newest">Sắp xếp: Mới nộp nhất</option>
        </select>
      </div>

      {loading && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}
      {!loading && !error && (
        <>
          {list.length > 0 && screened.length === 0 && (
            <div className="alert alert-info">
              Các hồ sơ chưa được AI đánh giá. Bấm “Sàng lọc bằng AI” để chấm điểm và xếp hạng tự động.
            </div>
          )}
          {visible.length === 0 ? (
            <EmptyState
              title={list.length ? 'Không có hồ sơ khớp bộ lọc' : 'Tin này chưa có hồ sơ ứng tuyển'}
              description={list.length ? 'Thử giảm điểm tối thiểu hoặc bỏ bớt bộ lọc.' : undefined}
            />
          ) : (
            <div className="card table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ứng viên</th>
                    <th>Điểm AI</th>
                    <th>Kỹ năng phù hợp</th>
                    <th>Ngày nộp</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((a, index) => (
                    <tr key={a.id}>
                      <td className="text-muted">{index + 1}</td>
                      <td>
                        <strong>{a.candidate?.fullName}</strong>
                        <div className="text-muted">
                          {a.cv?.parsed.title} · {a.cv?.parsed.yearsOfExperience} năm KN
                        </div>
                      </td>
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
                      <td>{formatDate(a.appliedAt)}</td>
                      <td>
                        <select
                          className="input input-sm"
                          value={a.status}
                          onChange={(e) => changeStatus(a, e.target.value)}
                        >
                          {Object.entries(APPLICATION_STATUS).map(([key, meta]) => (
                            <option key={key} value={key}>
                              {meta.label}
                            </option>
                          ))}
                        </select>
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
        </>
      )}
    </>
  )
}
