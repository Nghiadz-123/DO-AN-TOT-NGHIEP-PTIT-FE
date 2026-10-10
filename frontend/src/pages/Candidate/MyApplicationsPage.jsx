import { useState } from 'react'
import { Link } from 'react-router-dom'
import applicationApi from '@/api/applicationApi'
import { StatusBadge } from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import useFetch from '@/hooks/useFetch'
import { APPLICATION_STATUS, FEATURES } from '@/utils/constants'
import { formatDate, getErrorMessage } from '@/utils/formatters'

export default function MyApplicationsPage() {
  const { data: applications, loading, error, setData } = useFetch(() => applicationApi.getMine(), [])
  const [status, setStatus] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  if (loading) return <Loading />
  if (error) return <div className="alert alert-error">{error}</div>

  const countOf = (s) => applications.filter((a) => a.status === s).length
  const visible = status ? applications.filter((a) => a.status === status) : applications

  const withdraw = async (app) => {
    const reason = window.prompt(`Rút hồ sơ ứng tuyển "${app.job.title}"? Lý do (không bắt buộc):`, '')
    if (reason === null) return
    setBusyId(app.id)
    setActionError('')
    try {
      const updated = await applicationApi.withdraw(app.id, reason)
      setData((list) => list.map((a) => (a.id === app.id ? updated : a)))
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

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

      {actionError && <div className="alert alert-error">{actionError}</div>}

      {applications.length === 0 ? (
        <EmptyState
          title="Bạn chưa ứng tuyển công việc nào"
          action={
            <Link to={FEATURES.ai ? '/recommended-jobs' : '/jobs'} className="btn btn-primary">
              {FEATURES.ai ? 'Xem việc làm phù hợp' : 'Tìm việc làm'}
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
                  <th>Địa điểm</th>
                  <th>CV đã nộp</th>
                  <th>Ngày nộp</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id} className={busyId === a.id ? 'row-busy' : ''}>
                    <td>
                      <Link to={`/jobs/${a.jobId}`}>
                        <strong>{a.job.title}</strong>
                      </Link>
                      <div className="text-muted">{a.job.company}</div>
                    </td>
                    <td>{a.job.location}</td>
                    <td>{a.cv.title || a.cv.fileName}</td>
                    <td>{formatDate(a.appliedAt)}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td>
                      {a.canWithdraw && (
                        <button
                          className="btn btn-ghost btn-sm text-danger"
                          disabled={busyId === a.id}
                          onClick={() => withdraw(a)}
                        >
                          Rút hồ sơ
                        </button>
                      )}
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
