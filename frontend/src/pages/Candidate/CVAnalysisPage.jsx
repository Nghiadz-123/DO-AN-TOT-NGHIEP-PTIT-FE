import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import aiApi from '@/api/aiApi'
import cvApi from '@/api/cvApi'
import jobApi from '@/api/jobApi'
import EmptyState from '@/components/common/EmptyState'
import FileDropzone from '@/components/common/FileDropzone'
import Loading from '@/components/common/Loading'
import ScoreCircle from '@/components/common/ScoreCircle'
import { CVScoreResult, CVSuggestionList } from '@/components/cv/CVAnalysisResult'
import CVNotReady from '@/components/cv/CVNotReady'
import CVParsedInfo from '@/components/cv/CVParsedInfo'
import useFetch from '@/hooks/useFetch'
import { CV_ACCEPT, CV_PARSE_STATUS } from '@/utils/constants'
import { validateCvFile } from '@/utils/file'
import { formatDate, formatFileSize, getErrorMessage } from '@/utils/formatters'

const TABS = [
  { key: 'score', label: '✨ Chấm điểm' },
  { key: 'suggestions', label: '💡 Gợi ý sửa CV' },
  { key: 'profile', label: '📄 Thông tin AI trích xuất' },
]

const byCv = (analyses) => Object.fromEntries(analyses.map((a) => [a.cvId, a]))

