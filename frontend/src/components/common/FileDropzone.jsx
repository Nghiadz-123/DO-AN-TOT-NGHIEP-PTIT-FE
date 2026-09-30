import { useRef, useState } from 'react'

export default function FileDropzone({ accept, onFile, disabled, hint }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (files) => {
    if (!disabled && files?.[0]) onFile(files[0])
  }

  return (
    <div
      className={`dropzone ${dragging ? 'dropzone-active' : ''} ${disabled ? 'dropzone-disabled' : ''}`}
      onClick={() => !disabled && inputRef.current.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="dropzone-icon">⬆</div>
      <strong>Kéo thả file vào đây hoặc bấm để chọn</strong>
      {hint && <p className="text-muted">{hint}</p>}
    </div>
  )
}
