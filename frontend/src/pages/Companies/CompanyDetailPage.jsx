import { Fragment } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import companyApi from '@/api/companyApi'
import jobApi from '@/api/jobApi'
import Badge from '@/components/common/Badge'
import CompanyLogo from '@/components/common/CompanyLogo'
import EmptyState from '@/components/common/EmptyState'
import FavoriteButton from '@/components/common/FavoriteButton'
import Loading from '@/components/common/Loading'
import Pagination from '@/components/common/Pagination'
import JobCard from '@/components/jobs/JobCard'
import useFetch from '@/hooks/useFetch'
import { COMPANY_SIZES } from '@/utils/constants'
import { labelOf } from '@/utils/formatters'

const JOB_PAGE_SIZE = 9

export default function CompanyDetailPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') ?? 1)

  const { data: company, loading, error } = useFetch(() => companyApi.getById(id), [id])
  const { data: jobs, loading: loadingJobs } = useFetch(
    () => jobApi.getAll({ company: id, page, pageSize: JOB_PAGE_SIZE }),
    [id, page],
  )

  if (loading) return <Loading />
  if (error) return <div className="alert alert-error">{error}</div>

  const info = [
    ['Ngành nghề', company.industry],
    ['Quy mô', company.companySize && labelOf(COMPANY_SIZES, company.companySize)],
    ['Năm thành lập', company.foundedYear],
    ['Tỉnh/thành phố', company.location],
  ].filter(([, value]) => value)

  return (
    <>
      <Link to="/companies" className="back-link">
        ← Danh sách công ty
      </Link>

      <div className="card job-detail-header">
        <CompanyLogo name={company.name} src={company.logoUrl} large />
        <div className="job-detail-info">
          <h1>{company.name}</h1>
          <div className="job-meta">
            {company.isVerified && <Badge tone="success">✓ Đã xác minh</Badge>}
            {company.industry && <span>🗂️ {company.industry}</span>}
            {company.location && <span>📍 {company.location}</span>}
            {company.website && (
              <a href={company.website} target="_blank" rel="noreferrer">
                🌐 {company.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>
        <div className="job-detail-actions">
          <FavoriteButton type="company" id={company.id} withLabel />
        </div>
      </div>

      <div className="layout-sidebar">
        <div className="card">
          <section className="job-section">
            <h2>Giới thiệu công ty</h2>
            <p className="pre-line">{company.description || 'Công ty chưa cập nhật phần giới thiệu.'}</p>
          </section>
          {company.address && (
            <section className="job-section">
              <h2>Địa chỉ</h2>
              <p>{[company.address, company.location].filter(Boolean).join(', ')}</p>
            </section>
          )}
        </div>
        <aside className="card">
          <h3>Thông tin chung</h3>
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

      <section>
        <div className="page-header">
          <h2>Việc làm đang tuyển ({company.openJobCount})</h2>
        </div>
        {loadingJobs && <Loading />}
        {jobs && !loadingJobs && (
          <>
            {jobs.results.length ? (
              <div className="grid grid-3">
                {jobs.results.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <EmptyState title="Công ty hiện chưa có tin đang tuyển" description="Thêm công ty vào yêu thích để quay lại xem sau." />
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
