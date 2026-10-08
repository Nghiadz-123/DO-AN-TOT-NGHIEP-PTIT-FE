import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import cvApi from '@/api/cvApi'
import Badge from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import Loading from '@/components/common/Loading'
import ScoreCircle from '@/components/common/ScoreCircle'
import useFetch from '@/hooks/useFetch'
import { FEATURES, JOB_LEVELS } from '@/utils/constants'
import { formatDate, formatFileSize, formatSalary, getErrorMessage, labelOf, saveBlob } from '@/utils/formatters'

const VIEWABLE_TYPES = ['application/pdf', 'text/plain']
const MAX_SKILLS_SHOWN = 4

const scrollBehavior = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')

export default function ManageCVsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [flash] = useState(location.state?.message ?? '')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [preview, setPreview] = useState(null) // { cv, url }
  const previewRef = useRef(null)

  const { data: cvs, loading, error, reload } = useFetch(() => cvApi.getMine(), [])

  // Thông báo sau khi lưu chỉ hiện một lần: xóa state để tải lại trang không hiện lại
  useEffect(() => {
    if (location.state?.message) navigate(location.pathname, { replace: true })
  }, [location, navigate])

  useEffect(() => () => preview && URL.revokeObjectURL(preview.url), [preview])
  useEffect(() => {
    if (preview) previewRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
  }, [preview])

  const run = async (cv, task) => {
    setBusyId(cv.id)
    setActionError('')
    try {
      await task()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const openFile = (cv, { download = false } = {}) =>
    run(cv, async () => {
      const { blob, fileName } = await cvApi.download(cv.id)
      if (download || !VIEWABLE_TYPES.includes(blob.type.split(';')[0])) return saveBlob(blob, fileName)
      setPreview({ cv, url: URL.createObjectURL(blob) })
    })

  const setDefault = (cv) =>
    run(cv, async () => {
      await cvApi.setDefault(cv.id)
      reload()
    })

  const handleDelete = (cv) => {
    if (!window.confirm(`Xóa CV "${cv.title}"? Thao tác này không thể hoàn tác.`)) return
    run(cv, async () => {
      await cvApi.remove(cv.id)
      if (preview?.cv.id === cv.id) setPreview(null)
      reload()
    })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>CV của tôi</h1>
          <p className="text-muted">Quản lý các CV dùng để ứng tuyển. CV chính được chọn sẵn mỗi khi bạn nộp hồ sơ.</p>
        </div>
        <Link to="/cv/new" className="btn btn-primary">
          + Tải CV mới
        </Link>
      </div>

      {flash && <div className="alert alert-success">{flash}</div>}
      {actionError && <div className="alert alert-error">{actionError}</div>}
      {loading && !cvs && <Loading />}
      {error && <div className="alert alert-error">{error}</div>}

      {cvs &&
        (cvs.length === 0 ? (
          <EmptyState
            title="Bạn chưa có CV nào"
            description="Tải CV lên để ứng tuyển nhanh và để nhà tuyển dụng xem được hồ sơ của bạn."
            action={
              <Link to="/cv/new" className="btn btn-primary">
                Tải CV đầu tiên
              </Link>
            }
          />
        ) : (
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>CV</th>
                  <th>Vị trí mong muốn</th>
                  <th>Kỹ năng</th>
                  {FEATURES.ai && <th>Điểm AI</th>}
                  <th>Cập nhật</th>
                  <th>Ứng tuyển</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {cvs.map((cv) => (
                  <tr key={cv.id} className={busyId === cv.id ? 'row-busy' : ''}>
                    <td>
                      <div className="cv-title">
                        <Link to={`/cv/${cv.id}/edit`}>
                          <strong>{cv.title}</strong>
                        </Link>
                        {cv.isDefault && <Badge tone="primary">CV chính</Badge>}
                      </div>
                      <div className="text-muted">
                        {cv.fileName} · <span className="nowrap">{formatFileSize(cv.fileSize)}</span>
                      </div>
                    </td>
                    <td>
                      {cv.desiredPosition}
                      <div className="text-muted">
                        {[cv.location, cv.level && labelOf(JOB_LEVELS, cv.level)].filter(Boolean).join(' · ')}
                      </div>
                      <div className="text-muted">Lương: {formatSalary(cv.salaryMin, cv.salaryMax, cv.isSalaryNegotiable)}</div>
                    </td>
                    <td>
                      <div className="tags">
                        {cv.skills.slice(0, MAX_SKILLS_SHOWN).map((s) => (
                          <span key={s} className="tag">
                            {s}
                          </span>
                        ))}
                        {cv.skills.length > MAX_SKILLS_SHOWN && (
                          <span className="tag tag-muted">+{cv.skills.length - MAX_SKILLS_SHOWN}</span>
                        )}
                      </div>
                    </td>
                    {FEATURES.ai && (
                      <td className="nowrap">
                        {cv.analysis ? (
                          <ScoreCircle score={cv.analysis.overallScore} size={40} showLabel={false} />
                        ) : (
                          <Link to="/cv-analysis" className="text-muted">
                            Chưa chấm
                          </Link>
                        )}
                      </td>
                    )}
                    <td>{formatDate(cv.updatedAt)}</td>
                    <td className="nowrap">
                      {cv.applicationCount > 0 ? (
                        <Link to="/my-applications">
                          <strong>{cv.applicationCount}</strong> đơn
                        </Link>
                      ) : (
                        <span className="text-muted">Chưa dùng</span>
                      )}
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-outline btn-sm" disabled={busyId === cv.id} onClick={() => openFile(cv)}>
                          Xem
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={busyId === cv.id}
                          onClick={() => openFile(cv, { download: true })}
                        >
                          Tải về
                        </button>
                        <Link to={`/cv/${cv.id}/edit`} className="btn btn-ghost btn-sm">
                          Sửa
                        </Link>
                        {!cv.isDefault && (
                          <button className="btn btn-ghost btn-sm" disabled={busyId === cv.id} onClick={() => setDefault(cv)}>
                            Đặt làm CV chính
                          </button>
                        )}
                        {cv.applicationCount === 0 && (
                          <button
                            className="btn btn-ghost btn-sm text-danger"
                            disabled={busyId === cv.id}
                            onClick={() => handleDelete(cv)}
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

      {preview && (
        <section className="card" ref={previewRef}>
          <div className="page-header">
            <div>
              <h2>{preview.cv.title}</h2>
              <p className="text-muted">{preview.cv.fileName}</p>
            </div>
            <div className="actions">
              <button className="btn btn-outline btn-sm" onClick={() => openFile(preview.cv, { download: true })}>
                Tải về
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreview(null)}>
                Đóng
              </button>
            </div>
          </div>
          <iframe className="cv-viewer" src={preview.url} title={`Xem CV ${preview.cv.title}`} />
        </section>
      )}
    </>
  )
}
