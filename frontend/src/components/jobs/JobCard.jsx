import { Link } from 'react-router-dom'
import Badge from '@/components/common/Badge'
import ScoreCircle from '@/components/common/ScoreCircle'
import { JOB_LEVELS, JOB_TYPES } from '@/utils/constants'
import { formatDate, formatSalary, labelOf } from '@/utils/formatters'

export default function JobCard({ job, match }) {
  const matched = new Set(match?.matchedSkills ?? [])

  return (
    <article className="card job-card">
      <div className="job-card-head">
        <div className="company-logo">{job.company.charAt(0)}</div>
        <div className="job-card-title">
          <Link to={`/jobs/${job.id}`}>
            <h3>{job.title}</h3>
          </Link>
          <p className="text-muted">{job.company}</p>
        </div>
        {match && <ScoreCircle score={match.score} size={56} showLabel={false} />}
      </div>

      <div className="job-meta">
        <span>📍 {job.location}</span>
        <span>💰 {formatSalary(job.salaryMin, job.salaryMax)}</span>
        <Badge tone="info">{labelOf(JOB_TYPES, job.type)}</Badge>
        <Badge>{labelOf(JOB_LEVELS, job.level)}</Badge>
      </div>

      <div className="tags">
        {job.skills.map((s) => (
          <span key={s} className={`tag ${match ? (matched.has(s) ? 'tag-success' : 'tag-muted') : ''}`}>
            {s}
          </span>
        ))}
      </div>

      {match && (
        <ul className="match-reasons">
          {match.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      <div className="job-card-foot text-muted">
        <span>Hạn nộp: {formatDate(job.deadline)}</span>
        <Link to={`/jobs/${job.id}`} className="btn btn-outline btn-sm">
          Xem chi tiết
        </Link>
      </div>
    </article>
  )
}
