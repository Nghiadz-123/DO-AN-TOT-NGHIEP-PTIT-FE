import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import jobApi from '@/api/jobApi'
import Loading from '@/components/common/Loading'
import JobCard from '@/components/jobs/JobCard'
import useAuth from '@/hooks/useAuth'
import { useLocations } from '@/hooks/useCatalog'
import useFetch from '@/hooks/useFetch'
import { FEATURES, ROLES } from '@/utils/constants'

const AI_FEATURES = [
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

// Khi backend chưa có module AI: giới thiệu các chức năng dành cho nhà tuyển dụng đã có
const EMPLOYER_FEATURES = [
  { icon: '📝', title: 'Đăng tin nhanh', text: 'Soạn tin, lưu nháp và đăng tin tuyển dụng chỉ trong vài phút.' },
  { icon: '📋', title: 'Quản lý tin tập trung', text: 'Theo dõi trạng thái, hạn nộp, tạm dừng hoặc đóng tin bất kỳ lúc nào.' },
  { icon: '👥', title: 'Pipeline ứng viên', text: 'Đưa ứng viên qua các vòng sàng lọc, phỏng vấn, đề nghị và tuyển dụng.' },
  { icon: '🏢', title: 'Hồ sơ công ty', text: 'Xây dựng thương hiệu tuyển dụng với logo và thông tin công ty.' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const locations = useLocations()
  const { data: jobs, loading } = useFetch(() => jobApi.getAll({ pageSize: 6 }), [])

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
      : FEATURES.candidate
        ? { to: user ? '/cv-analysis' : '/register', label: 'Chấm điểm CV miễn phí' }
        : { to: '/register', label: 'Đăng tin tuyển dụng miễn phí' }
  const features = FEATURES.ai ? AI_FEATURES : EMPLOYER_FEATURES

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
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary">Tìm kiếm</button>
        </form>
        <Link to={cta.to} className="btn btn-outline">
          {cta.label}
        </Link>
      </section>

      <section className="grid grid-4 features">
        {features.map((f) => (
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
            {jobs?.results.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
