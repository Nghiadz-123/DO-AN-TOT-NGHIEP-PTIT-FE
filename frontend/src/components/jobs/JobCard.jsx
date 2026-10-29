import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, Check, Layers, MapPin, Wallet } from 'lucide-react'
import Badge, { JobStatusBadge } from '@/components/common/Badge'
import CompanyLogo from '@/components/common/CompanyLogo'
import FavoriteButton from '@/components/common/FavoriteButton'
import ScoreCircle from '@/components/common/ScoreCircle'
import { JOB_LEVELS, JOB_TYPES, WORK_MODES } from '@/utils/constants'
import { formatDate, formatSalary, labelOf } from '@/utils/formatters'

// match (không bắt buộc): { score, matchedSkills, reasons } khi thẻ nằm trong danh sách gợi ý việc làm;
// children: nội dung thêm hiển thị trên phần chân thẻ (vd. kết quả AI đánh giá)
// Cả thẻ bấm được nhờ liên kết tiêu đề phủ toàn thẻ (.card-link); nút / liên kết khác nằm lớp trên
export default function JobCard({ job, match, children }) {
  const matched = new Set(match?.matchedSkills ?? [])

  return (
    <article className="card card-interactive job-card">
      <div className="job-card-head">
        <CompanyLogo name={job.company} src={job.companyLogo} />
        <div className="job-card-title">
          <h3>
            <Link to={`/jobs/${job.id}`} className="card-link">
              {job.title}
            </Link>
          </h3>
          <p className="job-card-company">
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

      <p className="job-card-salary">
        <Wallet />
        {formatSalary(job.salaryMin, job.salaryMax, job.isSalaryNegotiable)}
      </p>

      <ul className="job-meta">
        {job.location && (
          <li>
            <MapPin />
            {job.location}
          </li>
        )}
        {job.industry && (
          <li>
            <Layers />
            {job.industry}
          </li>
        )}
      </ul>

      <div className="job-card-badges">
        {/* Danh sách công khai chỉ có tin đang tuyển; danh sách yêu thích có thể có tin đã đóng / hết hạn */}
        {job.status && job.status !== 'published' && <JobStatusBadge status={job.status} />}
        <Badge tone="info">{labelOf(JOB_TYPES, job.type)}</Badge>
        {job.workMode && job.workMode !== 'onsite' && <Badge tone="primary">{labelOf(WORK_MODES, job.workMode)}</Badge>}
        <Badge>{labelOf(JOB_LEVELS, job.level)}</Badge>
      </div>

      {job.skills.length > 0 && (
        <ul className="tags job-card-skills" aria-label="Kỹ năng yêu cầu">
          {job.skills.map((s) => {
            const has = matched.has(s)
            return (
              <li key={s} className={`tag ${match ? (has ? 'tag-success' : 'tag-muted') : ''}`}>
                {match && has && <Check />}
                {s}
                {match && <span className="visually-hidden">{has ? ' (đã có)' : ' (còn thiếu)'}</span>}
              </li>
            )
          })}
        </ul>
      )}

      {match && match.reasons.length > 0 && (
        <ul className="match-reasons">
          {match.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      {children}

      <div className="job-card-foot">
        <span>
          <CalendarClock />
          Hạn nộp: {formatDate(job.deadline)}
        </span>
        <span className="job-card-cta" aria-hidden="true">
          Xem chi tiết <ArrowRight />
        </span>
      </div>
    </article>
  )
}
