import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CircleCheck, Search, Send, UserSearch } from 'lucide-react'
import talentApi from '@/api/talentApi'
import ActiveFilters from '@/components/common/ActiveFilters'
import Badge from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import Pagination from '@/components/common/Pagination'
import { SkeletonCards } from '@/components/common/Skeleton'
import InvitationBadge from '@/components/invitations/InvitationBadge'
import InviteModal from '@/components/invitations/InviteModal'
import TalentCard from '@/components/talents/TalentCard'
import TalentCVModal from '@/components/talents/TalentCVModal'
import { useLocations } from '@/hooks/useCatalog'
import useFetch from '@/hooks/useFetch'
import { JOB_LEVELS, PAGE_SIZE } from '@/utils/constants'
import { labelOf } from '@/utils/formatters'

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

  const { data, loading, error, setData, reload } = useFetch(
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

  const activeFilters = [
    keyword && { key: 'q', label: 'Từ khóa', value: keyword },
    locationId && {
      key: 'locationId',
      label: 'Địa điểm',
      value: locations.find((l) => String(l.id) === locationId)?.name ?? locationId,
    },
    level && { key: 'level', label: 'Cấp bậc', value: labelOf(JOB_LEVELS, level) },
  ].filter(Boolean)

  const clearFilters = () => {
    setSearch('')
    setParams({ q: '', locationId: '', level: '' })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tìm ứng viên</h1>
          <p className="text-muted">
            CV của các ứng viên đã bật công khai. Xem CV và gửi thư mời ứng tuyển tới ứng viên bạn quan tâm.
          </p>
        </div>
        <Link to="/recruiter/invitations" className="btn btn-outline">
          <Send />
          Thư mời đã gửi
        </Link>
      </div>

      <div className="card toolbar">
        <form
          className="toolbar-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            setParams({ q: search.trim() })
          }}
        >
          <label className="input-icon">
            <Search />
            <span className="visually-hidden">Tìm theo tên, vị trí, kỹ năng trong CV</span>
            <input
              type="search"
              className="input"
              placeholder="Tên, vị trí, kỹ năng trong CV (VD: kế toán, bán hàng, điều dưỡng)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Tìm
          </button>
        </form>
        <div className="toolbar-fields">
          <div className="form-group">
            <label htmlFor="pool-location">Địa điểm</label>
            <select
              id="pool-location"
              className="input"
              value={locationId}
              onChange={(e) => setParams({ locationId: e.target.value })}
            >
              <option value="">Tất cả địa điểm</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="pool-level">Cấp bậc</label>
            <select id="pool-level" className="input" value={level} onChange={(e) => setParams({ level: e.target.value })}>
              <option value="">Mọi cấp bậc</option>
              {JOB_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <ActiveFilters
        items={activeFilters}
        onRemove={(key) => {
          if (key === 'q') setSearch('')
          setParams({ [key]: '' })
        }}
        onClear={clearFilters}
      />

      {notice && (
        <div className="alert alert-success" role="status">
          <CircleCheck />
          <div className="alert-content">{notice}</div>
        </div>
      )}
      {loading && !data && <SkeletonCards count={3} className="talent-list" label="Đang tải ứng viên" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data &&
        (data.results.length === 0 ? (
          <EmptyState
            icon={UserSearch}
            title="Chưa tìm thấy ứng viên"
            description={activeFilters.length ? 'Thử bỏ bớt bộ lọc.' : 'Chưa có ứng viên nào công khai CV.'}
            action={
              activeFilters.length > 0 && (
                <button type="button" className="btn btn-outline" onClick={clearFilters}>
                  Xóa bộ lọc
                </button>
              )
            }
          />
        ) : (
          <>
            <p className="results-count text-muted" aria-live="polite">
              {data.count} ứng viên công khai CV
            </p>
            <div className={`talent-list ${loading ? 'is-refreshing' : ''}`}>
              {data.results.map((talent) => {
                const { candidate, invitation } = talent
                const desired = candidate.desiredPosition !== candidate.headline && candidate.desiredPosition
                return (
                  <TalentCard
                    key={candidate.id}
                    talent={talent}
                    onViewCv={() => setViewing(candidate)}
                    badges={
                      (candidate.isOpenToWork || desired) && (
                        <>
                          {candidate.isOpenToWork && <Badge tone="success">Đang tìm việc</Badge>}
                          {desired && <Badge>Mong muốn: {desired}</Badge>}
                        </>
                      )
                    }
                    actions={
                      <>
                        {invitation && (
                          <>
                            <span className="text-muted small">Đã mời vị trí {invitation.job.title}</span>
                            <InvitationBadge invitation={invitation} />
                          </>
                        )}
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setNotice('')
                            setInviting(talent)
                          }}
                        >
                          <Send />
                          {invitation ? 'Mời vị trí khác' : 'Gửi thư mời'}
                        </button>
                      </>
                    }
                  />
                )
              })}
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
