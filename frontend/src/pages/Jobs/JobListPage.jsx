import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import jobApi from '@/api/jobApi'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import Pagination from '@/components/common/Pagination'
import JobCard from '@/components/jobs/JobCard'
import useAuth from '@/hooks/useAuth'
import { useLocations } from '@/hooks/useCatalog'
import useFetch from '@/hooks/useFetch'
import { FEATURES, JOB_LEVELS, JOB_TYPES, ROLES } from '@/utils/constants'

const FILTER_KEYS = ['keyword', 'location', 'type', 'level']
const PAGE_SIZE = 12

export default function JobListPage() {
  const { user } = useAuth()
  const locations = useLocations()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) ?? '']))
  const page = Number(searchParams.get('page') ?? 1)
  const [keyword, setKeyword] = useState(filters.keyword)

  const { data, loading, error } = useFetch(
    () => jobApi.getAll({ ...filters, page, pageSize: PAGE_SIZE }),
    [searchParams.toString()],
  )

  const updateFilters = (changes) => {
    const next = { ...filters, ...changes }
    setSearchParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    updateFilters({ keyword: keyword.trim() })
  }

  const clearFilters = () => {
    setKeyword('')
    setSearchParams({})
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tìm kiếm việc làm</h1>
          <p className="text-muted">Tìm theo vị trí, kỹ năng, công ty và lọc theo nhu cầu của bạn</p>
        </div>
      </div>

      <form className="card filter-bar" onSubmit={handleSearch}>
        <input
          className="input filter-keyword"
          placeholder="Nhập vị trí, kỹ năng (React, Python...), công ty"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select className="input" value={filters.location} onChange={(e) => updateFilters({ location: e.target.value })}>
          <option value="">Tất cả địa điểm</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select className="input" value={filters.type} onChange={(e) => updateFilters({ type: e.target.value })}>
          <option value="">Hình thức</option>
          {JOB_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select className="input" value={filters.level} onChange={(e) => updateFilters({ level: e.target.value })}>
          <option value="">Cấp bậc</option>
          {JOB_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <button className="btn btn-primary">Tìm kiếm</button>
      </form>

      {FEATURES.ai && user?.role === ROLES.CANDIDATE && (
        <div className="alert alert-info">
          ✨ Muốn biết công việc nào hợp với bạn nhất? <Link to="/recommended-jobs">Xem việc làm AI gợi ý theo CV</Link>
        </div>
      )}

      {loading && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}
      {data && !loading && (
        <>
          <p className="text-muted">Tìm thấy {data.count} việc làm</p>
          {data.results.length ? (
            <div className="grid grid-3">
              {data.results.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Không tìm thấy việc làm phù hợp"
              description="Hãy thử từ khóa khác hoặc bỏ bớt bộ lọc."
              action={
                <button className="btn btn-outline" onClick={clearFilters}>
                  Xóa bộ lọc
                </button>
              }
            />
          )}
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            count={data.count}
            onChange={(p) => setSearchParams({ ...Object.fromEntries(searchParams), page: String(p) })}
          />
        </>
      )}
    </>
  )
}
