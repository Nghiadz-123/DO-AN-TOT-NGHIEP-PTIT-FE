import { CircleCheck, TriangleAlert } from 'lucide-react'

// Kết quả lưu form, đặt cạnh nút lưu để người dùng thấy ngay. message = { type: 'success' | 'error', text }
export default function FormStatus({ message }) {
  if (!message) return null
  const isError = message.type === 'error'
  return (
    <p className={`form-status ${isError ? 'text-danger' : 'text-success'}`} role={isError ? 'alert' : 'status'}>
      {isError ? <TriangleAlert /> : <CircleCheck />}
      {message.text}
    </p>
  )
}
