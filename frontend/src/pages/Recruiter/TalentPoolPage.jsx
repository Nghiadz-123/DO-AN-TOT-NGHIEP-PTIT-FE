import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import talentApi from '@/api/talentApi'
import Badge from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import Pagination from '@/components/common/Pagination'
import InvitationBadge from '@/components/invitations/InvitationBadge'
import InviteModal from '@/components/invitations/InviteModal'
import TalentCVModal from '@/components/talents/TalentCVModal'
import { useLocations } from '@/hooks/useCatalog'
import useFetch from '@/hooks/useFetch'
import { JOB_LEVELS, PAGE_SIZE } from '@/utils/constants'
import { formatDate, formatFileSize, labelOf } from '@/utils/formatters'

function TalentProfileCard({ talent, onViewCv, onInvite }) {
  const { candidate, cv, invitation } = talent
  const meta = [
    candidate.yearsOfExperience != null && `${candidate.yearsOfExperience} năm kinh nghiệm`,
    candidate.level && labelOf(JOB_LEVELS, candidate.level),
    candidate.location && `📍 ${candidate.location}`,
  ].filter(Boolean)

  return (
    <article className="card talent-card">
      <div className="talent-card-head">
        <span className="avatar avatar-lg">{candidate.fullName.charAt(0)}</span>
        <div className="talent-card-info">
          <h3>{candidate.fullName}</h3>
          {candidate.headline && <p className="text-primary">{candidate.headline}</p>}
          <div className="job-meta text-muted">
            {meta.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
          <div className="actions talent-badges">
            {candidate.isOpenToWork && <Badge tone="success">Đang tìm việc</Badge>}
            {candidate.desiredPosition && candidate.desiredPosition !== candidate.headline && (
              <Badge>Mong muốn: {candidate.desiredPosition}</Badge>
            )}
          </div>
        </div>
      </div>
      {candidate.summary && <p className="talent-summary">{candidate.summary}</p>}

      <div className="talent-card-foot">
        <div className="actions">
          <button className="btn btn-outline btn-sm" onClick={onViewCv}>
            📄 Xem CV
          </button>
          <span className="text-muted small">
            {cv.title} · {formatFileSize(cv.fileSize)} · cập nhật {formatDate(cv.updatedAt)}
          </span>
        </div>
        <div className="actions">
          {invitation && (
            <>
              <span className="text-muted small">Đã mời vị trí {invitation.job.title}</span>
              <InvitationBadge invitation={invitation} />
            </>
          )}
          <button className="btn btn-primary btn-sm" onClick={onInvite}>
            ✉ {invitation ? 'Mời vị trí khác' : 'Gửi thư mời'}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function TalentPoolPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = searchParams.get('q') ?? ''
  const locationId = searchParams.get('locationId') ?? ''
  const level = searchParams.get('level') ?? ''
  const page = Number(searchParams.get('page') ?? 1)
  const [search, setSearch] = useState(keyword)
  const [viewing, setViewing] = useState(null) // ứng viên đang xem CV
  const [inviting, setInviting] = useState(null) // ứng viên đang mở hộp gửi thư mời
  const [notice, setNotice] = useState('')
  const locations = useLocations()

  const { data, loading, error, setData } = useFetch(
    () => talentApi.getPool({ keyword, locationId, level, page, pageSize: PAGE_SIZE }),
    [keyword, locationId, level, page],
  )

  const setParams = (changes) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    if (!('page' in changes)) next.delete('page')
    setSearchParams(next)
  }

  const onSent = (invitation) => {
    setData((current) => ({
      ...current,
      results: current.results.map((t) => (t.candidate.id === inviting.candidate.id ? { ...t, invitation } : t)),
    }))
    setNotice(`Đã gửi thư mời ứng tuyển vị trí "${invitation.job.title}" tới ${inviting.candidate.fullName}.`)
    setInviting(null)
  }

  const filtered = keyword || locationId || level

  return (
    <>
      <div className="page-header">
        <div>
          <h1>🔎 Tìm ứng viên</h1>
          <p className="text-muted">
            CV của các ứng viên đã bật công khai. Xem CV và gửi thư mời ứng tuyển tới ứng viên bạn quan tâm.
          </p>
        </div>
        <Link to="/recruiter/invitations" className="btn btn-outline">
          ✉ Thư mời đã gửi
        </Link>
      </div>

      <div className="card filter-bar">
        <form
          className="inline-field filter-keyword"
          onSubmit={(e) => {
            e.preventDefault()
            setParams({ q: search.trim() })
          }}
        >
          <input
            className="input"
            placeholder="Tên, vị trí, kỹ năng trong CV (VD: kế toán, bán hàng, điều dưỡng)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-outline">Tìm</button>
        </form>
        <select className="input" value={locationId} onChange={(e) => setParams({ locationId: e.target.value })}>
          <option value="">Tất cả địa điểm</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select className="input" value={level} onChange={(e) => setParams({ level: e.target.value })}>
          <option value="">Mọi cấp bậc</option>
          {JOB_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {loading && !data && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}

      {data &&
        (data.results.length === 0 ? (
          <EmptyState
            title="Chưa tìm thấy ứng viên"
            description={filtered ? 'Thử bỏ bớt bộ lọc.' : 'Chưa có ứng viên nào công khai CV.'}
          />
        ) : (
          <>
            <p className="text-muted">{data.count} ứng viên công khai CV</p>
            <div className="talent-list">
              {data.results.map((talent) => (
                <TalentProfileCard
                  key={talent.candidate.id}
                  talent={talent}
                  onViewCv={() => setViewing(talent.candidate)}
                  onInvite={() => {
                    setNotice('')
                    setInviting(talent)
                  }}
                />
              ))}
            </div>
          </>
        ))}

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          count={data.count}
          onChange={(p) => setParams({ page: String(p) })}
        />
      )}

      {viewing && <TalentCVModal candidate={viewing} onClose={() => setViewing(null)} />}
      {inviting && <InviteModal candidate={inviting.candidate} onClose={() => setInviting(null)} onSent={onSent} />}
    </>
  )
}
