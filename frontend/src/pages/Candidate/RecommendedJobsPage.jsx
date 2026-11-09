import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, FileUp, Lightbulb, SearchX, Sparkles, TriangleAlert } from 'lucide-react'
import aiApi from '@/api/aiApi'
import cvApi from '@/api/cvApi'
import AiProgress from '@/components/common/AiProgress'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import { SkeletonCards } from '@/components/common/Skeleton'
import CVNotReady from '@/components/cv/CVNotReady'
import JobCard from '@/components/jobs/JobCard'
import useFetch from '@/hooks/useFetch'
import { getErrorMessage } from '@/utils/formatters'

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
      <p className="ai-box-title">
        <Sparkles />
        AI đánh giá chi tiết: <span className="ai-box-score">{evaluation.score}/100</span>
      </p>
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
    reload,
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

  if (loadingCvs) return <SkeletonCards count={4} className="grid grid-2" label="Đang tải CV" />

  if (!cvs?.length) {
    return (
      <EmptyState
        icon={FileUp}
        title="Bạn chưa có CV"
        description="Tải CV lên để AI phân tích kỹ năng, kinh nghiệm và gợi ý những công việc phù hợp nhất."
        action={
          <Link to="/cv/new?redirect=/recommended-jobs" className="btn btn-primary">
            <FileUp />
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
          <p className="eyebrow eyebrow-ai">
            <Sparkles />
            Gợi ý bằng AI
          </p>
          <h1>Việc làm phù hợp với bạn</h1>
          <p className="text-muted">
            AI so khớp nội dung CV (vị trí, kinh nghiệm, kỹ năng) với các tin đang tuyển và kiểm tra kỹ năng bắt buộc
            của từng tin.
          </p>
        </div>
      </div>

      <div className="card filter-bar reco-toolbar">
        <div className="form-group">
          <label htmlFor="reco-cv">Dựa trên CV</label>
          <select id="reco-cv" className="input" value={cv.id} onChange={(e) => setSearchParams({ cvId: e.target.value })}>
            {cvs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title || c.fileName}
              </option>
            ))}
          </select>
        </div>
        <div className="reco-score">
          <span id="reco-score-label" className="field-label">
            Mức độ phù hợp
          </span>
          <div className="segmented" role="group" aria-labelledby="reco-score-label">
            {SCORE_FILTERS.map((f) => (
              <button key={f.value} type="button" aria-pressed={minScore === f.value} onClick={() => setMinScore(f.value)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!ready && <CVNotReady cv={cv} />}
      {actionError && (
        <div className="alert alert-error" role="alert">
          <TriangleAlert />
          <div className="alert-content">{actionError}</div>
        </div>
      )}
      {loading && (
        <>
          <AiProgress text="AI đang tìm công việc phù hợp, lần đầu có thể mất 10-20 giây..." />
          <SkeletonCards count={4} className="grid grid-2" label="Đang tải việc làm phù hợp" />
        </>
      )}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && recommendations && (
        <section className="results" aria-label="Việc làm phù hợp">
          <div className="results-bar">
            <p className="results-count" role="status">
              <strong>{visible.length}</strong> công việc phù hợp
            </p>
            <p className="skill-legend">
              Kỹ năng:
              <span className="tag tag-success">
                <Check />
                đã có
              </span>
              <span className="tag tag-muted">còn thiếu</span>
            </p>
          </div>
          {visible.length ? (
            <div className="grid grid-2">
              {visible.map(({ job, match }) => (
                <JobCard key={job.id} job={job} match={match}>
                  {match.aiEvaluation && <AIEvaluationBox evaluation={match.aiEvaluation} />}
                  {!match.aiEvaluation && (
                    <div className="actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={Boolean(evaluatingId)}
                        onClick={() => evaluate(job.id)}
                      >
                        {evaluatingId === job.id ? <span className="spinner" aria-hidden="true" /> : <Sparkles />}
                        {evaluatingId === job.id ? 'AI đang đánh giá...' : 'AI đánh giá chi tiết'}
                      </button>
                    </div>
                  )}
                </JobCard>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={SearchX}
              title={recommendations.length ? 'Chưa có công việc đạt mức điểm này' : 'Chưa có tin tuyển dụng nào đang tuyển'}
              description="Hãy hạ mức lọc hoặc cải thiện CV theo gợi ý của AI."
              action={
                <Link to={`/cv-analysis?cvId=${cv.id}&tab=suggestions`} className="btn btn-outline">
                  <Lightbulb />
                  Xem gợi ý sửa CV
                </Link>
              }
            />
          )}
        </section>
      )}
    </>
  )
}
