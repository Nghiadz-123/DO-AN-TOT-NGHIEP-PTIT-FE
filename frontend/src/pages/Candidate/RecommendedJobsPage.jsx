import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import cvApi from '@/api/cvApi'
import jobApi from '@/api/jobApi'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import JobCard from '@/components/jobs/JobCard'
import useFetch from '@/hooks/useFetch'

const SCORE_FILTERS = [
  { value: 0, label: 'Tất cả' },
  { value: 50, label: 'Từ 50 điểm' },
  { value: 70, label: 'Từ 70 điểm' },
]

export default function RecommendedJobsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [minScore, setMinScore] = useState(0)
  const { data: cvs, loading: loadingCvs } = useFetch(() => cvApi.getMine(), [])

  const cvId = searchParams.get('cvId') || cvs?.[0]?.id
  const { data: recommendations, loading, error } = useFetch(
    () => (cvId ? jobApi.getRecommended(cvId) : Promise.resolve([])),
    [cvId],
  )

  if (loadingCvs) return <Loading />

  if (!cvs?.length) {
    return (
      <EmptyState
        title="Bạn chưa có CV"
        description="Tải CV lên để AI phân tích kỹ năng, kinh nghiệm và gợi ý những công việc phù hợp nhất."
        action={
          <Link to="/cv-analysis" className="btn btn-primary">
            Tải CV lên
          </Link>
        }
      />
    )
  }

  const visible = recommendations?.filter((r) => r.match.score >= minScore) ?? []

  return (
    <>
      <div className="page-header">
        <div>
          <h1>✨ Việc làm phù hợp với bạn</h1>
          <p className="text-muted">
            AI so khớp kỹ năng, kinh nghiệm và định hướng trong CV với yêu cầu của từng tin tuyển dụng.
          </p>
        </div>
      </div>

      <div className="card filter-bar">
        <label className="inline-field">
          <span>Dựa trên CV:</span>
          <select className="input" value={cvId} onChange={(e) => setSearchParams({ cvId: e.target.value })}>
            {cvs.map((cv) => (
              <option key={cv.id} value={cv.id}>
                {cv.fileName}
              </option>
            ))}
          </select>
        </label>
        <div className="segmented">
          {SCORE_FILTERS.map((f) => (
            <button
              key={f.value}
              className={minScore === f.value ? 'active' : ''}
              onClick={() => setMinScore(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <Loading text="AI đang tìm công việc phù hợp..." />}
      {error && <div className="alert alert-error">{error}</div>}
      {!loading && recommendations && (
        <>
          <p className="text-muted">
            {visible.length} công việc · Kỹ năng <span className="tag tag-success">đã có</span>{' '}
            <span className="tag tag-muted">còn thiếu</span>
          </p>
          {visible.length ? (
            <div className="grid grid-2">
              {visible.map(({ job, match }) => (
                <JobCard key={job.id} job={job} match={match} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa có công việc đạt mức điểm này"
              description="Hãy hạ mức lọc hoặc cải thiện CV theo gợi ý của AI."
            />
          )}
        </>
      )}
    </>
  )
}
