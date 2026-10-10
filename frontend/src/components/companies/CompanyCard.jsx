import { Link } from 'react-router-dom'
import Badge from '@/components/common/Badge'
import CompanyLogo from '@/components/common/CompanyLogo'
import FavoriteButton from '@/components/common/FavoriteButton'
import { COMPANY_SIZES } from '@/utils/constants'
import { labelOf } from '@/utils/formatters'

export default function CompanyCard({ company }) {
  const link = `/companies/${company.id}`

  return (
    <article className="card job-card">
      <div className="job-card-head">
        <CompanyLogo name={company.name} src={company.logoUrl} />
        <div className="job-card-title">
          <Link to={link}>
            <h3>{company.name}</h3>
          </Link>
          {company.isVerified && <Badge tone="success">✓ Đã xác minh</Badge>}
        </div>
        <FavoriteButton type="company" id={company.id} />
      </div>

      <div className="job-meta">
        {company.industry && <span>🗂️ {company.industry}</span>}
        {company.location && <span>📍 {company.location}</span>}
        {company.companySize && <span>👥 {labelOf(COMPANY_SIZES, company.companySize)}</span>}
      </div>

      <div className="job-card-foot text-muted">
        <span>
          {company.openJobCount > 0 ? (
            <>
              <strong className="text-primary">{company.openJobCount}</strong> việc làm đang tuyển
            </>
          ) : (
            'Chưa có tin đang tuyển'
          )}
        </span>
        <Link to={link} className="btn btn-outline btn-sm">
          Xem công ty
        </Link>
      </div>
    </article>
  )
}
