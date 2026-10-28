import { Link, useSearchParams } from 'react-router-dom'
import { Heart } from 'lucide-react'
import favoriteApi from '@/api/favoriteApi'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import Pagination from '@/components/common/Pagination'
import { SkeletonCards } from '@/components/common/Skeleton'
import CompanyCard from '@/components/companies/CompanyCard'
import JobCard from '@/components/jobs/JobCard'
import useFavorites from '@/hooks/useFavorites'
import useFetch from '@/hooks/useFetch'

const PAGE_SIZE = 12

const TABS = {
  jobs: {
    label: 'Việc làm',
    type: 'job',
    fetch: favoriteApi.getJobs,
    empty: { title: 'Chưa có việc làm yêu thích', action: { to: '/jobs', label: 'Tìm việc làm' } },
  },
  companies: {
    label: 'Công ty',
    type: 'company',
    fetch: favoriteApi.getCompanies,
    empty: { title: 'Chưa có công ty yêu thích', action: { to: '/companies', label: 'Xem các công ty' } },
  },
}

export default function FavoritesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'companies' ? 'companies' : 'jobs'
  const page = Number(searchParams.get('page') ?? 1)
  const { loaded, isFavorite, count } = useFavorites()
  const current = TABS[tab]

  const { data, loading, error, reload } = useFetch(() => current.fetch({ page, pageSize: PAGE_SIZE }), [tab, page])

  // Bỏ yêu thích ngay trên trang thì mục đó ẩn đi, không cần tải lại
  const items = data && (loaded ? data.results.filter((item) => isFavorite(current.type, item.id)) : data.results)

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Yêu thích</h1>
          <p className="text-muted">Việc làm và công ty bạn đã lưu để xem lại hoặc ứng tuyển sau</p>
        </div>
      </div>

      <div className="segmented" role="group" aria-label="Loại mục yêu thích">
        {Object.entries(TABS).map(([key, meta]) => {
          const total = count(meta.type)
          return (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => setSearchParams({ tab: key })}
            >
              {meta.label}
              {total !== null && <span className="segmented-count">({total})</span>}
            </button>
          )
        })}
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && <SkeletonCards count={3} label="Đang tải danh sách yêu thích" />}
      {items && !loading && (
        <>
          {items.length ? (
            <div className="grid grid-3">
              {items.map((item) =>
                tab === 'jobs' ? <JobCard key={item.id} job={item} /> : <CompanyCard key={item.id} company={item} />,
              )}
            </div>
          ) : (
            <EmptyState
              icon={Heart}
              title={current.empty.title}
              description="Bấm biểu tượng trái tim trên việc làm hoặc công ty để thêm vào đây."
              action={
                <Link to={current.empty.action.to} className="btn btn-primary">
                  {current.empty.action.label}
                </Link>
              }
            />
          )}
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            count={data.count}
            onChange={(p) => setSearchParams({ tab, page: String(p) })}
          />
        </>
      )}
    </>
  )
}
