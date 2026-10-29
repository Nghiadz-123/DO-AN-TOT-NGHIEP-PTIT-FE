import { Fragment } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Briefcase, Building, ExternalLink, Layers, MapPin } from 'lucide-react'
import companyApi from '@/api/companyApi'
import jobApi from '@/api/jobApi'
import Badge from '@/components/common/Badge'
import CompanyLogo from '@/components/common/CompanyLogo'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import FavoriteButton from '@/components/common/FavoriteButton'
import Pagination from '@/components/common/Pagination'
import { SkeletonCards, SkeletonLines } from '@/components/common/Skeleton'
import JobCard from '@/components/jobs/JobCard'
import useFetch from '@/hooks/useFetch'
import { COMPANY_SIZES } from '@/utils/constants'
import { labelOf } from '@/utils/formatters'

const JOB_PAGE_SIZE = 9

export default function CompanyDetailPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') ?? 1)

  const { data: company, loading, error, reload } = useFetch(() => companyApi.getById(id), [id])
  const { data: jobs, loading: loadingJobs } = useFetch(
    () => jobApi.getAll({ company: id, page, pageSize: JOB_PAGE_SIZE }),
    [id, page],
  )

  if (loading) {
    return (
      <div className="card">
        <SkeletonLines lines={4} label="Đang tải thông tin công ty" />
      </div>
    )
  }
  if (error) {
    return (
      <ErrorState
        title="Không tải được thông tin công ty"
        message={error}
        onRetry={reload}
        action={
          <Link to="/companies" className="btn btn-ghost">
            Về danh sách công ty
          </Link>
        }
      />
    )
  }

  const info = [
    ['Ngành nghề', company.industry],
    ['Quy mô', company.companySize && labelOf(COMPANY_SIZES, company.companySize)],
    ['Năm thành lập', company.foundedYear],
    ['Tỉnh/thành phố', company.location],
  ].filter(([, value]) => value)

  return (
    <>
      <Link to="/companies" className="back-link">
        <ArrowLeft />
        Danh sách công ty
      </Link>

      <section className="card job-detail-header">
        <CompanyLogo name={company.name} src={company.logoUrl} large />
        <div className="job-detail-info">
          <h1>{company.name}</h1>
          <ul className="job-meta">
            {company.isVerified && (
              <li>
                <Badge tone="success">
                  <BadgeCheck />
                  Đã xác minh
                </Badge>
              </li>
            )}
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
            {company.website && (
              <li>
                <a href={company.website} target="_blank" rel="noreferrer" className="inline-link">
                  {company.website.replace(/^https?:\/\//, '')}
                  <span className="visually-hidden"> (mở tab mới)</span>
                  <ExternalLink />
                </a>
              </li>
            )}
          </ul>
        </div>
        <div className="job-detail-actions">
          <FavoriteButton type="company" id={company.id} withLabel />
        </div>
      </section>

      <div className="layout-sidebar">
        <article className="card job-content">
          <section className="job-section">
            <h2>
              <Building />
              Giới thiệu công ty
            </h2>
            <p className="pre-line">{company.description || 'Công ty chưa cập nhật phần giới thiệu.'}</p>
          </section>
          {company.address && (
            <section className="job-section">
              <h2>
                <MapPin />
                Địa chỉ
              </h2>
              <p>{[company.address, company.location].filter(Boolean).join(', ')}</p>
            </section>
          )}
        </article>
        <aside className="card">
          <h2 className="card-section-title">Thông tin chung</h2>
          <dl className="info-list">
            {info.map(([label, value]) => (
              <Fragment key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </Fragment>
            ))}
            <dt>Đang tuyển</dt>
            <dd>{company.openJobCount} vị trí</dd>
          </dl>
        </aside>
      </div>

      <section className="results" aria-labelledby="company-jobs-title">
        <h2 id="company-jobs-title" className="section-title">
          Việc làm đang tuyển <span className="badge badge-primary">{company.openJobCount}</span>
        </h2>
        {loadingJobs && !jobs && <SkeletonCards count={3} label="Đang tải việc làm của công ty" />}
        {jobs && (
          <>
            {jobs.results.length ? (
              <div className={`grid grid-3 ${loadingJobs ? 'is-refreshing' : ''}`}>
                {jobs.results.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Briefcase}
                title="Công ty hiện chưa có tin đang tuyển"
                description="Thêm công ty vào yêu thích để quay lại xem sau."
              />
            )}
            <Pagination
              page={jobs.page}
              totalPages={jobs.totalPages}
              count={jobs.count}
              onChange={(p) => setSearchParams({ page: String(p) })}
            />
          </>
        )}
      </section>
    </>
  )
}
