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
        <h4>Kinh nghiệm · {parsed.yearsOfExperience} năm</h4>
        {parsed.experience.map((e) => (
          <div key={`${e.company}-${e.duration}`} className="timeline-item">
            <strong>{e.role}</strong> — {e.company}
            <div className="text-muted">{e.duration}</div>
            <p>{e.description}</p>
          </div>
        ))}
      </section>

      {parsed.education?.length > 0 && (
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
    </div>
  )
}
