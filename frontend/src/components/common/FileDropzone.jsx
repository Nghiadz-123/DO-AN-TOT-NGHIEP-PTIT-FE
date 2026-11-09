import { useId, useState } from 'react'
import { Upload } from 'lucide-react'

// Vùng chọn file: là <label> bọc input file (ẩn bằng visually-hidden, không phải display:none)
// nên bấm chuột, Tab + Enter / Space đều mở hộp chọn file; kéo thả là cách phụ.
export default function FileDropzone({ accept, onFile, disabled, hint }) {
  const inputId = useId()
  const hintId = useId()
  const [dragging, setDragging] = useState(false)

  const handleFiles = (files) => {
    if (!disabled && files?.[0]) onFile(files[0])
  }

  return (
    <label
      htmlFor={inputId}
      className={`dropzone ${dragging ? 'dropzone-active' : ''} ${disabled ? 'dropzone-disabled' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
    >
      <input
        id={inputId}
        type="file"
        accept={accept}
        className="visually-hidden"
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <span className="dropzone-icon">
        <Upload />
      </span>
      <strong>
        Kéo thả file vào đây hoặc <span className="dropzone-link">chọn file từ máy</span>
      </strong>
      {hint && (
        <span id={hintId} className="dropzone-hint">
          {hint}
        </span>
      )}
    </label>
  )
}
