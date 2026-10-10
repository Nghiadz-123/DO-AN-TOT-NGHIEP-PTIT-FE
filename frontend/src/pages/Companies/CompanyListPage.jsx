import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import companyApi from '@/api/companyApi'
import EmptyState from '@/components/common/EmptyState'
import HoverSelect from '@/components/common/HoverSelect'
import Loading from '@/components/common/Loading'
import Pagination from '@/components/common/Pagination'
import CompanyCard from '@/components/companies/CompanyCard'
import { useIndustries, useLocations } from '@/hooks/useCatalog'
import useFetch from '@/hooks/useFetch'

const FILTER_KEYS = ['keyword', 'industry', 'location']
const PAGE_SIZE = 12

export default function CompanyListPage() {
  const industries = useIndustries()
  const locations = useLocations()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) ?? '']))
  const page = Number(searchParams.get('page') ?? 1)
  const [keyword, setKeyword] = useState(filters.keyword)

  const { data, loading, error } = useFetch(
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

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Công ty</h1>
          <p className="text-muted">Tìm hiểu nhà tuyển dụng ở mọi ngành nghề và các vị trí họ đang tuyển</p>
        </div>
      </div>

      <form className="card filter-bar" onSubmit={handleSearch}>
        <input
          className="input filter-keyword"
          placeholder="Nhập tên công ty"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <HoverSelect
          placeholder="Tất cả ngành nghề"
          value={filters.industry}
          options={industries.map((i) => ({ value: i.id, label: i.name }))}
          onChange={(industry) => updateFilters({ industry })}
        />
        <HoverSelect
          placeholder="Tất cả địa điểm"
          value={filters.location}
          options={locations.map((l) => ({ value: l.id, label: l.name }))}
          onChange={(location) => updateFilters({ location })}
        />
        <button className="btn btn-primary">Tìm kiếm</button>
      </form>

      {loading && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}
      {data && !loading && (
        <>
          <p className="text-muted">Tìm thấy {data.count} công ty</p>
          {data.results.length ? (
            <div className="grid grid-3">
              {data.results.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Không tìm thấy công ty phù hợp"
              description="Hãy thử tên khác hoặc bỏ bớt bộ lọc."
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
