// Lương hiển thị theo "triệu" (API thật trả VND, đã quy đổi ở src/api/adapters.js)
export function formatSalary(min, max, negotiable = false) {
  if (!min && !max) return 'Thỏa thuận'
  const suffix = negotiable ? ' (thỏa thuận)' : ''
  if (!max) return `Từ ${min} triệu${suffix}`
  if (!min) return `Đến ${max} triệu${suffix}`
  return `${min} - ${max} triệu${suffix}`
}

export function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('vi-VN')
}

export function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function labelOf(options, value) {
  return options.find((o) => o.value === value)?.label ?? value
}

export function scoreLevel(score) {
  if (score >= 80) return { label: 'Rất tốt', tone: 'success' }
  if (score >= 65) return { label: 'Khá', tone: 'primary' }
  if (score >= 50) return { label: 'Trung bình', tone: 'warning' }
  return { label: 'Cần cải thiện', tone: 'danger' }
}

export function isExpired(deadline) {
  return deadline ? new Date(deadline) < new Date(new Date().toDateString()) : false
}

// Thông điệp lỗi từ response backend: { detail, code, errors }
export function getErrorMessage(error) {
  const data = error?.response?.data
  if (typeof data?.detail === 'string' && data.detail) return data.detail
  if (data && typeof data === 'object') {
    const first = Object.values(data.errors ?? data)[0]
    if (Array.isArray(first)) return first[0]
    if (typeof first === 'string') return first
  }
  if (error?.response?.status >= 500) return 'Máy chủ gặp lỗi, vui lòng thử lại sau.'
  if (error?.code === 'ERR_NETWORK') return 'Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}

// Lưu file (Blob) về máy
export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || 'download'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
