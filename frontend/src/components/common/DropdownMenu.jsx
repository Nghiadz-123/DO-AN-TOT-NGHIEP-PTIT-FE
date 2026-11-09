import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const MENU_GAP = 8

// Menu thả xuống dạng disclosure: nút có aria-expanded + danh sách liên kết / nút.
// items: [{ label, icon, to } | { label, icon, onClick, danger, disabled } | { divider: true }]
// Đóng khi chọn mục, bấm ra ngoài hoặc Esc (trả focus về nút mở).
// fixed: định vị menu theo cửa sổ (menu trong bảng có thanh cuộn ngang sẽ không bị khung bảng cắt mất)
export default function DropdownMenu({
  trigger,
  triggerClassName = 'btn btn-ghost btn-icon btn-sm',
  label,
  items,
  header,
  align = 'end',
  fixed = false,
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const ref = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Menu cố định: nằm dưới nút, thiếu chỗ thì lật lên trên; đặt lại khi cuộn hoặc đổi cỡ cửa sổ
  useLayoutEffect(() => {
    if (!open || !fixed) return undefined
    const place = () => {
      const button = buttonRef.current.getBoundingClientRect()
      const menuHeight = menuRef.current.offsetHeight
      const below = window.innerHeight - button.bottom
      const top =
        below < menuHeight + MENU_GAP && button.top > below ? button.top - MENU_GAP - menuHeight : button.bottom + MENU_GAP
      setPosition(
        align === 'start'
          ? { top, left: button.left }
          : { top, right: document.documentElement.clientWidth - button.right },
      )
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, fixed, align])

  const close = () => setOpen(false)

  return (
    <div
      ref={ref}
      className="dropdown"
      onBlur={(e) => !ref.current?.contains(e.relatedTarget) && close()}
    >
      <button
        ref={buttonRef}
        type="button"
        className={triggerClassName}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      <div
        ref={menuRef}
        id={menuId}
        className="dropdown-menu"
        data-align={align}
        style={fixed && position ? { position: 'fixed', ...position } : undefined}
        hidden={!open}
      >
        {header && <div className="dropdown-header">{header}</div>}
        {items.map((item, index) => {
          if (item.divider) return <hr key={`divider-${index}`} className="dropdown-divider" />
          const Icon = item.icon
          const className = `dropdown-item ${item.danger ? 'dropdown-item-danger' : ''}`
          const content = (
            <>
              {Icon && <Icon />}
              {item.label}
            </>
          )
          return item.to ? (
            <Link key={item.label} to={item.to} className={className} onClick={close}>
              {content}
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              className={className}
              disabled={item.disabled}
              onClick={() => {
                close()
                item.onClick()
              }}
            >
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}
