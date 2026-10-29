import { useEffect, useState } from 'react'
import { Download, ExternalLink, FileText, TriangleAlert } from 'lucide-react'
import talentApi from '@/api/talentApi'
import Loading from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import { getErrorMessage, saveBlob } from '@/utils/formatters'

const VIEWABLE_TYPES = ['application/pdf']

// CV chính của ứng viên: PDF xem ngay trong trang, DOCX chỉ tải về. candidate = { id, fullName }
export default function TalentCVModal({ candidate, onClose }) {
  const [file, setFile] = useState(null) // { blob, fileName, url }
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let url = null
    talentApi
      .viewCv(candidate.id)
      .then(({ blob, fileName }) => {
        if (!active) return
        url = URL.createObjectURL(blob)
        setFile({ blob, fileName, url })
      })
      .catch((err) => active && setError(getErrorMessage(err)))
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [candidate.id])

  const viewable = file && VIEWABLE_TYPES.includes(file.blob.type)

  return (
    <Modal
      open
      size="xl"
      title={`CV: ${candidate.fullName}`}
      onClose={onClose}
      footer={
        <>
          {viewable && (
            <a className="btn btn-outline" href={file.url} target="_blank" rel="noreferrer">
              <ExternalLink />
              Mở tab mới
            </a>
          )}
          <button type="button" className="btn btn-outline" disabled={!file} onClick={() => saveBlob(file.blob, file.fileName)}>
            <Download />
            Tải về
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
        </>
      }
    >
      {error && (
        <div className="alert alert-error" role="alert">
          <TriangleAlert />
          <div className="alert-content">{error}</div>
        </div>
      )}
      {!file && !error && <Loading text="Đang tải CV..." />}
      {viewable && <iframe className="cv-viewer" src={file.url} title={`CV ${candidate.fullName}`} />}
      {file && !viewable && (
        <div className="empty-state">
          <span className="empty-state-icon">
            <FileText />
          </span>
          <p>CV “{file.fileName}” là file Word, trình duyệt không xem trực tiếp được. Bấm “Tải về” để mở bằng Word.</p>
        </div>
      )}
    </Modal>
  )
}
