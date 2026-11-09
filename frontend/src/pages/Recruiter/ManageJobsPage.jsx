import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Archive,
  BriefcaseBusiness,
  Ellipsis,
  ExternalLink,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Target,
  Trash,
  TriangleAlert,
  Users,
} from 'lucide-react'
import jobApi from '@/api/jobApi'
import ActiveFilters from '@/components/common/ActiveFilters'
import Badge, { JobStatusBadge } from '@/components/common/Badge'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DropdownMenu from '@/components/common/DropdownMenu'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import Pagination from '@/components/common/Pagination'
import { SkeletonLines } from '@/components/common/Skeleton'
import useFetch from '@/hooks/useFetch'
import { FEATURES, JOB_ACTIONS, JOB_LEVELS, JOB_STATUS, JOB_TYPES, PAGE_SIZE } from '@/utils/constants'
import { formatDate, getErrorMessage, isExpired, labelOf } from '@/utils/formatters'

const STATUS_TABS = [['', 'Tất cả'], ...Object.entries(JOB_STATUS).map(([key, meta]) => [key, meta.label])]
const ACTION_ICONS = { publish: Play, pause: Pause, close: Archive }

const actionLabel = (action, status) => JOB_ACTIONS[action].fromLabels?.[status] ?? JOB_ACTIONS[action].label

// Hộp xác nhận cho thao tác làm tin ngừng nhận hồ sơ hoặc không hoàn tác được
const CONFIRMS = {
  close: (job) => ({
    title: 'Đóng tin tuyển dụng?',
    message: `Tin "${job.title}" sẽ ngừng nhận hồ sơ. Bạn có thể mở lại tin sau.`,
    confirmLabel: 'Đóng tin',
  }),
  delete: (job) => ({
    title: 'Xóa tin tuyển dụng?',
    message: `Tin "${job.title}" sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.`,
    confirmLabel: 'Xóa tin',
  }),
}

