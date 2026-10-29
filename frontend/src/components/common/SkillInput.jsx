import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'
import catalogApi from '@/api/catalogApi'

// Nhập kỹ năng dạng tag (form đăng tin của nhà tuyển dụng). inputProps (id, aria-*) gắn vào ô nhập để nối với nhãn / lỗi
export default function SkillInput({
  value,
  onChange,
  placeholder = 'Nhập kỹ năng rồi nhấn Enter (VD: Bán hàng, Excel, Tiếng Anh)',
  ...inputProps
}) {
  const listId = useId()
  const [text, setText] = useState('')
  const [suggestions, setSuggestions] = useState([])

  // Gợi ý từ danh mục kỹ năng chuẩn hóa (backend gom "ReactJS", "React.js" về "React")
  useEffect(() => {
    const keyword = text.trim()
    if (!keyword) return undefined
    const timer = setTimeout(() => {
      catalogApi
        .searchSkills(keyword)
        .then((items) => setSuggestions(items.map((s) => s.name)))
        .catch(() => setSuggestions([]))
    }, 250)
    return () => clearTimeout(timer)
  }, [text])

  const add = () => {
    const skills = text
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !value.some((v) => v.toLowerCase() === s.toLowerCase()))
    if (skills.length) onChange([...value, ...skills])
    setText('')
  }

  return (
    <div className="skill-input">
      {value.length > 0 && (
        <ul className="tags" aria-label="Kỹ năng đã thêm">
          {value.map((s) => (
            <li key={s} className="tag">
              {s}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== s))} aria-label={`Xóa kỹ năng ${s}`}>
                <X />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        {...inputProps}
        className="input"
        list={listId}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add()
          }
        }}
        onBlur={add}
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  )
}
