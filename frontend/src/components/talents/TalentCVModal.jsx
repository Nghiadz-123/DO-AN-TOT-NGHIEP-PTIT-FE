import { useEffect, useState } from 'react'
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
      size="lg"
      title={`CV: ${candidate.fullName}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" disabled={!file} onClick={() => saveBlob(file.blob, file.fileName)}>
            ⬇ Tải về
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      {!file && !error && <Loading text="Đang tải CV..." />}
      {viewable && <iframe className="cv-viewer" src={file.url} title={`CV ${candidate.fullName}`} />}
      {file && !viewable && (
        <p className="text-muted">
          CV “{file.fileName}” là file Word, trình duyệt không xem trực tiếp được. Bấm “Tải về” để mở bằng Word.
        </p>
      )}
    </Modal>
  )
}
