import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FilePen, FileSearch, FileUp, Gauge, Lightbulb, Pencil, RefreshCw, Sparkles, Target, Trash, TriangleAlert } from 'lucide-react'
import aiApi from '@/api/aiApi'
import cvApi from '@/api/cvApi'
import AiProgress from '@/components/common/AiProgress'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import FileDropzone from '@/components/common/FileDropzone'
import Loading from '@/components/common/Loading'
import ScoreCircle from '@/components/common/ScoreCircle'
import { SkeletonCards } from '@/components/common/Skeleton'
import { CVScoreResult, CVSuggestionList } from '@/components/cv/CVAnalysisResult'
import CVNotReady from '@/components/cv/CVNotReady'
import CVParsedInfo from '@/components/cv/CVParsedInfo'
import useFetch from '@/hooks/useFetch'
import { CV_ACCEPT, CV_PARSE_STATUS } from '@/utils/constants'
import { validateCvFile } from '@/utils/file'
import { formatDate, formatFileSize, getErrorMessage } from '@/utils/formatters'

const TABS = [
  { key: 'score', label: 'Chấm điểm', icon: Gauge },
  { key: 'suggestions', label: 'Gợi ý sửa CV', icon: Lightbulb },
  { key: 'profile', label: 'Thông tin AI trích xuất', icon: FileSearch },
]

const byCv = (analyses) => Object.fromEntries(analyses.map((a) => [a.cvId, a]))

