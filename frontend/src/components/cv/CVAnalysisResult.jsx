import { Link } from 'react-router-dom'
import { Briefcase, CircleAlert, CircleCheck, Info, Plus, TriangleAlert } from 'lucide-react'
import Badge from '@/components/common/Badge'
import ScoreCircle, { ProgressBar } from '@/components/common/ScoreCircle'
import { SUGGESTION_PRIORITY } from '@/utils/constants'
import { formatDateTime, scoreLevel } from '@/utils/formatters'

// Mức ưu tiên luôn có chữ + icon, không chỉ dựa vào màu viền
const PRIORITY_ICONS = { danger: CircleAlert, warning: TriangleAlert, info: Info }

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
  const level = scoreLevel(score.total)
  return (
    <div className="analysis">
      <div className="score-overview">
        <div className="score-overview-total">
          <ScoreCircle score={score.total} size={120} />
          <p className="text-muted small">CV của bạn đạt mức <strong className={`text-${level.tone}`}>{level.label}</strong></p>
        </div>
        <ul className="criteria-list" aria-label="Điểm theo tiêu chí">
          {score.sections.map((s) => (
            <li key={s.key} className="criteria-item">
              <div className="criteria-head">
                <span>{s.name}</span>
                <strong>
                  {s.score}/{s.max}
                </strong>
              </div>
              <ProgressBar value={s.max ? Math.round((s.score * 100) / s.max) : 0} />
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-2">
        <section className="insight-card insight-success">
          <h3>
            <CircleCheck />
            Điểm mạnh
          </h3>
          <TextList items={score.strengths} />
        </section>
        <section className="insight-card insight-warning">
          <h3>
            <TriangleAlert />
            Điểm cần cải thiện
          </h3>
          <TextList items={score.weaknesses} />
        </section>
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
          <summary>
            <Briefcase />
            Tin tuyển dụng đã đối chiếu ({suggestions.referenceJobs.length})
          </summary>
          <ol>
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

      <ol className="suggestions">
        {suggestions.items.map((s, index) => {
          const priority = SUGGESTION_PRIORITY[s.priority] ?? SUGGESTION_PRIORITY.medium
          const PriorityIcon = PRIORITY_ICONS[priority.tone] ?? Info
          const refs = s.jobIds.filter((id) => jobs[id])
          return (
            <li key={index} className={`suggestion suggestion-${priority.tone}`}>
              <div className="suggestion-head">
                <Badge tone={priority.tone}>
                  <PriorityIcon />
                  {priority.label}
                </Badge>
                <span className="suggestion-section">{s.section}</span>
              </div>
              {s.issue && <h3 className="suggestion-issue">{s.issue}</h3>}
              <p>{s.suggestion}</p>
              {(s.before || s.after) && (
                <div className="suggestion-compare">
                  {s.before && (
                    <div className="suggestion-example suggestion-before">
                      <span className="suggestion-example-label">Hiện tại</span>
                      <p>{s.before}</p>
                    </div>
                  )}
                  {s.after && (
                    <div className="suggestion-example">
                      <span className="suggestion-example-label">Nên sửa thành</span>
                      <p>{s.after}</p>
                    </div>
                  )}
                </div>
              )}
              {refs.length > 0 && (
                <p className="suggestion-refs">
                  Căn cứ:{' '}
                  {refs.map((id, i) => (
                    <span key={id}>
                      {i > 0 && ', '}
                      <Link to={`/jobs/${id}`}>{jobs[id].title}</Link>
                    </span>
                  ))}
                </p>
              )}
            </li>
          )
        })}
      </ol>

      {suggestions.missingKeywords.length > 0 && (
        <section>
          <h3 className="card-section-title">Từ khóa trong tin tuyển dụng mà CV chưa có</h3>
          <ul className="tags">
            {suggestions.missingKeywords.map((k) => (
              <li key={k} className="tag tag-warning">
                <Plus />
                {k}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-muted small">Gợi ý lúc {formatDateTime(suggestions.suggestedAt)}</p>
    </div>
  )
}
