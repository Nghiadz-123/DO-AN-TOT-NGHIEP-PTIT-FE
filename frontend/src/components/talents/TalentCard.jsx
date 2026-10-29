import { Award, Briefcase, FileText, MapPin } from 'lucide-react'
import { JOB_LEVELS } from '@/utils/constants'
import { formatDate, formatFileSize, labelOf } from '@/utils/formatters'

// Thẻ ứng viên dùng chung cho "Tìm ứng viên" và "Ứng viên phù hợp".
// rank: thứ hạng (tùy chọn); aside: phần bên phải đầu thẻ (vd. vòng điểm); badges: nhãn dưới tên;
// children: phần riêng của từng trang (điểm thành phần, kỹ năng); actions: nút ở chân thẻ
export default function TalentCard({ talent, rank, aside, badges, children, actions, onViewCv }) {
  const { candidate, cv } = talent

  return (
    <article className="card talent-card">
      <div className="talent-card-head">
        <span className="avatar avatar-lg" aria-hidden="true">
          {candidate.fullName.charAt(0)}
        </span>
        <div className="talent-card-info">
          <h2 className="talent-name">
            {rank && <span className="talent-rank">#{rank}</span>}
            {candidate.fullName}
          </h2>
          {candidate.headline && <p className="talent-headline">{candidate.headline}</p>}
          <ul className="job-meta">
            {candidate.yearsOfExperience != null && (
              <li>
                <Briefcase />
                {candidate.yearsOfExperience} năm kinh nghiệm
              </li>
            )}
            {candidate.level && (
              <li>
                <Award />
                {labelOf(JOB_LEVELS, candidate.level)}
              </li>
            )}
            {candidate.location && (
              <li>
                <MapPin />
                {candidate.location}
              </li>
            )}
          </ul>
          {badges && <div className="talent-badges">{badges}</div>}
        </div>
        {aside}
      </div>

      {children}
      {candidate.summary && <p className="talent-summary">{candidate.summary}</p>}

      <div className="talent-card-foot">
        <div className="talent-cv">
          <button type="button" className="btn btn-outline btn-sm" onClick={onViewCv}>
            <FileText />
            Xem CV
          </button>
          <span className="text-muted small">
            {cv.title} · {formatFileSize(cv.fileSize)} · cập nhật {formatDate(cv.updatedAt)}
          </span>
        </div>
        {actions && <div className="actions talent-actions">{actions}</div>}
      </div>
    </article>
  )
}
