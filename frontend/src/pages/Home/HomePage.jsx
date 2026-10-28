import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Briefcase,
  Building,
  ClipboardList,
  Factory,
  GraduationCap,
  Headset,
  Landmark,
  Laptop,
  Luggage,
  MapPin,
  Megaphone,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Truck,
  Users,
} from 'lucide-react'
import companyApi from '@/api/companyApi'
import jobApi from '@/api/jobApi'
import CompanyLogo from '@/components/common/CompanyLogo'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import { SkeletonCards } from '@/components/common/Skeleton'
import JobCard from '@/components/jobs/JobCard'
import useAuth from '@/hooks/useAuth'
import { FEATURES, ROLES } from '@/utils/constants'
import { useIndustries, useLocations } from '@/hooks/useCatalog'
import useFetch from '@/hooks/useFetch'

const POPULAR_SEARCHES = ['Kế toán', 'Marketing', 'React', 'Nhân sự', 'Kinh doanh']
const INDUSTRY_ICONS = [
  [/tài chính|ngân hàng/i, Landmark], [/bất động sản|xây dựng/i, Building], [/marketing|truyền thông/i, Megaphone],
  [/chăm sóc|dịch vụ/i, Headset], [/nhân sự|hành chính/i, Users], [/công nghệ|phần mềm|viễn thông|dữ liệu/i, Laptop],
  [/giáo dục/i, GraduationCap], [/y tế|dược/i, Stethoscope], [/bán lẻ|tiêu dùng/i, ShoppingBag], [/sản xuất|cơ khí/i, Factory],
  [/logistics|vận tải/i, Truck], [/du lịch|khách sạn/i, Luggage],
]

const industryIcon = (name) => INDUSTRY_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? Briefcase

