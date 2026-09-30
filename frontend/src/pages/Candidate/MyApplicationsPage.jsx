import { useState } from 'react'
import { Link } from 'react-router-dom'
import applicationApi from '@/api/applicationApi'
import { StatusBadge } from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import useFetch from '@/hooks/useFetch'
import { APPLICATION_STATUS } from '@/utils/constants'
import { formatDate, formatSalary } from '@/utils/formatters'

export default function MyApplicationsPage() {
  const { data: applications, loading, error } = useFetch(() => applicationApi.getMine(), [])
  const [status, setStatus] = useState('')

  if (loading) return <Loading />
  if (error) return <div className="alert alert-error">{error}</div>

  const countOf = (s) => applications.filter((a) => a.status === s).length
  const visible = status ? applications.filter((a) => a.status === status) : applications

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Đơn ứng tuyển của tôi</h1>
          <p className="text-muted">Theo dõi trạng thái các hồ sơ bạn đã nộp</p>
        </div>
        <Link to="/jobs" className="btn btn-primary">
          Tìm thêm việc làm
        </Link>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          title="Bạn chưa ứng tuyển công việc nào"
          action={
            <Link to="/recommended-jobs" className="btn btn-primary">
              Xem việc làm phù hợp
            </Link>
          }
        />
      ) : (
        <>
          <div className="segmented">
            <button className={!status ? 'active' : ''} onClick={() => setStatus('')}>
              Tất cả ({applications.length})
            </button>
            {Object.entries(APPLICATION_STATUS).map(([key, meta]) => (
              <button key={key} className={status === key ? 'active' : ''} onClick={() => setStatus(key)}>
                {meta.label} ({countOf(key)})
              </button>
            ))}
          </div>

          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Vị trí</th>
                  <th>Mức lương</th>
                  <th>CV đã nộp</th>
                  <th>Ngày nộp</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link to={`/jobs/${a.jobId}`}>
                        <strong>{a.job?.title ?? 'Tin đã bị xóa'}</strong>
                      </Link>
                      <div className="text-muted">{a.job?.company}</div>
                    </td>
                    <td>{a.job && formatSalary(a.job.salaryMin, a.job.salaryMax)}</td>
                    <td>{a.cv?.fileName}</td>
                    <td>{formatDate(a.appliedAt)}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && <p className="text-muted text-center">Không có đơn nào ở trạng thái này.</p>}
          </div>
        </>
      )}
    </>
  )
}