export default function CVAnalysisPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: cvs, loading, error, setData: setCvs, reload } = useFetch(() => cvApi.getMine(), [])
  const { data: analyses, setData: setAnalyses } = useFetch(async () => byCv(await aiApi.getAnalyses()), [])
  const [busy, setBusy] = useState(null) // { cvId, action: 'score' | 'suggestions' }
  const [uploading, setUploading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [deleting, setDeleting] = useState(null) // CV đang chờ xác nhận xóa
  const tabRefs = useRef({})

  const tab = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'score'
  const selected = cvs?.find((c) => c.id === searchParams.get('cvId')) ?? cvs?.find((c) => c.isDefault) ?? cvs?.[0]
  const analysis = selected ? analyses?.[selected.id] : null

  // CV / tab nằm trên URL để trang khác dẫn link tới đúng chỗ
  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    setSearchParams(next, { replace: true })
  }

  // Tab theo mẫu WAI-ARIA: mũi tên trái / phải, Home / End chuyển tab
  const onTabKeyDown = (e) => {
    const index = TABS.findIndex((t) => t.key === tab)
    const moves = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: TABS.length - 1 }
    if (!(e.key in moves)) return
    e.preventDefault()
    const next = TABS[(moves[e.key] + TABS.length) % TABS.length]
    updateParams({ tab: next.key })
    tabRefs.current[next.key]?.focus()
  }

  const runAi = async (cv, action) => {
    setBusy({ cvId: cv.id, action })
    setActionError('')
    try {
      const result = action === 'score' ? await aiApi.scoreCv(cv.id) : await aiApi.suggestCv(cv.id)
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

  const confirmDelete = async () => {
    const cv = deleting
    setDeleting(null)
    try {
      await cvApi.remove(cv.id)
      setCvs((list) => list.filter((c) => c.id !== cv.id))
      if (selected?.id === cv.id) updateParams({ cvId: '' })
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  if (loading) return <SkeletonCards count={2} className="grid grid-2" label="Đang tải danh sách CV" />
  if (error) return <ErrorState message={error} onRetry={reload} />

  const isBusy = Boolean(busy)
  const running = busy && busy.cvId === selected?.id ? busy.action : null
  const ready = selected?.parseStatus === 'completed'

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow eyebrow-ai">
            <Sparkles />
            Trợ lý AI
          </p>
          <h1>AI chấm điểm & gợi ý sửa CV</h1>
          <p className="text-muted">
            AI đọc CV, chấm điểm theo 5 tiêu chí và gợi ý cách sửa dựa trên yêu cầu của các tin tuyển dụng thật.
          </p>
        </div>
        <Link to="/create-cv" className="btn btn-outline">
          <FilePen />
          Tạo CV mới
        </Link>
      </div>

      {actionError && (
        <div className="alert alert-error" role="alert">
          <TriangleAlert />
          <div className="alert-content">{actionError}</div>
        </div>
      )}

      <div className="layout-sidebar layout-sidebar-left">
        <aside className="stack">
          <section className="card">
            <h2 className="card-section-title">
              <FileUp />
              Tải CV lên
            </h2>
            {uploading ? (
              <Loading text="Đang tải lên và đọc CV..." />
            ) : (
              <FileDropzone accept={CV_ACCEPT} onFile={handleFile} disabled={isBusy} hint="PDF, DOCX · tối đa 5MB" />
            )}
          </section>

          <section className="card">
            <h2 className="card-section-title">
              Danh sách CV <span className="badge badge-neutral">{cvs.length}</span>
            </h2>
            {cvs.length === 0 && <p className="text-muted">Bạn chưa tải CV nào.</p>}
            <ul className="cv-select-list">
              {cvs.map((cv) => {
                const score = analyses?.[cv.id]?.score
                const current = cv.id === selected?.id
                return (
                  <li key={cv.id} className={`cv-item ${current ? 'selected' : ''}`}>
                    <button
                      type="button"
                      className="cv-item-select"
                      aria-current={current ? 'true' : undefined}
                      onClick={() => updateParams({ cvId: cv.id })}
                    >
                      <span className="cv-item-info">
                        <strong>{cv.title || cv.fileName}</strong>
                        <small>
                          {formatFileSize(cv.fileSize)} · {formatDate(cv.uploadedAt)}
                        </small>
                      </span>
                      {score ? (
                        <ScoreCircle score={score.total} size={40} showLabel={false} />
                      ) : (
                        <span className="cv-item-status">
                          {cv.parseStatus === 'completed' ? 'Chưa chấm' : CV_PARSE_STATUS[cv.parseStatus]?.label}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Xóa CV"
                      aria-label={`Xóa CV ${cv.title || cv.fileName}`}
                      disabled={isBusy}
                      onClick={() => setDeleting(cv)}
                    >
                      <Trash />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        </aside>

        <section className="card" aria-labelledby={selected ? 'ai-cv-title' : undefined}>
          {!selected ? (
            <EmptyState icon={FileUp} title="Chưa có CV để phân tích" description="Tải CV lên ở khung bên trái để bắt đầu." />
          ) : (
            <>
              <div className="cv-panel-head">
                <div>
                  <h2 id="ai-cv-title">{selected.title || selected.fileName}</h2>
                  <p className="text-muted">
                    {selected.fileName} · tải lên ngày {formatDate(selected.uploadedAt)}
                  </p>
                </div>
                <div className="actions">
                  <Link to={`/cv/${selected.id}/edit`} className="btn btn-ghost btn-sm">
                    <Pencil />
                    Sửa thông tin
                  </Link>
                  <Link to={`/recommended-jobs?cvId=${selected.id}`} className="btn btn-primary btn-sm">
                    <Target />
                    Xem việc làm phù hợp
                  </Link>
                </div>
              </div>

              {!ready && <CVNotReady cv={selected} />}

              <div className="tabs" role="tablist" aria-label="Kết quả AI">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    ref={(el) => (tabRefs.current[t.key] = el)}
                    id={`ai-tab-${t.key}`}
                    type="button"
                    role="tab"
                    className="tab"
                    aria-selected={tab === t.key}
                    aria-controls="ai-tabpanel"
                    tabIndex={tab === t.key ? 0 : -1}
                    onClick={() => updateParams({ tab: t.key })}
                    onKeyDown={onTabKeyDown}
                  >
                    <t.icon />
                    {t.label}
                  </button>
                ))}
              </div>

              <div id="ai-tabpanel" className="tabpanel" role="tabpanel" aria-labelledby={`ai-tab-${tab}`} tabIndex={0}>
                {tab === 'score' &&
                  (running === 'score' ? (
                    <AiProgress text="AI đang chấm điểm CV, thường mất 5-15 giây..." />
                  ) : analysis?.score ? (
                    <>
                      <div className="ai-panel-head">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={isBusy || !ready}
                          onClick={() => runAi(selected, 'score')}
                        >
                          <RefreshCw />
                          Chấm điểm lại
                        </button>
                      </div>
                      <CVScoreResult score={analysis.score} />
                    </>
                  ) : (
                    <EmptyState
                      icon={Gauge}
                      title="CV chưa được chấm điểm"
                      description="AI chấm điểm CV theo 5 tiêu chí và chỉ ra điểm mạnh, điểm cần cải thiện."
                      action={
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={isBusy || !ready}
                          onClick={() => runAi(selected, 'score')}
                        >
                          <Sparkles />
                          Chấm điểm bằng AI
                        </button>
                      }
                    />
                  ))}

                {tab === 'suggestions' &&
                  (running === 'suggestions' ? (
                    <AiProgress text="AI đang đối chiếu CV với các tin tuyển dụng, thường mất 5-15 giây..." />
                  ) : analysis?.suggestions ? (
                    <>
                      <div className="ai-panel-head">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={isBusy || !ready}
                          onClick={() => runAi(selected, 'suggestions')}
                        >
                          <RefreshCw />
                          Gợi ý lại
                        </button>
                      </div>
                      <CVSuggestionList suggestions={analysis.suggestions} />
                    </>
                  ) : (
                    <EmptyState
                      icon={Lightbulb}
                      title="Chưa có gợi ý"
                      description="AI so CV với yêu cầu của các tin tuyển dụng phù hợp và gợi ý cách sửa từng phần."
                      action={
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={isBusy || !ready}
                          onClick={() => runAi(selected, 'suggestions')}
                        >
                          <Lightbulb />
                          Gợi ý sửa CV
                        </button>
                      }
                    />
                  ))}

                {tab === 'profile' &&
                  (analysis?.profile ? (
                    <CVParsedInfo parsed={analysis.profile} />
                  ) : (
                    <EmptyState
                      icon={FileSearch}
                      title="Chưa có thông tin trích xuất"
                      description="Chấm điểm CV để AI trích xuất thông tin."
                    />
                  ))}
              </div>
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xóa CV?"
        message={deleting && `CV "${deleting.title || deleting.fileName}" và kết quả AI của CV này sẽ bị xóa.`}
        confirmLabel="Xóa CV"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