const WORKFLOW = [
  { icon: Search, title: 'Khám phá cơ hội', text: 'Tìm kiếm tin tuyển dụng theo vị trí, kỹ năng và địa điểm mong muốn.' },
  { icon: Send, title: 'Ứng tuyển dễ dàng', text: 'Chọn CV đã tải lên và gửi hồ sơ đến nhà tuyển dụng chỉ trong vài bước.' },
  { icon: ClipboardList, title: 'Theo dõi tiến trình', text: 'Quản lý các đơn ứng tuyển và cập nhật trạng thái ngay trên tài khoản.' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('all')
  const locations = useLocations()
  const industries = useIndustries()
  const { data, loading, error, reload } = useFetch(() => jobApi.getAll({ pageSize: 100 }), [])
  const { data: companyData } = useFetch(() => companyApi.getAll({ pageSize: 8 }), [])
  const jobsByIndustry = useMemo(() => {
    const groups = new Map()
    for (const job of data?.results ?? []) {
      const industryId = String(job.industryId ?? '')
      if (!industryId) continue
      const group = groups.get(industryId) ?? []
      group.push(job)
      groups.set(industryId, group)
    }
    return industries
      .map((industry) => ({ ...industry, jobs: groups.get(String(industry.id)) ?? [] }))
      .filter((industry) => industry.jobs.length)
  }, [data, industries])
  const visibleJobs = selectedIndustry === 'all'
    ? (data?.results ?? []).slice(0, 6)
    : (jobsByIndustry.find((industry) => String(industry.id) === selectedIndustry)?.jobs ?? []).slice(0, 6)

  const cta =
    user?.role === ROLES.RECRUITER
      ? { to: '/recruiter/jobs/new', label: 'Đăng tin tuyển dụng', text: 'Đăng tin và quản lý hồ sơ ứng viên ở cùng một nơi.', icon: Briefcase }
      : FEATURES.candidateAi
        ? {
            to: user ? '/cv-analysis' : '/register',
            label: 'Chấm điểm CV miễn phí',
            text: 'AI chấm CV theo 5 tiêu chí và gợi ý cách sửa dựa trên tin tuyển dụng thật.',
            icon: Sparkles,
            ai: true,
          }
        : {
            to: user ? '/cv' : '/register',
            label: user ? 'Quản lý CV của tôi' : 'Tạo tài khoản miễn phí',
            text: 'Tải CV lên một lần, ứng tuyển nhanh vào mọi tin.',
            icon: Send,
          }

  // Số liệu thật từ dữ liệu đã tải (không gọi thêm API)
  const stats = [
    { label: 'việc làm đang tuyển', value: data?.count },
    { label: 'doanh nghiệp', value: companyData?.count },
    { label: 'ngành nghề đang tuyển', value: data ? jobsByIndustry.length : undefined },
  ]

  const searchJobs = (term = keyword) => {
    const params = new URLSearchParams()
    if (term.trim()) params.set('keyword', term.trim())
    if (location) params.set('location', location)
    navigate(`/jobs${params.size ? `?${params}` : ''}`)
  }

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="container home-hero-inner">
          <div className="home-hero-copy">
            <p className="eyebrow home-eyebrow">Nền tảng tuyển dụng đa ngành nghề</p>
            <h1 id="home-title">
              Tìm đúng công việc. <span>Chạm đúng cơ hội.</span>
            </h1>
            <p className="home-hero-description">
              Khám phá những vị trí phù hợp với hành trình nghề nghiệp của bạn và kết nối trực tiếp với nhà tuyển dụng.
            </p>
            <form className="home-search" role="search" onSubmit={(event) => { event.preventDefault(); searchJobs() }}>
              <label className="home-search-field">
                <Search />
                <span className="visually-hidden">Từ khóa tìm việc</span>
                <input type="search" placeholder="Chức danh, kỹ năng hoặc công ty" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
              </label>
              <label className="home-search-field home-search-location">
                <MapPin />
                <span className="visually-hidden">Địa điểm làm việc</span>
                <select value={location} onChange={(event) => setLocation(event.target.value)}>
                  <option value="">Tất cả địa điểm</option>
                  {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <button type="submit" className="btn btn-primary btn-lg">Tìm việc <ArrowRight /></button>
            </form>
            <div className="home-popular">
              <span id="home-popular-label">Từ khóa phổ biến:</span>
              <ul className="chip-list" aria-labelledby="home-popular-label">
                {POPULAR_SEARCHES.map((term) => (
                  <li key={term}>
                    <button type="button" className="chip chip-on-dark" onClick={() => searchJobs(term)}>{term}</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="home-hero-panel" aria-label="Smart ATS hôm nay">
            <dl className="home-stats">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value ?? '—'}</dd>
                </div>
              ))}
            </dl>
            <div className="home-hero-cta">
              <span className={`icon-tile ${cta.ai ? 'icon-tile-ai' : ''}`}><cta.icon /></span>
              <div>
                <strong>{cta.label}</strong>
                <p>{cta.text}</p>
              </div>
              <Link to={cta.to} className="btn btn-primary btn-block">{cta.label} <ArrowRight /></Link>
            </div>
          </aside>
        </div>
      </section>

      <div className="container home-sections">
        <section aria-labelledby="home-industries-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Tìm cơ hội theo lĩnh vực</p>
              <h2 id="home-industries-title">Ngành nghề nổi bật</h2>
              <p className="text-muted">Chọn ngành nghề phù hợp để xem các vị trí đang tuyển.</p>
            </div>
            <Link to="/jobs" className="btn btn-ghost">Tất cả việc làm <ArrowRight /></Link>
          </div>
          {loading ? (
            <div className="home-industry-grid" role="status" aria-label="Đang tải ngành nghề">
              {Array.from({ length: 8 }, (_, i) => <span key={i} className="skeleton home-industry-skeleton" aria-hidden="true" />)}
            </div>
          ) : jobsByIndustry.length > 0 ? (
            <ul className="home-industry-grid">
              {jobsByIndustry.slice(0, 8).map((industry) => {
                const Icon = industryIcon(industry.name)
                return (
                  <li key={industry.id}>
                    <Link className="home-industry-card" to={`/jobs?industry=${industry.id}`}>
                      <span className="icon-tile"><Icon /></span>
                      <span className="home-industry-text">
                        <span className="home-industry-name" title={industry.name}>{industry.name}</span>
                        <span className="home-industry-count">{industry.jobs.length} việc làm</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-muted">Các ngành nghề sẽ xuất hiện khi có tin tuyển dụng.</p>
          )}
        </section>

        <section aria-labelledby="home-jobs-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Cơ hội mới mỗi ngày</p>
              <h2 id="home-jobs-title">Việc làm mới nhất</h2>
              <p className="text-muted">Những vị trí đang tìm kiếm ứng viên phù hợp.</p>
            </div>
            <Link to="/jobs" className="btn btn-ghost">Khám phá tất cả việc làm <ArrowRight /></Link>
          </div>
          {loading && <SkeletonCards count={3} label="Đang tải việc làm mới" />}
          {error && <ErrorState message={`Không tải được danh sách việc làm: ${error}`} onRetry={reload} />}
          {!loading && !error && data?.results?.length > 0 && <>
            <div className="chip-list home-job-filters" role="group" aria-label="Lọc việc làm theo ngành">
              <button type="button" className="chip" aria-pressed={selectedIndustry === 'all'} onClick={() => setSelectedIndustry('all')}>Tất cả</button>
              {jobsByIndustry.map((industry) => <button type="button" key={industry.id} className="chip" aria-pressed={selectedIndustry === String(industry.id)} onClick={() => setSelectedIndustry(String(industry.id))}>{industry.name}</button>)}
            </div>
            {visibleJobs.length > 0
              ? <div className="grid grid-3">{visibleJobs.map((job) => <JobCard key={job.id} job={job} />)}</div>
              : <EmptyState title="Chưa có việc làm trong ngành này" description="Hãy chọn ngành khác để khám phá thêm cơ hội." />}
          </>}
          {!loading && !error && !data?.results?.length && <EmptyState icon={Briefcase} title="Chưa có tin tuyển dụng mới" description="Hãy quay lại sau để xem những cơ hội mới nhất." action={<Link to="/jobs" className="btn btn-outline">Xem việc làm</Link>} />}
        </section>

        {companyData?.results?.length > 0 && (
          <section aria-labelledby="home-companies-title">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Doanh nghiệp đang tuyển</p>
                <h2 id="home-companies-title">Nhà tuyển dụng nổi bật</h2>
                <p className="text-muted">Khám phá những công ty đang có nhiều cơ hội dành cho bạn.</p>
              </div>
              <Link to="/companies" className="btn btn-ghost">Xem các công ty <ArrowRight /></Link>
            </div>
            <ul className="home-company-grid">
              {companyData.results.map((company) => (
                <li key={company.id}>
                  <Link to={`/jobs?company=${company.id}`} className="home-company-card">
                    <CompanyLogo name={company.name} src={company.logoUrl} />
                    <span className="home-company-info">
                      <strong title={company.name}>{company.name}</strong>
                      <small title={company.industry}>{company.industry}</small>
                    </span>
                    <span className="badge badge-primary">{company.openJobCount} việc làm</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="home-how-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Bắt đầu thật dễ dàng</p>
              <h2 id="home-how-title">Mọi bước tìm việc ở cùng một nơi</h2>
              <p className="text-muted">Từ lúc khám phá cơ hội đến khi theo dõi hồ sơ, Smart ATS giúp bạn chủ động trong từng bước.</p>
            </div>
          </div>
          <ol className="home-steps">
            {WORKFLOW.map((step, index) => (
              <li key={step.title} className="home-step">
                <span className="icon-tile"><step.icon /></span>
                <span className="home-step-number">Bước {index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
