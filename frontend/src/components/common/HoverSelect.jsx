import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Ô chọn dạng dropdown: rê chuột vào là mở danh sách lựa chọn.
// Bấm (điện thoại) hoặc Enter / Space (bàn phím) cũng mở; Esc, bấm ra ngoài hoặc rời chuột thì đóng.
// options = [{ value, label }]; lựa chọn đầu tiên luôn là `placeholder` (bỏ lọc, value = '').
// label (không bắt buộc): tên trường hiển thị phía trên, đọc kèm giá trị đang chọn.
export default function HoverSelect({ placeholder, value, options, onChange, label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const menuId = useId()
  const labelId = useId()
  const triggerId = useId()
  const selected = options.find((o) => String(o.value) === String(value))

  // Thiết bị cảm ứng không có sự kiện rời chuột: bấm ra ngoài thì đóng
  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const choose = (next) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <div
      ref={ref}
      className="hover-select"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      onBlur={(e) => !ref.current?.contains(e.relatedTarget) && setOpen(false)}
    >
      {label && (
        <span id={labelId} className="field-label">
          {label}
        </span>
      )}
      <button
        id={triggerId}
        type="button"
        className={`input hover-select-trigger ${selected ? 'has-value' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-labelledby={label ? `${labelId} ${triggerId}` : undefined}
        onClick={() => setOpen(true)}
      >
        <span className="hover-select-label">{selected ? selected.label : placeholder}</span>
        <ChevronDown className="hover-select-caret" />
      </button>
      {open && (
        <div className="hover-select-menu">
          <ul id={menuId} role="listbox" aria-label={label ?? placeholder}>
            {[{ value: '', label: placeholder }, ...options].map((o) => {
              const active = String(o.value) === String(value ?? '')
              return (
                <li key={o.value} role="option" aria-selected={active}>
                  <button type="button" className={active ? 'active' : ''} onClick={() => choose(String(o.value))}>
                    {o.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
