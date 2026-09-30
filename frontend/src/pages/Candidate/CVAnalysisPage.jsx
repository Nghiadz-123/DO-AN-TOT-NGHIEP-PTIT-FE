import { useState } from 'react'
import { Link } from 'react-router-dom'
import cvApi from '@/api/cvApi'
import FileDropzone from '@/components/common/FileDropzone'
import Loading from '@/components/common/Loading'
import ScoreCircle from '@/components/common/ScoreCircle'
import CVAnalysisResult from '@/components/cv/CVAnalysisResult'
import CVParsedInfo from '@/components/cv/CVParsedInfo'
import useFetch from '@/hooks/useFetch'
import { CV_ACCEPT, CV_MAX_SIZE } from '@/utils/constants'
import { formatDate, formatFileSize, getErrorMessage } from '@/utils/formatters'

const TABS = [
  { key: 'analysis', label: '✨ AI chấm điểm & gợi ý' },
  { key: 'parsed', label: '📄 Thông tin trích xuất' },
]

function validateFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  if (!['pdf', 'doc', 'docx'].includes(ext)) return 'Chỉ hỗ trợ file PDF, DOC hoặc DOCX.'
  if (file.size > CV_MAX_SIZE) return 'Dung lượng file tối đa 5MB.'
  return null
}

export default function CVAnalysisPage() {
  const { data: cvs, loading, error, setData: setCvs } = useFetch(() => cvApi.getMine(), [])
  const [selectedId, setSelectedId] = useState(null)
  const [tab, setTab] = useState('analysis')
  const [uploading, setUploading] = useState(false)
  const [analyzingId, setAnalyzingId] = useState(null)
  const [actionError, setActionError] = useState('')

  const selected = cvs?.find((c) => c.id === selectedId) ?? cvs?.[0]

  const runAnalysis = async (id) => {
    setAnalyzingId(id)
    setActionError('')
    try {
      const analyzed = await cvApi.analyze(id)
      setCvs((list) => list.map((c) => (c.id === id ? analyzed : c)))
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setAnalyzingId(null)
    }
  }

  const handleFile = async (file) => {
    const invalid = validateFile(file)
    if (invalid) return setActionError(invalid)

    setUploading(true)
    setActionError('')
    try {
      const cv = await cvApi.upload(file)
      setCvs((list) => [cv, ...list])
      setSelectedId(cv.id)
      setTab('analysis')
      setUploading(false)
      await runAnalysis(cv.id) // tự động chấm điểm ngay sau khi tải lên
    } catch (err) {
      setActionError(getErrorMessage(err))
      setUploading(false)
    }
  }

  const handleDelete = async (cv) => {
    if (!window.confirm(`Xóa CV "${cv.fileName}"?`)) return
    try {
      await cvApi.remove(cv.id)
      setCvs((list) => list.filter((c) => c.id !== cv.id))
      if (selectedId === cv.id) setSelectedId(null)
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  if (loading) return <Loading />
  if (error) return <div className="alert alert-error">{error}</div>

  const analyzing = analyzingId === selected?.id

  return (
    <>
      <div className="page-header">
        <div>
          <h1>CV của tôi & AI chấm điểm</h1>
          <p className="text-muted">
            Tải CV lên để AI bóc tách thông tin, chấm điểm và đưa ra gợi ý giúp CV của bạn nổi bật hơn.
          </p>
        </div>
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}

      <div className="layout-sidebar layout-sidebar-left">
        <aside className="stack">
          <div className="card">
            <h3>Tải CV lên</h3>
            {uploading ? (
              <Loading text="AI đang đọc và bóc tách CV..." />
            ) : (
              <FileDropzone accept={CV_ACCEPT} onFile={handleFile} hint="PDF, DOC, DOCX · tối đa 5MB" />
            )}
          </div>

          <div className="card">
            <h3>Danh sách CV ({cvs.length})</h3>
            {cvs.length === 0 && <p className="text-muted">Bạn chưa tải CV nào.</p>}
            <ul className="cv-list">
              {cvs.map((cv) => (
                <li
                  key={cv.id}
                  className={`cv-item ${cv.id === selected?.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(cv.id)}
                >
                  <div className="cv-item-info">
                    <strong>{cv.fileName}</strong>
                    <small className="text-muted">
                      {formatFileSize(cv.fileSize)} · {formatDate(cv.uploadedAt)}
                    </small>
                  </div>
                  {cv.analysis ? (
                    <ScoreCircle score={cv.analysis.overallScore} size={40} showLabel={false} />
                  ) : (
                    <small className="text-muted">Chưa chấm</small>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    title="Xóa CV"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(cv)
                    }}
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="card">
          {!selected ? (
            <div className="empty-state">
              <h3>Chưa có CV để phân tích</h3>
              <p className="text-muted">Tải CV lên ở khung bên trái để bắt đầu.</p>
            </div>
          ) : (
            <>
              <div className="page-header">
                <div>
                  <h2>{selected.fileName}</h2>
                  <p className="text-muted">Tải lên ngày {formatDate(selected.uploadedAt)}</p>
                </div>
                <div className="actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => runAnalysis(selected.id)}
                    disabled={Boolean(analyzingId)}
                  >
                    {selected.analysis ? '↻ Chấm điểm lại' : '✨ Chấm điểm bằng AI'}
                  </button>
                  <Link to={`/recommended-jobs?cvId=${selected.id}`} className="btn btn-primary">
                    Xem việc làm phù hợp
                  </Link>
                </div>
              </div>

              <div className="tabs">
                {TABS.map((t) => (
                  <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'parsed' && <CVParsedInfo parsed={selected.parsed} />}
              {tab === 'analysis' &&
                (analyzing ? (
                  <Loading text="AI đang chấm điểm và phân tích CV của bạn..." />
                ) : selected.analysis ? (
                  <CVAnalysisResult analysis={selected.analysis} />
                ) : (
                  <div className="empty-state">
                    <h3>CV chưa được chấm điểm</h3>
                    <p className="text-muted">Bấm nút bên dưới để AI phân tích và gợi ý cải thiện CV.</p>
                    <button className="btn btn-primary" onClick={() => runAnalysis(selected.id)}>
                      ✨ Chấm điểm bằng AI
                    </button>
                  </div>
                ))}
            </>
          )}
        </section>
      </div>
    </>
  )
}
