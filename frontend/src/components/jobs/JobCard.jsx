import { Link } from 'react-router-dom'
import Badge, { JobStatusBadge } from '@/components/common/Badge'
import CompanyLogo from '@/components/common/CompanyLogo'
import FavoriteButton from '@/components/common/FavoriteButton'
import ScoreCircle from '@/components/common/ScoreCircle'
import { JOB_LEVELS, JOB_TYPES, WORK_MODES } from '@/utils/constants'
import { formatDate, formatSalary, labelOf } from '@/utils/formatters'

export default function JobCard({ job, match }) {
  const matched = new Set(match?.matchedSkills ?? [])

  return (
    <article className="card job-card">
      <div className="job-card-head">
        <CompanyLogo name={job.company} src={job.companyLogo} />
        <div className="job-card-title">
          <Link to={`/jobs/${job.id}`}>
            <h3>{job.title}</h3>
          </Link>
          <p className="text-muted">
            {job.companyId ? (
              <Link to={`/companies/${job.companyId}`} className="company-link">
                {job.company}
              </Link>
            ) : (
              job.company
            )}
          </p>
        </div>
        {match && <ScoreCircle score={match.score} size={56} showLabel={false} />}
        <FavoriteButton type="job" id={job.id} />
      </div>

      <div className="job-meta">
        {/* Danh sách công khai chỉ có tin đang tuyển; danh sách yêu thích có thể có tin đã đóng / hết hạn */}
        {job.status && job.status !== 'published' && <JobStatusBadge status={job.status} />}
        {job.industry && <span>🗂️ {job.industry}</span>}
        {job.location && <span>📍 {job.location}</span>}
        <span>💰 {formatSalary(job.salaryMin, job.salaryMax, job.isSalaryNegotiable)}</span>
        <Badge tone="info">{labelOf(JOB_TYPES, job.type)}</Badge>
        {job.workMode && job.workMode !== 'onsite' && <Badge tone="primary">{labelOf(WORK_MODES, job.workMode)}</Badge>}
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
