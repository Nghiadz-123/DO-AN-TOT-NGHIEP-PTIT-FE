import { useState } from 'react'
import { Link } from 'react-router-dom'
import jobApi from '@/api/jobApi'
import Badge from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import useFetch from '@/hooks/useFetch'
import { JOB_LEVELS, JOB_TYPES } from '@/utils/constants'
import { formatDate, getErrorMessage, isExpired, labelOf } from '@/utils/formatters'

export default function ManageJobsPage() {
  const { data: jobs, loading, error, setData: setJobs } = useFetch(() => jobApi.getMine(), [])
  const [actionError, setActionError] = useState('')

  const toggleStatus = async (job) => {
    try {
      const updated = await jobApi.update(job.id, { status: job.status === 'open' ? 'closed' : 'open' })
      setJobs((list) => list.map((j) => (j.id === job.id ? updated : j)))
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  const handleDelete = async (job) => {
    if (!window.confirm(`Xóa tin "${job.title}"? Toàn bộ hồ sơ ứng tuyển của tin này cũng sẽ bị xóa.`)) return
    try {
      await jobApi.remove(job.id)
      setJobs((list) => list.filter((j) => j.id !== job.id))
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  if (loading) return <Loading />
  if (error) return <div className="alert alert-error">{error}</div>

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tin tuyển dụng</h1>
          <p className="text-muted">Quản lý các tin tuyển dụng bạn đã đăng</p>
        </div>
        <Link to="/recruiter/jobs/new" className="btn btn-primary">
          + Đăng tin mới
        </Link>
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}

      {jobs.length === 0 ? (
        <EmptyState
          title="Bạn chưa đăng tin tuyển dụng nào"
          action={
            <Link to="/recruiter/jobs/new" className="btn btn-primary">
              Đăng tin đầu tiên
            </Link>
          }
        />
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Vị trí</th>
                <th>Ngày đăng</th>
                <th>Hạn nộp</th>
                <th>Hồ sơ</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <Link to={`/jobs/${job.id}`}>
                      <strong>{job.title}</strong>
                    </Link>
                    <div className="text-muted">
                      {job.location} · {labelOf(JOB_TYPES, job.type)} · {labelOf(JOB_LEVELS, job.level)}
                    </div>
                  </td>
                  <td>{formatDate(job.createdAt)}</td>
                  <td className={isExpired(job.deadline) ? 'text-danger' : ''}>{formatDate(job.deadline)}</td>
                  <td>
                    <Link to={`/recruiter/applicants?jobId=${job.id}`}>
                      <strong>{job.applicantCount}</strong> hồ sơ
                    </Link>
                    {job.pendingCount > 0 && <div className="text-muted">{job.pendingCount} chờ xử lý</div>}
                  </td>
                  <td>
                    {job.status === 'open' ? <Badge tone="success">Đang tuyển</Badge> : <Badge>Đã đóng</Badge>}
                  </td>
                  <td>
                    <div className="actions">
                      <Link to={`/recruiter/applicants?jobId=${job.id}`} className="btn btn-outline btn-sm">
                        🤖 Lọc hồ sơ
                      </Link>
                      <Link to={`/recruiter/jobs/${job.id}/edit`} className="btn btn-ghost btn-sm">
                        Sửa
                      </Link>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(job)}>
                        {job.status === 'open' ? 'Đóng tin' : 'Mở lại'}
                      </button>
                      <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(job)}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
