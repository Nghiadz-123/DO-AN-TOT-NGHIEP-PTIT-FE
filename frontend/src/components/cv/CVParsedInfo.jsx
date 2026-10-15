// Hiển thị thông tin được AI bóc tách từ file CV
export default function CVParsedInfo({ parsed, highlightSkills = [] }) {
  const highlight = new Set(highlightSkills)
  const skills = parsed.skills ?? []
  const experience = parsed.experience ?? []
  const education = parsed.education ?? []

  return (
    <div className="cv-parsed">
      <div className="cv-parsed-head">
        {parsed.fullName && <h3>{parsed.fullName}</h3>}
        {parsed.title && <p className="text-primary">{parsed.title}</p>}
        <p className="text-muted">
          {[parsed.email, parsed.phone, parsed.location].filter(Boolean).join(' · ')}
        </p>
        {parsed.links?.length > 0 && <p className="text-muted">🔗 {parsed.links.join(' · ')}</p>}
      </div>

      {parsed.stats && (
        <div className="tags">
          {parsed.stats.pages != null && <span className="tag">{parsed.stats.pages} trang</span>}
          <span className="tag">{parsed.stats.words ?? 0} từ</span>
        </div>
      )}

      {parsed.summary && (
        <section>
          <h4>Giới thiệu</h4>
          <p>{parsed.summary}</p>
        </section>
      )}

      {skills.length > 0 && <section>
        <h4>Kỹ năng ({skills.length})</h4>
        <div className="tags">
          {skills.map((s) => (
            <span key={s} className={`tag ${highlight.has(s) ? 'tag-success' : ''}`}>
              {s}
            </span>
          ))}
        </div>
      </section>}

      {experience.length > 0 && <section>
        <h4>Kinh nghiệm · {parsed.yearsOfExperience} năm</h4>
        {experience.map((e) => (
          <div key={`${e.company}-${e.duration}`} className="timeline-item">
            <strong>{e.role}</strong> — {e.company}
            <div className="text-muted">{e.duration}</div>
            <p>{e.description}</p>
          </div>
        ))}
      </section>}

      {education.length > 0 && (
        <section>
          <h4>Học vấn</h4>
          {parsed.education.map((e) => (
            <div key={e.school} className="timeline-item">
              <strong>{e.degree}</strong> — {e.school}
              <div className="text-muted">{e.year}</div>
            </div>
          ))}
        </section>
      )}
      {parsed.rawText && <section>
        <h4>Nội dung đọc được</h4>
        <div className="card card-flat pre-line cv-raw-text">{parsed.rawText}</div>
      </section>}
    </div>
  )
}
