import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SearchX } from 'lucide-react'
import companyApi from '@/api/companyApi'
import ActiveFilters from '@/components/common/ActiveFilters'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import HoverSelect from '@/components/common/HoverSelect'
import Pagination from '@/components/common/Pagination'
import { SkeletonCards } from '@/components/common/Skeleton'
import CompanyCard from '@/components/companies/CompanyCard'
import { useIndustries, useLocations } from '@/hooks/useCatalog'
import useFetch from '@/hooks/useFetch'

const FILTER_KEYS = ['keyword', 'industry', 'location']
const FILTER_LABELS = { keyword: 'Từ khóa', industry: 'Ngành nghề', location: 'Địa điểm' }
const PAGE_SIZE = 12

export default function CompanyListPage() {
  const industries = useIndustries()
  const locations = useLocations()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) ?? '']))
  const page = Number(searchParams.get('page') ?? 1)
  const [keyword, setKeyword] = useState(filters.keyword)

  const { data, loading, error, reload } = useFetch(
    () => companyApi.getAll({ ...filters, page, pageSize: PAGE_SIZE }),
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

  const nameOf = (list, id) => list.find((item) => String(item.id) === String(id))?.name ?? id
  const valueLabel = {
    keyword: (v) => `"${v}"`,
    industry: (v) => nameOf(industries, v),
    location: (v) => nameOf(locations, v),
  }
  const activeFilters = FILTER_KEYS.filter((k) => filters[k]).map((k) => ({
    key: k,
    label: FILTER_LABELS[k],
    value: valueLabel[k](filters[k]),
  }))

  const removeFilter = (key) => {
    if (key === 'keyword') setKeyword('')
    updateFilters({ [key]: '' })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Công ty</h1>
          <p className="text-muted">Tìm hiểu nhà tuyển dụng ở mọi ngành nghề và các vị trí họ đang tuyển</p>
        </div>
      </div>

      <form className="card search-panel" role="search" onSubmit={handleSearch}>
        <div className="search-row">
          <label className="input-icon">
            <span className="visually-hidden">Tên công ty</span>
            <Search />
            <input
              className="input"
              type="search"
              placeholder="Nhập tên công ty"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Tìm kiếm
          </button>
        </div>
        <div className="filter-grid filter-grid-2 open">
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
        </div>
      </form>

      <ActiveFilters items={activeFilters} onRemove={removeFilter} onClear={clearFilters} />

      {error && <ErrorState message={error} onRetry={reload} />}
      {!data && loading && <SkeletonCards count={6} label="Đang tải danh sách công ty" />}
      {data && (
        <section className={`results ${loading ? 'is-refreshing' : ''}`} aria-busy={loading} aria-label="Danh sách công ty">
          <p className="results-count" role="status">
            {loading ? (
              'Đang cập nhật kết quả...'
            ) : (
              <>
                Tìm thấy <strong>{data.count}</strong> công ty
              </>
            )}
          </p>
          {data.results.length ? (
            <div className="grid grid-3">
              {data.results.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={SearchX}
              title="Không tìm thấy công ty phù hợp"
              description="Hãy thử tên khác hoặc bỏ bớt bộ lọc."
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
