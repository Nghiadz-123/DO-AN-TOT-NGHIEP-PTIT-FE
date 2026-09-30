import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import jobApi from '@/api/jobApi'
import Loading from '@/components/common/Loading'
import JobCard from '@/components/jobs/JobCard'
import useAuth from '@/hooks/useAuth'
import useFetch from '@/hooks/useFetch'
import { LOCATIONS, ROLES } from '@/utils/constants'

const FEATURES = [
  {
    icon: '📄',
    title: 'AI chấm điểm CV',
    text: 'Tải CV lên, AI bóc tách thông tin, chấm điểm từng phần và chỉ ra điểm mạnh, điểm yếu.',
  },
  {
    icon: '💡',
    title: 'Gợi ý cải thiện CV',
    text: 'Nhận gợi ý cụ thể kèm ví dụ để CV thu hút nhà tuyển dụng và vượt qua hệ thống ATS.',
  },
  {
    icon: '🎯',
    title: 'Việc làm phù hợp',
    text: 'AI so khớp kỹ năng, kinh nghiệm trong CV với yêu cầu tuyển dụng để đề xuất công việc.',
  },
  {
    icon: '🤖',
    title: 'AI sàng lọc ứng viên',
    text: 'Nhà tuyển dụng chấm điểm, xếp hạng hàng loạt hồ sơ và lọc ra ứng viên tiềm năng.',
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const { data: jobs, loading } = useFetch(() => jobApi.getAll(), [])

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (keyword) params.set('keyword', keyword)
    if (location) params.set('location', location)
    navigate(`/jobs?${params}`)
  }

  const cta =
    user?.role === ROLES.RECRUITER
      ? { to: '/recruiter/jobs/new', label: 'Đăng tin tuyển dụng' }
      : { to: user ? '/cv-analysis' : '/register', label: 'Chấm điểm CV miễn phí' }

  return (
    <>
      <section className="hero">
        <h1>
          Tìm việc thông minh hơn với <span className="text-primary">AI</span>
        </h1>
        <p>Nền tảng tuyển dụng tích hợp AI: chấm điểm CV, gợi ý việc làm và sàng lọc ứng viên tự động.</p>
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            className="input"
            placeholder="Vị trí, kỹ năng, công ty..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <select className="input" value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">Tất cả địa điểm</option>
            {LOCATIONS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <button className="btn btn-primary">Tìm kiếm</button>
        </form>
        <Link to={cta.to} className="btn btn-outline">
          {cta.label}
        </Link>
      </section>

      <section className="grid grid-4 features">
        {FEATURES.map((f) => (
          <div key={f.title} className="card feature">
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p className="text-muted">{f.text}</p>
          </div>
        ))}
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
            {jobs?.slice(0, 6).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
