import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import jobApi from '@/api/jobApi'
import companyApi from '@/api/companyApi'
import EmptyState from '@/components/common/EmptyState'
import CompanyLogo from '@/components/common/CompanyLogo'
import Loading from '@/components/common/Loading'
import JobCard from '@/components/jobs/JobCard'
import useAuth from '@/hooks/useAuth'
import { FEATURES, ROLES } from '@/utils/constants'
import { useIndustries, useLocations } from '@/hooks/useCatalog'
import useFetch from '@/hooks/useFetch'

const POPULAR_SEARCHES = ['Kế toán', 'Marketing', 'React', 'Nhân sự', 'Kinh doanh']
const INDUSTRY_ICONS = [
  [/tài chính|ngân hàng/i, '🏦'], [/bất động sản|xây dựng/i, '🏙️'], [/marketing|truyền thông/i, '📣'],
  [/chăm sóc|dịch vụ/i, '🎧'], [/nhân sự|hành chính/i, '💼'], [/công nghệ|phần mềm|viễn thông|dữ liệu/i, '💻'],
  [/giáo dục/i, '🎓'], [/y tế|dược/i, '🩺'], [/bán lẻ|tiêu dùng/i, '🛍️'], [/sản xuất|cơ khí/i, '🏭'],
  [/logistics|vận tải/i, '🚚'], [/du lịch|khách sạn/i, '🧳'],
]

const industryIcon = (name) => INDUSTRY_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? '✳️'

