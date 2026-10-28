import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, SearchX, SlidersHorizontal, Sparkles } from 'lucide-react'
import jobApi from '@/api/jobApi'
import ActiveFilters from '@/components/common/ActiveFilters'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import HoverSelect from '@/components/common/HoverSelect'
import Pagination from '@/components/common/Pagination'
import { SkeletonCards } from '@/components/common/Skeleton'
import JobCard from '@/components/jobs/JobCard'
import useAuth from '@/hooks/useAuth'
import { useIndustries, useLocations } from '@/hooks/useCatalog'
import useFetch from '@/hooks/useFetch'
import { FEATURES, JOB_LEVELS, JOB_TYPES, POSTED_WITHIN, ROLES } from '@/utils/constants'
import { labelOf } from '@/utils/formatters'

const FILTER_KEYS = ['keyword', 'industry', 'location', 'type', 'level', 'posted', 'company']
const FILTER_LABELS = {
  keyword: 'Từ khóa',
  industry: 'Ngành nghề',
  location: 'Địa điểm',
  type: 'Hình thức',
  level: 'Cấp bậc',
  posted: 'Đăng trong',
  company: 'Công ty',
}
const PAGE_SIZE = 12

export default function JobListPage() {
  const { user } = useAuth()
  const locations = useLocations()
  const industries = useIndustries()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) ?? '']))
  const page = Number(searchParams.get('page') ?? 1)
  const [keyword, setKeyword] = useState(filters.keyword)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { data, loading, error, reload } = useFetch(
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

  // Chip "đang lọc": tên hiển thị của từng giá trị lọc trên URL
  const nameOf = (list, id) => list.find((item) => String(item.id) === String(id))?.name ?? id
  const valueLabel = {
    keyword: (v) => `"${v}"`,
    industry: (v) => nameOf(industries, v),
    location: (v) => nameOf(locations, v),
    type: (v) => labelOf(JOB_TYPES, v),
    level: (v) => labelOf(JOB_LEVELS, v),
    posted: (v) => labelOf(POSTED_WITHIN, v),
    company: () => data?.results?.[0]?.company || 'Đã chọn',
  }
  const activeFilters = FILTER_KEYS.filter((k) => filters[k]).map((k) => ({
    key: k,
    label: FILTER_LABELS[k],
    value: valueLabel[k](filters[k]),
  }))
  const panelCount = activeFilters.filter((f) => f.key !== 'keyword' && f.key !== 'company').length

  const removeFilter = (key) => {
    if (key === 'keyword') setKeyword('')
    updateFilters({ [key]: '' })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tìm kiếm việc làm</h1>
          <p className="text-muted">Việc làm ở mọi ngành nghề: tìm theo vị trí, kỹ năng, công ty và lọc theo nhu cầu của bạn</p>
        </div>
      </div>

      <form className="card search-panel" role="search" onSubmit={handleSearch}>
        <div className="search-row">
          <label className="input-icon">
            <span className="visually-hidden">Từ khóa tìm việc</span>
            <Search />
            <input
              className="input"
              type="search"
              placeholder="Vị trí, kỹ năng, công ty (VD: kế toán, bán hàng, điều dưỡng)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Tìm kiếm
          </button>
          <button
            type="button"
            className="btn btn-secondary filter-toggle"
            aria-expanded={filtersOpen}
            aria-controls="job-filters"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <SlidersHorizontal />
            Bộ lọc{panelCount > 0 && ` (${panelCount})`}
          </button>
        </div>
        <div id="job-filters" className={`filter-grid ${filtersOpen ? 'open' : ''}`}>
          <HoverSelect
            label="Ngành nghề"
            placeholder="Tất cả ngành nghề"
            value={filters.industry}
            options={industries.map((i) => ({ value: i.id, label: i.name }))}
            onChange={(industry) => updateFilters({ industry })}
          />
          <HoverSelect
            label="Địa điểm"
            placeholder="Tất cả địa điểm"
            value={filters.location}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
            onChange={(location) => updateFilters({ location })}
          />
          <HoverSelect
            label="Hình thức"
            placeholder="Tất cả hình thức"
            value={filters.type}
            options={JOB_TYPES}
            onChange={(type) => updateFilters({ type })}
          />
          <HoverSelect
            label="Cấp bậc"
            placeholder="Tất cả cấp bậc"
            value={filters.level}
            options={JOB_LEVELS}
            onChange={(level) => updateFilters({ level })}
          />
          <HoverSelect
            label="Thời gian đăng"
            placeholder="Bất kỳ lúc nào"
            value={filters.posted}
            options={POSTED_WITHIN}
            onChange={(posted) => updateFilters({ posted })}
          />
        </div>
      </form>

      <ActiveFilters items={activeFilters} onRemove={removeFilter} onClear={clearFilters} />

      {FEATURES.candidateAi && user?.role === ROLES.CANDIDATE && (
        <div className="alert alert-ai">
          <Sparkles />
          <div className="alert-content">
            Muốn biết công việc nào hợp với bạn nhất? <Link to="/recommended-jobs">Xem việc làm AI gợi ý theo CV</Link>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} onRetry={reload} />}
      {!data && loading && <SkeletonCards count={6} label="Đang tải danh sách việc làm" />}
      {data && (
        <section className={`results ${loading ? 'is-refreshing' : ''}`} aria-busy={loading} aria-label="Kết quả tìm kiếm">
          <p className="results-count" role="status">
            {loading ? (
              'Đang cập nhật kết quả...'
            ) : (
              <>
                Tìm thấy <strong>{data.count}</strong> việc làm
              </>
            )}
          </p>
          {data.results.length ? (
            <div className="grid grid-3">
              {data.results.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={SearchX}
              title="Không tìm thấy việc làm phù hợp"
              description="Hãy thử từ khóa ngắn hơn, kiểm tra chính tả hoặc bỏ bớt bộ lọc."
              action={
                <button type="button" className="btn btn-outline" onClick={clearFilters}>
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
        </section>
      )}
    </>
  )
}
