// Hiển thị thông tin được AI bóc tách từ file CV
export default function CVParsedInfo({ parsed, highlightSkills = [] }) {
  const highlight = new Set(highlightSkills)

  return (
    <div className="cv-parsed">
      <div className="cv-parsed-head">
        <h3>{parsed.fullName}</h3>
        <p className="text-primary">{parsed.title}</p>
        <p className="text-muted">
          {[parsed.email, parsed.phone, parsed.location].filter(Boolean).join(' · ')}
        </p>
        {parsed.links?.length > 0 && <p className="text-muted">🔗 {parsed.links.join(' · ')}</p>}
      </div>

      {parsed.summary && (
        <section>
          <h4>Giới thiệu</h4>
          <p>{parsed.summary}</p>
        </section>
      )}

      <section>
        <h4>Kỹ năng ({parsed.skills.length})</h4>
        <div className="tags">
          {parsed.skills.map((s) => (
            <span key={s} className={`tag ${highlight.has(s) ? 'tag-success' : ''}`}>
              {s}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h4>Kinh nghiệm{parsed.yearsOfExperience != null && ` · ${parsed.yearsOfExperience} năm`}</h4>
        {parsed.experience.length === 0 && <p className="text-muted">Không có.</p>}
        {parsed.experience.map((e, index) => (
          <div key={`${e.company}-${e.duration}-${index}`} className="timeline-item">
            <strong>{e.role}</strong>
            {e.company && ` — ${e.company}`}
            <div className="text-muted">{e.duration}</div>
            {e.description && <p className="pre-line">{e.description}</p>}
          </div>
        ))}
      </section>

      {parsed.education?.length > 0 && (
        <section>
          <h4>Học vấn</h4>
          {parsed.education.map((e, index) => (
            <div key={`${e.school}-${index}`} className="timeline-item">
              <strong>{e.degree}</strong>
              {e.school && ` — ${e.school}`}
              <div className="text-muted">{e.year}</div>
            </div>
          ))}
        </section>
      )}

      {parsed.projects?.length > 0 && (
        <section>
          <h4>Dự án / thành tích</h4>
          {parsed.projects.map((p, index) => (
            <div key={`${p.name}-${index}`} className="timeline-item">
              <strong>{p.name}</strong>
              {p.tech.length > 0 && <div className="text-muted">{p.tech.join(', ')}</div>}
              {p.description && <p className="pre-line">{p.description}</p>}
            </div>
          ))}
        </section>
      )}

      {(parsed.certifications?.length > 0 || parsed.languages?.length > 0) && (
        <section>
          <h4>Chứng chỉ & ngoại ngữ</h4>
          <div className="tags">
            {[...(parsed.certifications ?? []), ...(parsed.languages ?? [])].map((item, index) => (
              <span key={`${item}-${index}`} className="tag">
                {item}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
