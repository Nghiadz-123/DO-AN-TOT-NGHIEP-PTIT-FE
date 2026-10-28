import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// Ô mật khẩu có nút hiện / ẩn; các thuộc tính còn lại (id, value, onChange, autoComplete...) chuyển thẳng cho input
export default function PasswordInput({ id, ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="password-field">
      <input id={id} type={visible ? 'text' : 'password'} className="input" {...props} />
      <button
        type="button"
        className="password-toggle"
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        aria-pressed={visible}
        aria-controls={id}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </div>
  )
}