export default function ManageJobsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const keyword = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? 1)
  const [search, setSearch] = useState(keyword)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [confirming, setConfirming] = useState(null) // { job, action: 'close' | 'delete' }

  const { data, loading, error, reload } = useFetch(
    () => jobApi.getMine({ status, keyword, page, pageSize: PAGE_SIZE }),
    [status, keyword, page],
  )

  // Bộ lọc nằm trên URL để giữ nguyên khi quay lại trang
  const setParams = (changes) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    if (!('page' in changes)) next.delete('page')
    setSearchParams(next)
  }

  const run = async (job, task) => {
    setBusyId(job.id)
    setActionError('')
    try {
      await task()
      reload()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const changeStatus = (job, action) => {
    if (action === 'close') return setConfirming({ job, action })
    run(job, () => jobApi.changeStatus(job.id, action))
  }

  const confirmAction = () => {
    const { job, action } = confirming
    setConfirming(null)
    if (action === 'close') return run(job, () => jobApi.changeStatus(job.id, 'close'))
    run(job, async () => {
      await jobApi.remove(job.id)
      if (data.results.length === 1 && page > 1) setParams({ page: String(page - 1) })
    })
  }

  const menuItems = (job) => {
    const busy = busyId === job.id
    const statusItems = job.allowedActions
      .filter((action) => action !== 'delete')
      .map((action) => ({
        label: actionLabel(action, job.status),
        icon: ACTION_ICONS[action],
        onClick: () => changeStatus(job, action),
        disabled: busy,
      }))
    return [
      { label: 'Sửa tin', icon: Pencil, to: `/recruiter/jobs/${job.id}/edit` },
      { label: 'Ứng viên phù hợp', icon: Target, to: `/recruiter/talents?jobId=${job.id}` },
      ...(job.status === 'draft' ? [] : [{ label: 'Xem tin công khai', icon: ExternalLink, to: `/jobs/${job.id}` }]),
      ...(statusItems.length ? [{ divider: true }, ...statusItems] : []),
      ...(job.allowedActions.includes('delete')
        ? [
            { divider: true },
            { label: 'Xóa tin', icon: Trash, danger: true, disabled: busy, onClick: () => setConfirming({ job, action: 'delete' }) },
          ]
        : []),
    ]
  }

  const hasFilter = Boolean(status || keyword)
  const confirm = confirming && CONFIRMS[confirming.action](confirming.job)

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tin tuyển dụng</h1>
          <p className="text-muted">Quản lý các tin tuyển dụng của công ty</p>
        </div>
        <Link to="/recruiter/jobs/new" className="btn btn-primary">
          <Plus />
          Đăng tin mới
        </Link>
      </div>

      <div className="card toolbar">
        <div className="segmented segmented-scroll" role="group" aria-label="Lọc theo trạng thái tin">
          {STATUS_TABS.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={status === key} onClick={() => setParams({ status: key })}>
              {label}
            </button>
          ))}
        </div>
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
            <span className="visually-hidden">Tìm theo tiêu đề tin</span>
            <input
              type="search"
              className="input"
              placeholder="Tìm theo tiêu đề tin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-outline">
            Tìm
          </button>
        </form>
      </div>

      <ActiveFilters
        items={keyword ? [{ key: 'q', label: 'Từ khóa', value: keyword }] : []}
        onRemove={() => {
          setSearch('')
          setParams({ q: '' })
        }}
        onClear={() => setParams({ q: '' })}
      />

      {actionError && (
        <div className="alert alert-error" role="alert">
          <TriangleAlert />
          <div className="alert-content">{actionError}</div>
        </div>
      )}
      {loading && !data && (
        <div className="card">
          <SkeletonLines lines={5} label="Đang tải tin tuyển dụng" />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data &&
        (data.results.length === 0 ? (
          <EmptyState
            icon={BriefcaseBusiness}
            title={hasFilter ? 'Không có tin nào khớp bộ lọc' : 'Bạn chưa đăng tin tuyển dụng nào'}
            description={hasFilter ? 'Thử chọn trạng thái khác hoặc đổi từ khóa.' : 'Đăng tin để bắt đầu nhận hồ sơ ứng viên.'}
            action={
              hasFilter ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setSearch('')
                    setSearchParams({})
                  }}
                >
                  Xóa bộ lọc
                </button>
              ) : (
                <Link to="/recruiter/jobs/new" className="btn btn-primary">
                  <Plus />
                  Đăng tin đầu tiên
                </Link>
              )
            }
          />
        ) : (
          <div className={`card table-card ${loading ? 'is-refreshing' : ''}`}>
            <div className="table-wrap">
              <table className="table table-stack">
                <thead>
                  <tr>
                    <th scope="col">Vị trí</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Ngày đăng</th>
                    <th scope="col">Hạn nộp</th>
                    <th scope="col">Hồ sơ</th>
                    <th scope="col" className="table-cell-actions">
                      <span className="visually-hidden">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((job) => {
                    const expired = isExpired(job.deadline)
                    return (
                      <tr key={job.id} className={busyId === job.id ? 'row-busy' : ''} aria-busy={busyId === job.id}>
                        <td className="table-cell-main">
                          <Link
                            to={job.status === 'draft' ? `/recruiter/jobs/${job.id}/edit` : `/jobs/${job.id}`}
                            className="table-title"
                          >
                            {job.title}
                          </Link>
                          <span className="table-sub">
                            {[job.location, labelOf(JOB_TYPES, job.type), labelOf(JOB_LEVELS, job.level)]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </td>
                        <td data-label="Trạng thái">
                          <JobStatusBadge status={job.status} />
                        </td>
                        <td data-label="Ngày đăng" className="nowrap tabular-nums">
                          {job.publishedAt ? formatDate(job.publishedAt) : <span className="text-muted">Chưa đăng</span>}
                        </td>
                        <td data-label="Hạn nộp" className="nowrap tabular-nums">
                          <span className={expired ? 'text-danger' : undefined}>{formatDate(job.deadline)}</span>
                          {expired && <span className="table-sub text-danger">Đã qua hạn</span>}
                        </td>
                        <td data-label="Hồ sơ">
                          <Link to={`/recruiter/applicants?jobId=${job.id}`} className="inline-link nowrap">
                            <strong className="tabular-nums">{job.applicantCount}</strong> hồ sơ
                          </Link>
                          {job.pendingCount > 0 && (
                            <span className="table-sub">
                              <Badge tone="warning">{job.pendingCount} chưa xử lý</Badge>
                            </span>
                          )}
                        </td>
                        <td className="table-cell-actions">
                          <div className="row-actions">
                            <Link
                              to={`/recruiter/applicants?jobId=${job.id}`}
                              className="btn btn-outline btn-sm"
                              aria-label={`Xem hồ sơ ứng tuyển tin ${job.title}`}
                            >
                              <Users />
                              {FEATURES.ai ? 'Lọc hồ sơ' : 'Xem hồ sơ'}
                            </Link>
                            <DropdownMenu
                              fixed
                              label={`Thao tác khác với tin ${job.title}`}
                              trigger={<Ellipsis />}
                              items={menuItems(job)}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          count={data.count}
          onChange={(p) => setParams({ page: String(p) })}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirming)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={confirmAction}
        onCancel={() => setConfirming(null)}
      />
    </>
  )
}
