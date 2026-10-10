import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import jobApi from '@/api/jobApi'
import HoverSelect from '@/components/common/HoverSelect'
import Loading from '@/components/common/Loading'
import JobCard from '@/components/jobs/JobCard'
import useAuth from '@/hooks/useAuth'
import { useIndustries, useLocations } from '@/hooks/useCatalog'
import useFetch from '@/hooks/useFetch'
import { FEATURES, JOB_LEVELS, POSTED_WITHIN, ROLES } from '@/utils/constants'

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [keyword, setKeyword] = useState('')
  // Bộ lọc gửi sang trang /jobs: industry, location, level, posted (cùng tên tham số URL của trang đó)
  const [filters, setFilters] = useState({ industry: '', location: '', level: '', posted: '' })
  const industries = useIndustries()
  const locations = useLocations()
  const { data: jobs, loading } = useFetch(() => jobApi.getAll({ pageSize: 6 }), [])

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams(Object.entries({ keyword: keyword.trim(), ...filters }).filter(([, v]) => v))
    navigate(`/jobs?${params}`)
  }

  const cta =
    user?.role === ROLES.RECRUITER
      ? { to: '/recruiter/jobs/new', label: 'Đăng tin tuyển dụng' }
      : FEATURES.ai
        ? { to: user ? '/cv-analysis' : '/register', label: 'Chấm điểm CV miễn phí' }
        : { to: user ? '/cv' : '/register', label: user ? 'Quản lý CV của tôi' : 'Tạo tài khoản miễn phí' }

  return (
    <>
      <section className="hero">
        <h1>
          Việc làm cho <span className="text-primary">mọi ngành nghề</span>
        </h1>
        <p>
          Kết nối ứng viên và nhà tuyển dụng trong kinh doanh, kế toán, sản xuất, y tế, giáo dục, dịch vụ, công nghệ...
          {FEATURES.ai && ' Tích hợp AI chấm điểm CV, gợi ý việc làm và sàng lọc ứng viên.'}
        </p>
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            className="input"
            placeholder="Vị trí, kỹ năng, công ty (VD: kế toán, lái xe, giáo viên)..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <HoverSelect
            placeholder="Tất cả ngành nghề"
            value={filters.industry}
            options={industries.map((i) => ({ value: i.id, label: i.name }))}
            onChange={(industry) => setFilters({ ...filters, industry })}
          />
          <HoverSelect
            placeholder="Tất cả địa điểm"
            value={filters.location}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
            onChange={(location) => setFilters({ ...filters, location })}
          />
          <HoverSelect
            placeholder="Tất cả cấp bậc"
            value={filters.level}
            options={JOB_LEVELS}
            onChange={(level) => setFilters({ ...filters, level })}
          />
          <HoverSelect
            placeholder="Đăng bất kỳ lúc nào"
            value={filters.posted}
            options={POSTED_WITHIN}
            onChange={(posted) => setFilters({ ...filters, posted })}
          />
          <button className="btn btn-primary">Tìm kiếm</button>
        </form>
        <Link to={cta.to} className="btn btn-outline">
          {cta.label}
        </Link>
      </section>

      <section>
        <div className="page-header">
          <h2>Việc làm mới nhất</h2>
          <Link to="/jobs">Xem tất cả →</Link>
        </div>
        {loading ? (
          <Loading />
        ) : (
          <div className="grid grid-3">
            {jobs?.results.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