const WORKFLOW = [
  { number: '01', title: 'Khám phá cơ hội', text: 'Tìm kiếm tin tuyển dụng theo vị trí, kỹ năng và địa điểm mong muốn.' },
  { number: '02', title: 'Ứng tuyển dễ dàng', text: 'Chọn CV đã tải lên và gửi hồ sơ đến nhà tuyển dụng chỉ trong vài bước.' },
  { number: '03', title: 'Theo dõi tiến trình', text: 'Quản lý các đơn ứng tuyển và cập nhật trạng thái ngay trên tài khoản.' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('all')
  const locations = useLocations()
  const industries = useIndustries()
  const { data, loading, error } = useFetch(() => jobApi.getAll({ pageSize: 100 }), [])
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

  const cta = user?.role === ROLES.RECRUITER
    ? { to: '/recruiter/jobs/new', label: 'Đăng tin tuyển dụng' }
    : FEATURES.ai
      ? { to: user ? '/cv-analysis' : '/register', label: 'Chấm điểm CV miễn phí' }
      : { to: user ? '/cv' : '/register', label: user ? 'Quản lý CV của tôi' : 'Tạo tài khoản miễn phí' }

  const searchJobs = (term = keyword) => {
    const params = new URLSearchParams()
    if (term.trim()) params.set('keyword', term.trim())
    if (location) params.set('location', location)
    navigate(`/jobs${params.size ? `?${params}` : ''}`)
  }

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-glow home-hero-glow-one" />
        <div className="home-hero-glow home-hero-glow-two" />
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <div className="home-kicker"><span /> NỀN TẢNG TUYỂN DỤNG SMART ATS</div>
            <h1>Tìm đúng công việc.<br /><span>Chạm đúng cơ hội.</span></h1>
            <p className="home-hero-description">Khám phá những vị trí phù hợp với hành trình nghề nghiệp của bạn và kết nối trực tiếp với nhà tuyển dụng.</p>
            <form className="home-search" onSubmit={(event) => { event.preventDefault(); searchJobs() }}>
              <label className="home-search-field">
                <span className="home-search-icon">⌕</span>
                <input aria-label="Từ khóa tìm việc" placeholder="Chức danh, kỹ năng hoặc công ty" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
              </label>
              <label className="home-search-location">
                <span className="home-search-icon">⌖</span>
                <select aria-label="Địa điểm làm việc" value={location} onChange={(event) => setLocation(event.target.value)}>
                  <option value="">Tất cả địa điểm</option>
                  {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <button className="btn btn-primary home-search-submit">Tìm việc <span>→</span></button>
            </form>
            <div className="home-popular"><span>Từ khóa phổ biến</span>{POPULAR_SEARCHES.map((term) => <button key={term} type="button" onClick={() => searchJobs(term)}>{term}</button>)}</div>
            <Link to={cta.to} className="btn btn-outline home-hero-cta">{cta.label}</Link>
          </div>

          <div className="home-hero-visual" aria-hidden="true">
            <div className="home-visual-orbit orbit-one" /><div className="home-visual-orbit orbit-two" />
            <div className="home-visual-card">
              <div className="home-visual-top"><span className="home-visual-logo">S</span><span><strong>Hành trình sự nghiệp</strong><small>Cơ hội tiếp theo đang chờ bạn</small></span><span className="home-visual-menu">···</span></div>
              <div className="home-visual-divider" />
              <div className="home-visual-label">KHÁM PHÁ THEO LĨNH VỰC</div>
              <div className="home-visual-job"><span className="home-company-mark mark-indigo">01</span><span><strong>Công nghệ & sản phẩm</strong><small>Phát triển · Dữ liệu · Thiết kế</small></span><span className="home-visual-arrow">↗</span></div>
              <div className="home-visual-job"><span className="home-company-mark mark-teal">02</span><span><strong>Kinh doanh & dịch vụ</strong><small>Kinh doanh · Marketing · CSKH</small></span><span className="home-visual-arrow">↗</span></div>
              <div className="home-visual-job"><span className="home-company-mark mark-amber">03</span><span><strong>Vận hành & chuyên môn</strong><small>Nhân sự · Tài chính · Vận hành</small></span><span className="home-visual-arrow">↗</span></div>
              <div className="home-visual-footer"><span><i /> Tìm kiếm theo định hướng</span><span>Cơ hội của bạn <b>→</b></span></div>
            </div>
            <div className="home-floating-note"><span>✓</span><div><strong>Kết nối trực tiếp</strong><small>Ứng tuyển trong vài bước</small></div></div>
            <div className="home-visual-decoration decoration-a">✳</div><div className="home-visual-decoration decoration-b">✦</div>
          </div>
        </div>
        <div className="home-hero-bottom"><span>Việc làm phù hợp với bạn</span><span className="home-bottom-line" /><span>Ứng tuyển dễ dàng</span><span className="home-bottom-line" /><span>Theo dõi hồ sơ thuận tiện</span></div>
      </section>

      <section className="home-workflow-section">
        <div className="home-section-heading">
          <div><span className="home-section-kicker">BẮT ĐẦU THẬT DỄ DÀNG</span><h2>Mọi bước trong hành trình tìm việc,<br />đều ở cùng một nơi.</h2></div>
          <p>Từ lúc khám phá cơ hội đến khi theo dõi hồ sơ, Smart ATS giúp bạn chủ động trong từng bước ứng tuyển.</p>
        </div>
        <div className="home-workflow-grid">{WORKFLOW.map((step) => <article className="home-workflow-card" key={step.number}><span className="home-workflow-number">{step.number}</span><div className="home-workflow-line" /><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
      </section>

      <section className="home-industries-section">
        <div className="home-section-heading home-industries-title">
          <div><span className="home-section-kicker">TÌM CƠ HỘI THEO LĨNH VỰC</span><h2>Top ngành nghề nổi bật</h2><p>Bạn muốn tìm việc mới? Chọn ngành nghề phù hợp với bạn.</p></div>
          <Link to="/jobs" className="home-view-all">Tất cả việc làm <span>→</span></Link>
        </div>
        {loading ? <Loading /> : jobsByIndustry.length > 0 ? <div className="home-industry-cards">
          {jobsByIndustry.slice(0, 8).map((industry) => <Link className="home-industry-card" to={`/jobs?industry=${industry.id}`} key={industry.id}>
            <span className="home-industry-card-icon" aria-hidden="true">{industryIcon(industry.name)}</span>
            <strong title={industry.name}>{industry.name}</strong>
            <span className="home-industry-count">{industry.jobs.length} việc làm mới</span>
          </Link>)}
        </div> : <p className="home-muted-note">Các ngành nghề sẽ xuất hiện khi có tin tuyển dụng.</p>}
      </section>

      {companyData?.results?.length > 0 && <section className="home-featured-companies">
        <div className="home-section-heading home-companies-title">
          <div><span className="home-section-kicker">DOANH NGHIỆP ĐANG TUYỂN</span><h2>Nhà tuyển dụng nổi bật</h2><p>Khám phá những công ty đang có nhiều cơ hội dành cho bạn.</p></div>
          <Link to="/jobs" className="home-view-all">Khám phá việc làm <span>→</span></Link>
        </div>
        <div className="home-company-showcase">
          {companyData.results.slice(0, 1).map((company) => <Link key={company.id} to={`/jobs?company=${company.id}`} className="home-company-feature">
            <span className="home-company-feature-orb" />
            <CompanyLogo name={company.name} src={company.logoUrl} large />
            <span className="home-company-feature-label">NHÀ TUYỂN DỤNG NỔI BẬT</span>
            <strong>{company.name}</strong><span className="home-company-industry">{company.industry}</span>
            <span className="home-company-jobs">▣ &nbsp;{company.openJobCount} việc làm đang tuyển</span>
            <span className="home-company-cta">Xem cơ hội <b>→</b></span>
          </Link>)}
          <div className="home-company-grid">
            {companyData.results.slice(1).map((company) => <Link key={company.id} to={`/jobs?company=${company.id}`} className="home-company-card">
              <CompanyLogo name={company.name} src={company.logoUrl} />
              <span className="home-company-card-copy"><strong title={company.name}>{company.name}</strong><small title={company.industry}>{company.industry}</small><span>▣ &nbsp;{company.openJobCount} việc làm</span></span>
              <span className="home-company-card-arrow" aria-hidden="true">↗</span>
            </Link>)}
          </div>
        </div>
      </section>}

      <section className="home-jobs-section">
        <div className="home-section-heading home-jobs-heading">
          <div><span className="home-section-kicker">CƠ HỘI MỚI MỖI NGÀY</span><h2>Việc làm mới nhất</h2><p>Những vị trí đang tìm kiếm ứng viên phù hợp.</p></div>
          <Link to="/jobs" className="home-view-all">Khám phá tất cả việc làm <span>→</span></Link>
        </div>
        {loading && <Loading />}
        {error && <div className="alert alert-error">Không tải được danh sách việc làm: {error}</div>}
        {!loading && !error && data?.results?.length > 0 && <>
          <div className="home-job-filters" role="group" aria-label="Lọc việc làm theo ngành">
            <button type="button" className={`home-job-filter${selectedIndustry === 'all' ? ' active' : ''}`} aria-pressed={selectedIndustry === 'all'} onClick={() => setSelectedIndustry('all')}>Tất cả</button>
            {jobsByIndustry.map((industry) => <button type="button" key={industry.id} className={`home-job-filter${selectedIndustry === String(industry.id) ? ' active' : ''}`} aria-pressed={selectedIndustry === String(industry.id)} onClick={() => setSelectedIndustry(String(industry.id))}>{industry.name}</button>)}
          </div>
          {visibleJobs.length > 0
            ? <div className="grid grid-3 home-job-grid">{visibleJobs.map((job) => <JobCard key={job.id} job={job} />)}</div>
            : <EmptyState title="Chưa có việc làm trong ngành này" description="Hãy chọn ngành khác để khám phá thêm cơ hội." />}
        </>}
        {!loading && !error && !data?.results?.length && <EmptyState title="Chưa có tin tuyển dụng mới" description="Hãy quay lại sau để xem những cơ hội mới nhất." action={<Link to="/jobs" className="btn btn-outline">Xem việc làm</Link>} />}
      </section>

    </div>
  )
}
