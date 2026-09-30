import Badge from '@/components/common/Badge'
import ScoreCircle, { ProgressBar } from '@/components/common/ScoreCircle'
import { SUGGESTION_PRIORITY } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'

export default function CVAnalysisResult({ analysis }) {
  return (
    <div className="analysis">
      <div className="analysis-overview">
        <ScoreCircle score={analysis.overallScore} size={120} />
        <div className="analysis-sections">
          {analysis.sections.map((s) => (
            <div key={s.key} className="analysis-section">
              <div className="analysis-section-head">
                <span>{s.name}</span>
                <strong>{s.score}</strong>
              </div>
              <ProgressBar value={s.score} />
              <small className="text-muted">{s.comment}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card card-flat">
          <h4 className="text-success">✔ Điểm mạnh</h4>
          <ul>
            {analysis.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="card card-flat">
          <h4 className="text-danger">✖ Điểm cần cải thiện</h4>
          <ul>
            {analysis.weaknesses.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      <h3>✨ Gợi ý cải thiện CV từ AI</h3>
      <div className="suggestions">
        {analysis.suggestions.map((s) => {
          const priority = SUGGESTION_PRIORITY[s.priority]
          return (
            <div key={s.issue} className={`suggestion suggestion-${priority.tone}`}>
              <div className="suggestion-head">
                <Badge tone={priority.tone}>{priority.label}</Badge>
                <span className="text-muted">{s.section}</span>
              </div>
              <strong>{s.issue}</strong>
              <p>{s.suggestion}</p>
              {s.example && (
                <div className="suggestion-example">
                  <small>Ví dụ:</small> {s.example}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {analysis.missingKeywords.length > 0 && (
        <>
          <h4>Từ khóa nên bổ sung</h4>
          <div className="tags">
            {analysis.missingKeywords.map((k) => (
              <span key={k} className="tag tag-warning">
                + {k}
              </span>
            ))}
          </div>
        </>
      )}
      <p className="text-muted small">Phân tích lúc {formatDate(analysis.analyzedAt)}</p>
    </div>
  )
}
