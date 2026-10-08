import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import jobApi from '@/api/jobApi'
import { JobStatusBadge } from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import Pagination from '@/components/common/Pagination'
import useFetch from '@/hooks/useFetch'
import { FEATURES, JOB_ACTIONS, JOB_LEVELS, JOB_STATUS, JOB_TYPES, PAGE_SIZE } from '@/utils/constants'
import { formatDate, getErrorMessage, isExpired, labelOf } from '@/utils/formatters'

const STATUS_TABS = [['', 'Tất cả'], ...Object.entries(JOB_STATUS).map(([key, meta]) => [key, meta.label])]

const actionLabel = (action, status) => JOB_ACTIONS[action].fromLabels?.[status] ?? JOB_ACTIONS[action].label

export default function ManageJobsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const keyword = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? 1)
  const [search, setSearch] = useState(keyword)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)

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
    if (action === 'close' && !window.confirm(`Đóng tin "${job.title}"? Tin sẽ ngừng nhận hồ sơ.`)) return
    run(job, () => jobApi.changeStatus(job.id, action))
  }

  const handleDelete = (job) => {
    if (!window.confirm(`Xóa tin "${job.title}"? Thao tác này không thể hoàn tác.`)) return
    run(job, async () => {
      await jobApi.remove(job.id)
      if (data.results.length === 1 && page > 1) setParams({ page: String(page - 1) })
    })
  }

  const hasFilter = Boolean(status || keyword)

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tin tuyển dụng</h1>
          <p className="text-muted">Quản lý các tin tuyển dụng của công ty</p>
        </div>
        <Link to="/recruiter/jobs/new" className="btn btn-primary">
          + Đăng tin mới
        </Link>
      </div>

      <div className="card filter-bar">
        <div className="segmented">
          {STATUS_TABS.map(([key, label]) => (
            <button key={key} className={status === key ? 'active' : ''} onClick={() => setParams({ status: key })}>
              {label}
            </button>
          ))}
        </div>
        <form
          className="inline-field filter-keyword"
          onSubmit={(e) => {
            e.preventDefault()
            setParams({ q: search.trim() })
          }}
        >
          <input
            className="input"
            placeholder="Tìm theo tiêu đề tin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-outline">Tìm</button>
        </form>
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}
      {loading && !data && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}

      {data &&
        (data.results.length === 0 ? (
          <EmptyState
            title={hasFilter ? 'Không có tin nào khớp bộ lọc' : 'Bạn chưa đăng tin tuyển dụng nào'}
            action={
              hasFilter ? (
                <button className="btn btn-outline" onClick={() => setSearchParams({})}>
                  Xóa bộ lọc
                </button>
              ) : (
                <Link to="/recruiter/jobs/new" className="btn btn-primary">
                  Đăng tin đầu tiên
                </Link>
              )
            }
          />
        ) : (
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Vị trí</th>
                  <th>Trạng thái</th>
                  <th>Ngày đăng</th>
                  <th>Hạn nộp</th>
                  <th>Hồ sơ</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((job) => (
                  <tr key={job.id} className={busyId === job.id ? 'row-busy' : ''}>
                    <td>
                      <Link to={job.status === 'draft' ? `/recruiter/jobs/${job.id}/edit` : `/jobs/${job.id}`}>
                        <strong>{job.title}</strong>
                      </Link>
                      <div className="text-muted">
                        {[job.location, labelOf(JOB_TYPES, job.type), labelOf(JOB_LEVELS, job.level)]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </td>
                    <td>
                      <JobStatusBadge status={job.status} />
                    </td>
                    <td>{job.publishedAt ? formatDate(job.publishedAt) : <span className="text-muted">—</span>}</td>
                    <td className={isExpired(job.deadline) ? 'text-danger' : ''}>{formatDate(job.deadline)}</td>
                    <td>
                      <Link to={`/recruiter/applicants?jobId=${job.id}`}>
                        <strong>{job.applicantCount}</strong> hồ sơ
                      </Link>
                      {job.pendingCount > 0 && <div className="text-muted">{job.pendingCount} chưa xử lý</div>}
                    </td>
                    <td>
                      <div className="actions">
                        <Link to={`/recruiter/applicants?jobId=${job.id}`} className="btn btn-outline btn-sm">
                          {FEATURES.ai ? '🤖 Lọc hồ sơ' : 'Xem hồ sơ'}
                        </Link>
                        <Link to={`/recruiter/jobs/${job.id}/edit`} className="btn btn-ghost btn-sm">
                          Sửa
                        </Link>
                        {job.allowedActions
                          .filter((action) => action !== 'delete')
                          .map((action) => (
                            <button
                              key={action}
                              className="btn btn-ghost btn-sm"
                              disabled={busyId === job.id}
                              onClick={() => changeStatus(job, action)}
                            >
                              {actionLabel(action, job.status)}
                            </button>
                          ))}
                        {job.allowedActions.includes('delete') && (
                          <button
                            className="btn btn-ghost btn-sm text-danger"
                            disabled={busyId === job.id}
                            onClick={() => handleDelete(job)}
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </>
  )
}
