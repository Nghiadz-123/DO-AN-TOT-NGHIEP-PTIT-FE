import { Sparkles } from 'lucide-react'

// Trạng thái chờ AI (5–20 giây): nói rõ đang làm gì và mất bao lâu, thay cho vòng xoay trơn
export default function AiProgress({ text, hint = 'Kết quả sẽ hiện ngay tại đây khi AI xử lý xong.' }) {
  return (
    <div className="ai-progress" role="status" aria-live="polite">
      <span className="ai-progress-icon" aria-hidden="true">
        <Sparkles />
      </span>
      <div className="ai-progress-body">
        <strong>{text}</strong>
        <div className="ai-progress-bar" aria-hidden="true">
          <span />
        </div>
        <p>{hint}</p>
      </div>
    </div>
  )
}
