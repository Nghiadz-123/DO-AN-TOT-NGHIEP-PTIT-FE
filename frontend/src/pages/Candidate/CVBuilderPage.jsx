import { useEffect, useMemo, useState } from 'react'
import cvBuilderApi from '@/api/cvBuilderApi'
import useAuth from '@/hooks/useAuth'
import { getErrorMessage } from '@/utils/formatters'

const blankExperience = () => ({ role: '', company: '', period: '', description: '' })
const blankEducation = () => ({ degree: '', school: '', period: '', description: '' })

function initialCV(user) {
  return {
    fullName: user?.fullName || '', title: user?.title || '', email: user?.email || '',
    phone: user?.phone || '', location: user?.location || '', website: '',
    summary: user?.about || '', skills: '', experiences: [blankExperience()],
    educations: [blankEducation()], projects: '',
  }
}

function Field({ label, value, onChange, placeholder, multiline = false, rows = 3, type = 'text' }) {
  const shared = { value, onChange: (event) => onChange(event.target.value), placeholder }
  return <label className="form-group cv-builder-field"><span>{label}</span>{multiline ? <textarea className="input" rows={rows} {...shared} /> : <input className="input" type={type} {...shared} />}</label>
}

export default function CVBuilderPage() {
  const { user } = useAuth()
  const [cv, setCV] = useState(() => initialCV(user))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)
  const skills = useMemo(() => cv.skills.split(',').map((skill) => skill.trim()).filter(Boolean), [cv.skills])

  useEffect(() => {
    let active = true
    cvBuilderApi.getMine(user?.id || user?.email).then((document) => {
      if (active && document?.content) setCV({ ...initialCV(user), ...document.content })
    }).catch((error) => {
      if (active) setSaveMessage({ type: 'error', text: getErrorMessage(error) })
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user])

  const update = (field, value) => { setCV((current) => ({ ...current, [field]: value })); setSaveMessage(null) }
  const updateItem = (key, index, field, value) => {
    setSaveMessage(null)
    setCV((current) => ({
      ...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }))
  }
  const removeItem = (key, index) => {
    setSaveMessage(null)
    setCV((current) => ({ ...current, [key]: current[key].filter((_, itemIndex) => itemIndex !== index) }))
  }
  const saveCV = async () => {
    setSaving(true)
    setSaveMessage(null)
    try {
      await cvBuilderApi.save(user?.id || user?.email, cv)
      setSaveMessage({ type: 'success', text: 'CV đã được lưu thành công.' })
    } catch (error) {
      setSaveMessage({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cv-builder-page">
      <div className="page-header cv-builder-heading">
        <div><span className="cv-builder-kicker">HỒ SƠ CHUYÊN NGHIỆP</span><h1>Tạo CV của bạn</h1><p className="text-muted">Điền thông tin, xem trước CV và nhấn Lưu để lưu vào tài khoản.</p></div>
        <div className="actions"><button className="btn btn-outline" type="button" onClick={saveCV} disabled={saving || loading}>{saving ? 'Đang lưu…' : 'Lưu'}</button><button className="btn btn-primary" type="button" onClick={() => window.print()}>↓ Tải CV dạng PDF</button></div>
      </div>

      {saveMessage && <div className={`alert alert-${saveMessage.type}`}>{saveMessage.text}</div>}
      {loading && <div className="cv-builder-loading">Đang tải CV đã lưu…</div>}

      <div className="cv-builder-layout">
        <form className="cv-builder-form" onSubmit={(event) => event.preventDefault()}>
          <section className="card cv-form-section"><div className="cv-section-title"><span>01</span><div><h2>Thông tin cá nhân</h2><p>Thông tin để nhà tuyển dụng liên hệ với bạn.</p></div></div>
            <div className="cv-form-grid">
              <Field label="Họ và tên" value={cv.fullName} onChange={(v) => update('fullName', v)} placeholder="Nguyễn Minh Anh" />
              <Field label="Vị trí ứng tuyển" value={cv.title} onChange={(v) => update('title', v)} placeholder="Frontend Developer" />
              <Field label="Email" value={cv.email} onChange={(v) => update('email', v)} placeholder="ban@email.com" type="email" />
              <Field label="Số điện thoại" value={cv.phone} onChange={(v) => update('phone', v)} placeholder="09xx xxx xxx" />
              <Field label="Địa điểm" value={cv.location} onChange={(v) => update('location', v)} placeholder="Hà Nội, Việt Nam" />
              <Field label="LinkedIn / Portfolio" value={cv.website} onChange={(v) => update('website', v)} placeholder="linkedin.com/in/tenban" />
            </div>
          </section>

          <section className="card cv-form-section"><div className="cv-section-title"><span>02</span><div><h2>Giới thiệu</h2><p>Tóm tắt kinh nghiệm và thế mạnh của bạn.</p></div></div>
            <Field label="Tóm tắt nghề nghiệp" value={cv.summary} onChange={(v) => update('summary', v)} placeholder="Mô tả ngắn gọn kinh nghiệm, thế mạnh và mục tiêu nghề nghiệp…" multiline rows={4} />
          </section>

          <section className="card cv-form-section"><div className="cv-section-title"><span>03</span><div><h2>Kinh nghiệm làm việc</h2><p>Nêu bật đóng góp và kết quả cụ thể của bạn.</p></div></div>
            {cv.experiences.map((item, index) => <div className="cv-repeat-item" key={`experience-${index}`}>
              <div className="cv-repeat-head"><strong>Kinh nghiệm {index + 1}</strong>{cv.experiences.length > 1 && <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeItem('experiences', index)}>Xóa</button>}</div>
              <div className="cv-form-grid"><Field label="Chức danh" value={item.role} onChange={(v) => updateItem('experiences', index, 'role', v)} placeholder="Kỹ sư phần mềm" /><Field label="Công ty" value={item.company} onChange={(v) => updateItem('experiences', index, 'company', v)} placeholder="Tên công ty" /><Field label="Thời gian" value={item.period} onChange={(v) => updateItem('experiences', index, 'period', v)} placeholder="06/2023 – Hiện tại" /><Field label="Mô tả công việc và thành tựu" value={item.description} onChange={(v) => updateItem('experiences', index, 'description', v)} placeholder="• Xây dựng…\n• Cải thiện…" multiline rows={3} /></div>
            </div>)}
            <button className="btn btn-outline" type="button" onClick={() => update('experiences', [...cv.experiences, blankExperience()])}>＋ Thêm kinh nghiệm</button>
          </section>

          <section className="card cv-form-section"><div className="cv-section-title"><span>04</span><div><h2>Học vấn</h2><p>Bằng cấp, khóa học hoặc chứng chỉ liên quan.</p></div></div>
            {cv.educations.map((item, index) => <div className="cv-repeat-item" key={`education-${index}`}>
              <div className="cv-repeat-head"><strong>Học vấn {index + 1}</strong>{cv.educations.length > 1 && <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeItem('educations', index)}>Xóa</button>}</div>
              <div className="cv-form-grid"><Field label="Bằng cấp / chuyên ngành" value={item.degree} onChange={(v) => updateItem('educations', index, 'degree', v)} placeholder="Cử nhân Công nghệ thông tin" /><Field label="Trường học" value={item.school} onChange={(v) => updateItem('educations', index, 'school', v)} placeholder="Tên trường đại học" /><Field label="Thời gian" value={item.period} onChange={(v) => updateItem('educations', index, 'period', v)} placeholder="2020 – 2024" /><Field label="Mô tả thêm" value={item.description} onChange={(v) => updateItem('educations', index, 'description', v)} placeholder="GPA, thành tích, hoạt động…" /></div>
            </div>)}
            <button className="btn btn-outline" type="button" onClick={() => update('educations', [...cv.educations, blankEducation()])}>＋ Thêm học vấn</button>
          </section>

          <section className="card cv-form-section"><div className="cv-section-title"><span>05</span><div><h2>Kỹ năng & dự án</h2><p>Phân tách các kỹ năng bằng dấu phẩy.</p></div></div>
            <Field label="Kỹ năng" value={cv.skills} onChange={(v) => update('skills', v)} placeholder="React, JavaScript, Figma, Giao tiếp…" />
            <Field label="Dự án tiêu biểu" value={cv.projects} onChange={(v) => update('projects', v)} placeholder="Tên dự án — vai trò, công nghệ và kết quả đạt được…" multiline rows={4} />
          </section>
        </form>

        <aside className="cv-preview-column"><div className="cv-preview-toolbar"><div><strong>Xem trước CV</strong><small>A4 · Tự cập nhật</small></div><span className="cv-live-dot">Trực tiếp</span></div>
          <article className="cv-paper">
            <header className="cv-paper-header"><h1>{cv.fullName || 'Họ và tên của bạn'}</h1><p>{cv.title || 'Vị trí ứng tuyển'}</p><div className="cv-contact">{[cv.email, cv.phone, cv.location, cv.website].filter(Boolean).map((value) => <span key={value}>{value}</span>)}</div></header>
            {cv.summary && <section className="cv-paper-section"><h2>GIỚI THIỆU</h2><p>{cv.summary}</p></section>}
            {cv.experiences.some((item) => item.role || item.company || item.description) && <section className="cv-paper-section"><h2>KINH NGHIỆM LÀM VIỆC</h2>{cv.experiences.filter((item) => item.role || item.company || item.description).map((item, index) => <div className="cv-paper-entry" key={index}><div className="cv-paper-entry-top"><strong>{item.role || 'Chức danh'}</strong><span>{item.period}</span></div><div className="cv-paper-subtitle">{item.company}</div>{item.description && <p>{item.description}</p>}</div>)}</section>}
            {cv.educations.some((item) => item.degree || item.school || item.description) && <section className="cv-paper-section"><h2>HỌC VẤN</h2>{cv.educations.filter((item) => item.degree || item.school || item.description).map((item, index) => <div className="cv-paper-entry" key={index}><div className="cv-paper-entry-top"><strong>{item.degree || 'Bằng cấp'}</strong><span>{item.period}</span></div><div className="cv-paper-subtitle">{item.school}</div>{item.description && <p>{item.description}</p>}</div>)}</section>}
            {skills.length > 0 && <section className="cv-paper-section"><h2>KỸ NĂNG</h2><div className="cv-skill-list">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div></section>}
            {cv.projects && <section className="cv-paper-section"><h2>DỰ ÁN</h2><p>{cv.projects}</p></section>}
            {!cv.summary && !cv.experiences.some((item) => item.role || item.company || item.description) && !cv.educations.some((item) => item.degree || item.school) && !skills.length && !cv.projects && <div className="cv-preview-empty"><strong>CV của bạn đang dần hoàn thiện</strong><p>Điền các mục bên trái để xem nội dung xuất hiện tại đây.</p></div>}
          </article>
          <p className="cv-print-hint">Chọn “Lưu thành PDF” trong cửa sổ in để tải CV về máy.</p>
        </aside>
      </div>
    </div>
  )
}
