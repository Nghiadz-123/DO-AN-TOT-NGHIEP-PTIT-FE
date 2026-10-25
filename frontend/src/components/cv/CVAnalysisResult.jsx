import { Link } from 'react-router-dom'
import Badge from '@/components/common/Badge'
import ScoreCircle, { ProgressBar } from '@/components/common/ScoreCircle'
import { SUGGESTION_PRIORITY } from '@/utils/constants'
import { formatDateTime } from '@/utils/formatters'

function TextList({ items }) {
  if (!items.length) return <p className="text-muted">Không có.</p>
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

// AI chấm điểm CV: tổng điểm 0-100, điểm từng tiêu chí (trên điểm tối đa), điểm mạnh / điểm cần cải thiện
export function CVScoreResult({ score }) {
  return (
    <div className="analysis">
      <div className="analysis-overview">
        <ScoreCircle score={score.total} size={120} />
        <div className="analysis-sections">
          {score.sections.map((s) => (
            <div key={s.key} className="analysis-section">
              <div className="analysis-section-head">
                <span>{s.name}</span>
                <strong>
                  {s.score}/{s.max}
                </strong>
              </div>
              <ProgressBar value={s.max ? Math.round((s.score * 100) / s.max) : 0} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card card-flat">
          <h4 className="text-success">✔ Điểm mạnh</h4>
          <TextList items={score.strengths} />
        </div>
        <div className="card card-flat">
          <h4 className="text-danger">✖ Điểm cần cải thiện</h4>
          <TextList items={score.weaknesses} />
        </div>
      </div>
      <p className="text-muted small">Chấm điểm lúc {formatDateTime(score.scoredAt)}</p>
    </div>
  )
}

// AI gợi ý sửa CV, kèm tin tuyển dụng làm căn cứ cho từng gợi ý
export function CVSuggestionList({ suggestions }) {
  const jobs = Object.fromEntries(suggestions.referenceJobs.map((job) => [job.id, job]))

  return (
    <div className="analysis">
      {suggestions.referenceJobs.length > 0 && (
        <details className="reference-jobs">
          <summary className="text-muted small">Tin tuyển dụng đã đối chiếu ({suggestions.referenceJobs.length})</summary>
          <ol className="small">
            {suggestions.referenceJobs.map((job) => (
              <li key={job.id}>
                <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                <span className="text-muted">
                  {' '}
                  · {job.company}
                  {job.score != null && ` · ${job.score} điểm`}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="suggestions">
        {suggestions.items.map((s, index) => {
          const priority = SUGGESTION_PRIORITY[s.priority] ?? SUGGESTION_PRIORITY.medium
          const refs = s.jobIds.filter((id) => jobs[id])
          return (
            <div key={index} className={`suggestion suggestion-${priority.tone}`}>
              <div className="suggestion-head">
                <Badge tone={priority.tone}>{priority.label}</Badge>
                <span className="text-muted">{s.section}</span>
              </div>
              {s.issue && <strong>{s.issue}</strong>}
              <p>{s.suggestion}</p>
              {s.before && (
                <div className="suggestion-example suggestion-before">
                  <small>Hiện tại:</small> {s.before}
                </div>
              )}
              {s.after && (
                <div className="suggestion-example">
                  <small>Nên sửa thành:</small> {s.after}
                </div>
              )}
              {refs.length > 0 && (
                <p className="text-muted small">
                  Căn cứ:{' '}
                  {refs.map((id, i) => (
                    <span key={id}>
                      {i > 0 && ', '}
                      <Link to={`/jobs/${id}`}>{jobs[id].title}</Link>
                    </span>
                  ))}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {suggestions.missingKeywords.length > 0 && (
        <div>
          <h4>Từ khóa trong tin tuyển dụng mà CV chưa có</h4>
          <div className="tags">
            {suggestions.missingKeywords.map((k) => (
              <span key={k} className="tag tag-warning">
                + {k}
              </span>
            ))}
          </div>
        </div>
      )}
      <p className="text-muted small">Gợi ý lúc {formatDateTime(suggestions.suggestedAt)}</p>
    </div>
  )
}
