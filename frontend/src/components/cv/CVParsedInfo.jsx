import { Link as LinkIcon } from 'lucide-react'

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
        {parsed.links?.length > 0 && (
          <p className="text-muted cv-parsed-links">
            <LinkIcon />
            {parsed.links.join(' · ')}
          </p>
        )}
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

      <section>
        <h4>Kinh nghiệm{parsed.yearsOfExperience != null && ` · ${parsed.yearsOfExperience} năm`}</h4>
        {experience.length === 0 && <p className="text-muted">Không có.</p>}
        {experience.map((e, index) => (
          <div key={`${e.company}-${e.duration}-${index}`} className="timeline-item">
            <div className="timeline-head">
              <div>
                <strong>{e.role}</strong>
                {e.company && <div className="text-muted">{e.company}</div>}
              </div>
              {e.duration && <span className="timeline-date">{e.duration}</span>}
            </div>
            {e.description && <p className="pre-line">{e.description}</p>}
          </div>
        ))}
      </section>

      {education.length > 0 && (
        <section>
          <h4>Học vấn</h4>
          {education.map((e, index) => (
            <div key={`${e.school}-${index}`} className="timeline-item">
              <div className="timeline-head">
                <div>
                  <strong>{e.degree}</strong>
                  {e.school && <div className="text-muted">{e.school}</div>}
                </div>
                {e.year && <span className="timeline-date">{e.year}</span>}
              </div>
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
              {p.tech?.length > 0 && <div className="text-muted">{p.tech.join(', ')}</div>}
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

