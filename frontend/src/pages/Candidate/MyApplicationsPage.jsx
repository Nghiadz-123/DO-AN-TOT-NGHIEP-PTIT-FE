import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Check, ClipboardList, FileText, MapPin, Search, TriangleAlert, Undo2 } from 'lucide-react'
import applicationApi from '@/api/applicationApi'
import { StatusBadge } from '@/components/common/Badge'
import CompanyLogo from '@/components/common/CompanyLogo'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import { SkeletonCards } from '@/components/common/Skeleton'
import useFetch from '@/hooks/useFetch'
import { APPLICATION_STATUS, FEATURES } from '@/utils/constants'
import { formatDate, getErrorMessage } from '@/utils/formatters'

// Các bước của một hồ sơ (bị từ chối / đã rút thì chỉ hiện nhãn trạng thái)
const STEPS = ['applied', 'screening', 'interview', 'offer', 'hired']

function StatusSteps({ status }) {
  const current = STEPS.indexOf(status)
  if (current < 0) return null
  return (
    <div>
      <ol className="status-steps" aria-label="Tiến trình hồ sơ">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className={index < current ? 'done' : index === current ? 'current' : ''}
            aria-current={index === current ? 'step' : undefined}
          >
            <span className="status-step-dot" aria-hidden="true">
              {index < current ? <Check /> : index + 1}
            </span>
            <span className="status-step-label">{APPLICATION_STATUS[step].label}</span>
          </li>
        ))}
      </ol>
      {/* Màn hẹp ẩn nhãn từng bước, chỉ ghi bước hiện tại */}
      <p className="status-steps-caption">
        Bước {current + 1}/{STEPS.length}: {APPLICATION_STATUS[status].label}
      </p>
    </div>
  )
}

export default function MyApplicationsPage() {
  const { data: applications, loading, error, setData, reload } = useFetch(() => applicationApi.getMine(), [])
  const [status, setStatus] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [withdrawing, setWithdrawing] = useState(null) // đơn đang chờ xác nhận rút
  const [reason, setReason] = useState('')

  if (loading) return <SkeletonCards count={3} className="application-list" label="Đang tải đơn ứng tuyển" />
  if (error) return <ErrorState message={error} onRetry={reload} />

  const countOf = (s) => applications.filter((a) => a.status === s).length
  const visible = status ? applications.filter((a) => a.status === status) : applications

  const closeWithdraw = () => {
    setWithdrawing(null)
    setReason('')
  }

  const confirmWithdraw = async () => {
    const app = withdrawing
    const note = reason
    closeWithdraw()
    setBusyId(app.id)
    setActionError('')
    try {
      const updated = await applicationApi.withdraw(app.id, note)
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
          <Search />
          Tìm thêm việc làm
        </Link>
      </div>

      {actionError && (
        <div className="alert alert-error" role="alert">
          <TriangleAlert />
          <div className="alert-content">{actionError}</div>
        </div>
      )}

      {applications.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Bạn chưa ứng tuyển công việc nào"
          description="Tìm việc phù hợp và nộp hồ sơ chỉ trong vài bước."
          action={
            <Link to={FEATURES.candidateAi ? '/recommended-jobs' : '/jobs'} className="btn btn-primary">
              {FEATURES.candidateAi ? 'Xem việc làm phù hợp' : 'Tìm việc làm'}
            </Link>
          }
        />
      ) : (
        <>
          <div className="segmented segmented-scroll" role="group" aria-label="Lọc theo trạng thái">
            <button type="button" aria-pressed={!status} onClick={() => setStatus('')}>
              Tất cả <span className="segmented-count">({applications.length})</span>
            </button>
            {Object.entries(APPLICATION_STATUS).map(([key, meta]) => (
              <button key={key} type="button" aria-pressed={status === key} onClick={() => setStatus(key)}>
                {meta.label} <span className="segmented-count">({countOf(key)})</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState title="Không có đơn nào ở trạng thái này" description="Chọn trạng thái khác để xem các đơn còn lại." />
          ) : (
            <ul className="application-list">
              {visible.map((a) => (
                <li key={a.id} className={`card application-card ${busyId === a.id ? 'row-busy' : ''}`}>
                  <div className="application-head">
                    <CompanyLogo name={a.job.company} src={a.job.companyLogo} />
                    <div className="application-title">
                      <h2>
                        <Link to={`/jobs/${a.jobId}`}>{a.job.title}</Link>
                      </h2>
                      <p className="text-muted">{a.job.company}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <ul className="job-meta">
                    {a.job.location && (
                      <li>
                        <MapPin />
                        {a.job.location}
                      </li>
                    )}
                    <li>
                      <FileText />
                      {a.cv.title || a.cv.fileName}
                    </li>
                    <li>
                      <CalendarDays />
                      Nộp ngày {formatDate(a.appliedAt)}
                    </li>
                  </ul>
                  <StatusSteps status={a.status} />
                  {a.canWithdraw && (
                    <div className="application-foot">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-danger"
                        disabled={busyId === a.id}
                        onClick={() => setWithdrawing(a)}
                      >
                        <Undo2 />
                        Rút hồ sơ
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(withdrawing)}
        title="Rút hồ sơ ứng tuyển?"
        message={withdrawing && `Hồ sơ ứng tuyển vị trí "${withdrawing.job.title}" sẽ được rút lại.`}
        confirmLabel="Rút hồ sơ"
        onConfirm={confirmWithdraw}
        onCancel={closeWithdraw}
      >
        <div className="form-group">
          <label htmlFor="withdraw-reason">Lý do (không bắt buộc)</label>
          <textarea
            id="withdraw-reason"
            className="input"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </ConfirmDialog>
    </>
  )
}
