import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Layers, MapPin, Users } from 'lucide-react'
import Badge from '@/components/common/Badge'
import CompanyLogo from '@/components/common/CompanyLogo'
import FavoriteButton from '@/components/common/FavoriteButton'
import { COMPANY_SIZES } from '@/utils/constants'
import { labelOf } from '@/utils/formatters'

export default function CompanyCard({ company }) {
  const link = `/companies/${company.id}`

  return (
    <article className="card card-interactive company-card">
      <div className="company-card-head">
        <CompanyLogo name={company.name} src={company.logoUrl} />
        <div className="company-card-title">
          <h3>
            <Link to={link} className="card-link">
              {company.name}
            </Link>
          </h3>
          {company.isVerified && (
            <Badge tone="success">
              <BadgeCheck />
              Đã xác minh
            </Badge>
          )}
        </div>
        <FavoriteButton type="company" id={company.id} />
      </div>

      <ul className="job-meta">
        {company.industry && (
          <li>
            <Layers />
            {company.industry}
          </li>
        )}
        {company.location && (
          <li>
            <MapPin />
            {company.location}
          </li>
        )}
        {company.companySize && (
          <li>
            <Users />
            {labelOf(COMPANY_SIZES, company.companySize)}
          </li>
        )}
      </ul>

      <div className="job-card-foot">
        <span>
          {company.openJobCount > 0 ? (
            <>
              <strong className="text-primary">{company.openJobCount}</strong> việc làm đang tuyển
            </>
          ) : (
            'Chưa có tin đang tuyển'
          )}
        </span>
        <span className="job-card-cta" aria-hidden="true">
          Xem công ty <ArrowRight />
        </span>
      </div>
    </article>
  )
}
