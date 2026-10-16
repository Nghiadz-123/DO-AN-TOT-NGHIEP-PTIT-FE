import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import aiApi from '@/api/aiApi'
import cvApi from '@/api/cvApi'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import CVNotReady from '@/components/cv/CVNotReady'
import JobCard from '@/components/jobs/JobCard'
import useFetch from '@/hooks/useFetch'
import { getErrorMessage } from '@/utils/formatters'
import { FEATURES } from '@/utils/constants'

const SCORE_FILTERS = [
  { value: 0, label: 'Tất cả' },
  { value: 50, label: 'Từ 50 điểm' },
  { value: 70, label: 'Từ 70 điểm' },
]
const LIMIT = 20

// Kết quả AI đánh giá chi tiết mức độ phù hợp của CV với một tin
function AIEvaluationBox({ evaluation }) {
  return (
    <div className="ai-box">
      <div className="ai-box-title">🤖 AI đánh giá: {evaluation.score}/100</div>
      {evaluation.reason && <p>{evaluation.reason}</p>}
      {evaluation.missingSkills.length > 0 && (
        <p className="text-muted small">Còn thiếu: {evaluation.missingSkills.join(', ')}</p>
      )}
    </div>
  )
}

export default function RecommendedJobsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [minScore, setMinScore] = useState(0)
  const [evaluatingId, setEvaluatingId] = useState(null)
  const [actionError, setActionError] = useState('')
  const { data: cvs, loading: loadingCvs } = useFetch(() => cvApi.getMine(), [])

  const cv = cvs?.find((c) => c.id === searchParams.get('cvId')) ?? cvs?.find((c) => c.isDefault) ?? cvs?.[0]
  const ready = cv?.parseStatus === 'completed'
  const {
    data: recommendations,
    loading,
    error,
    setData: setRecommendations,
  } = useFetch(() => (ready ? aiApi.getRecommendedJobs(cv.id, { limit: LIMIT }) : Promise.resolve(null)), [cv?.id, ready])

  const evaluate = async (jobId) => {
    setEvaluatingId(jobId)
    setActionError('')
    try {
      const updated = await aiApi.evaluateJob(cv.id, jobId)
      // Giữ nguyên vị trí thẻ (không sắp xếp lại khi điểm thay đổi)
      setRecommendations((list) => list.map((item) => (item.job.id === jobId ? updated : item)))
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setEvaluatingId(null)
    }
  }
  const { data: cvs, loading: loadingCvs } = useFetch(() => (FEATURES.ai ? cvApi.getMine() : Promise.resolve([])), [])

  const cvId = searchParams.get('cvId') || (cvs?.find((cv) => cv.isDefault) ?? cvs?.[0])?.id
  const { data: recommendations, loading, error } = useFetch(
    () => (FEATURES.ai && cvId ? jobApi.getRecommended(cvId) : Promise.resolve([])),
    [cvId],
  )

  if (loadingCvs) return <Loading />

  if (!FEATURES.ai) return <div className="card"><h1>Gợi ý việc làm chưa khả dụng</h1><p className="text-muted">Backend hiện chưa cung cấp dịch vụ AI gợi ý việc làm. Bạn có thể tìm tin tuyển dụng đang mở tại mục Tìm việc.</p><Link to="/jobs" className="btn btn-primary">Tìm việc làm</Link></div>

  if (!cvs?.length) {
    return (
      <EmptyState
        title="Bạn chưa có CV"
        description="Tải CV lên để AI phân tích kỹ năng, kinh nghiệm và gợi ý những công việc phù hợp nhất."
        action={
          <Link to="/cv/new?redirect=/recommended-jobs" className="btn btn-primary">
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
            AI so khớp nội dung CV (vị trí, kinh nghiệm, kỹ năng) với các tin đang tuyển và kiểm tra kỹ năng bắt buộc
            của từng tin.
          </p>
        </div>
      </div>

      <div className="card filter-bar">
        <label className="inline-field">
          <span>Dựa trên CV:</span>
          <select className="input" value={cv.id} onChange={(e) => setSearchParams({ cvId: e.target.value })}>
            {cvs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title || c.fileName}
              </option>
            ))}
          </select>
        </label>
        <div className="segmented">
          {SCORE_FILTERS.map((f) => (
            <button key={f.value} className={minScore === f.value ? 'active' : ''} onClick={() => setMinScore(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!ready && <CVNotReady cv={cv} />}
      {actionError && <div className="alert alert-error">{actionError}</div>}
      {loading && <Loading text="AI đang tìm công việc phù hợp, lần đầu có thể mất 10-20 giây..." />}
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
                <JobCard key={job.id} job={job} match={match}>
                  {match.aiEvaluation && <AIEvaluationBox evaluation={match.aiEvaluation} />}
                  <div className="actions">
                    {!match.aiEvaluation && (
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={Boolean(evaluatingId)}
                        onClick={() => evaluate(job.id)}
                      >
                        {evaluatingId === job.id ? 'AI đang đánh giá...' : '✨ AI đánh giá chi tiết'}
                      </button>
                    )}
                    <Link to={`/cv-analysis?cvId=${cv.id}&jobId=${job.id}&tab=suggestions`} className="btn btn-ghost btn-sm">
                      💡 Gợi ý sửa CV theo tin này
                    </Link>
                  </div>
                </JobCard>
              ))}
            </div>
          ) : (
            <EmptyState
              title={recommendations.length ? 'Chưa có công việc đạt mức điểm này' : 'Chưa có tin tuyển dụng nào đang tuyển'}
              description="Hãy hạ mức lọc hoặc cải thiện CV theo gợi ý của AI."
              action={
                <Link to={`/cv-analysis?cvId=${cv.id}&tab=suggestions`} className="btn btn-outline">
                  Xem gợi ý sửa CV
                </Link>
              }
            />
          )}
        </>
      )}
    </>
  )
}