export default function CVAnalysisPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: cvs, loading, error, setData: setCvs } = useFetch(() => cvApi.getMine(), [])
  const { data: analyses, setData: setAnalyses } = useFetch(async () => byCv(await aiApi.getAnalyses()), [])
  // Tin tuyển dụng mục tiêu cho phần gợi ý sửa CV (?jobId=..., từ trang chi tiết tin hoặc việc làm phù hợp)
  const targetJobId = searchParams.get('jobId') ?? ''
  const { data: targetJob } = useFetch(
    () => (targetJobId ? jobApi.getById(targetJobId) : Promise.resolve(null)),
    [targetJobId],
  )
  const [busy, setBusy] = useState(null) // { cvId, action: 'score' | 'suggestions' }
  const [uploading, setUploading] = useState(false)
  const [actionError, setActionError] = useState('')

  const tab = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'score'
  const selected = cvs?.find((c) => c.id === searchParams.get('cvId')) ?? cvs?.find((c) => c.isDefault) ?? cvs?.[0]
  const analysis = selected ? analyses?.[selected.id] : null

  // CV / tab / tin mục tiêu nằm trên URL để trang khác dẫn link tới đúng chỗ
  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    setSearchParams(next, { replace: true })
  }

  const runAi = async (cv, action) => {
    setBusy({ cvId: cv.id, action })
    setActionError('')
    try {
      const result = action === 'score' ? await aiApi.scoreCv(cv.id) : await aiApi.suggestCv(cv.id, targetJobId)
      setAnalyses((map) => ({ ...map, [cv.id]: result }))
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const handleFile = async (file) => {
    const invalid = validateCvFile(file)
    if (invalid) return setActionError(invalid)

    setUploading(true)
    setActionError('')
    let cv
    try {
      cv = await cvApi.upload(file)
      setCvs((list) => [cv, ...list])
      updateParams({ cvId: cv.id, tab: 'score' })
    } catch (err) {
      setActionError(getErrorMessage(err))
      return
    } finally {
      setUploading(false)
    }
    if (cv.parseStatus === 'completed') await runAi(cv, 'score') // tự động chấm điểm ngay sau khi tải lên
  }

  const handleDelete = async (cv) => {
    if (!window.confirm(`Xóa CV "${cv.title || cv.fileName}"?`)) return
    try {
      await cvApi.remove(cv.id)
      setCvs((list) => list.filter((c) => c.id !== cv.id))
      if (selected?.id === cv.id) updateParams({ cvId: '' })
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  if (loading) return <Loading />
  if (error) return <div className="alert alert-error">{error}</div>

  const isBusy = Boolean(busy)
  const running = busy?.cvId === selected?.id ? busy.action : null
  const ready = selected?.parseStatus === 'completed'
  // Gợi ý đã lưu được tạo theo tin mục tiêu khác với tin đang chọn
  const staleTarget = analysis?.suggestions && (analysis.suggestions.targetJobId ?? '') !== targetJobId

  return (
    <>
      <div className="page-header">
        <div>
          <h1>AI chấm điểm & gợi ý sửa CV</h1>
          <p className="text-muted">
            AI đọc CV, chấm điểm theo 5 tiêu chí và gợi ý cách sửa dựa trên yêu cầu của các tin tuyển dụng thật.
          </p>
        </div>
        <Link to="/create-cv" className="btn btn-primary">Tạo CV mới</Link>
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}

      <div className="layout-sidebar layout-sidebar-left">
        <aside className="stack">
          <div className="card">
            <h3>Tải CV lên</h3>
            {uploading ? (
              <Loading text="Đang tải lên và đọc CV..." />
            ) : (
              <FileDropzone accept={CV_ACCEPT} onFile={handleFile} disabled={isBusy} hint="PDF, DOCX · tối đa 5MB" />
            )}
          </div>

          <div className="card">
            <h3>Danh sách CV ({cvs.length})</h3>
            {cvs.length === 0 && <p className="text-muted">Bạn chưa tải CV nào.</p>}
            <ul className="cv-list">
              {cvs.map((cv) => {
                const score = analyses?.[cv.id]?.score
                return (
                  <li
                    key={cv.id}
                    className={`cv-item ${cv.id === selected?.id ? 'selected' : ''}`}
                    onClick={() => updateParams({ cvId: cv.id })}
                  >
                    <div className="cv-item-info">
                      <strong>{cv.title || cv.fileName}</strong>
                      <small className="text-muted">
                        {formatFileSize(cv.fileSize)} · {formatDate(cv.uploadedAt)}
                      </small>
                    </div>
                    {score ? (
                      <ScoreCircle score={score.total} size={40} showLabel={false} />
                    ) : (
                      <small className="text-muted">
                        {cv.parseStatus === 'completed' ? 'Chưa chấm' : CV_PARSE_STATUS[cv.parseStatus]?.label}
                      </small>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Xóa CV"
                      disabled={isBusy}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(cv)
                      }}
                    >
                      🗑
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        <section className="card">
          {!selected ? (
            <EmptyState title="Chưa có CV để phân tích" description="Tải CV lên ở khung bên trái để bắt đầu." />
          ) : (
            <>
              <div className="page-header">
                <div>
                  <h2>{selected.title || selected.fileName}</h2>
                  <p className="text-muted">
                    {selected.fileName} · tải lên ngày {formatDate(selected.uploadedAt)}
                  </p>
                </div>
                <div className="actions">
                  <Link to={`/cv/${selected.id}/edit`} className="btn btn-ghost">
                    Sửa thông tin
                  </Link>
                  <Link to={`/recommended-jobs?cvId=${selected.id}`} className="btn btn-primary">
                    Xem việc làm phù hợp
                  </Link>
                </div>
              </div>

              {!ready && <CVNotReady cv={selected} />}

              <div className="tabs">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    className={`tab ${tab === t.key ? 'active' : ''}`}
                    onClick={() => updateParams({ tab: t.key })}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'score' &&
                (running === 'score' ? (
                  <Loading text="AI đang chấm điểm CV, thường mất 5-15 giây..." />
                ) : analysis?.score ? (
                  <>
                    <div className="ai-panel-head">
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={isBusy || !ready}
                        onClick={() => runAi(selected, 'score')}
                      >
                        ↻ Chấm điểm lại
                      </button>
                    </div>
                    <CVScoreResult score={analysis.score} />
                  </>
                ) : (
                  <EmptyState
                    title="CV chưa được chấm điểm"
                    action={
                      <button className="btn btn-primary" disabled={isBusy || !ready} onClick={() => runAi(selected, 'score')}>
                        ✨ Chấm điểm bằng AI
                      </button>
                    }
                  />
                ))}

              {tab === 'suggestions' && (
                <>
                  <div className="ai-panel-head">
                    {targetJobId && (
                      <p>
                        🎯 Tin mục tiêu:{' '}
                        {targetJob ? (
                          <>
                            <Link to={`/jobs/${targetJob.id}`}>{targetJob.title}</Link> · {targetJob.company}
                          </>
                        ) : (
                          'đang tải...'
                        )}{' '}
                        <button className="btn btn-ghost btn-sm" onClick={() => updateParams({ jobId: '' })}>
                          Bỏ chọn
                        </button>
                      </p>
                    )}
                    {running !== 'suggestions' && (
                      <button
                        className={analysis?.suggestions ? 'btn btn-outline btn-sm' : 'btn btn-primary'}
                        disabled={isBusy || !ready}
                        onClick={() => runAi(selected, 'suggestions')}
                      >
                        {analysis?.suggestions ? '↻ Gợi ý lại' : '💡 Gợi ý sửa CV'}
                      </button>
                    )}
                  </div>
                  {running === 'suggestions' ? (
                    <Loading text="AI đang đối chiếu CV với các tin tuyển dụng, thường mất 5-15 giây..." />
                  ) : analysis?.suggestions ? (
                    <>
                      {staleTarget && (
                        <div className="alert alert-info">Gợi ý bên dưới chưa theo tin mục tiêu đang chọn.</div>
                      )}
                      <CVSuggestionList suggestions={analysis.suggestions} />
                    </>
                  ) : (
                    <EmptyState title="Chưa có gợi ý" />
                  )}
                </>
              )}

              {tab === 'profile' &&
                (analysis?.profile ? (
                  <CVParsedInfo parsed={analysis.profile} />
                ) : (
                  <EmptyState title="Chưa có thông tin trích xuất" description="Chấm điểm CV để AI trích xuất thông tin." />
                ))}
            </>
          )}
        </section>
      </div>
    </>
  )
}
