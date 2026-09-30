export function formatSalary(min, max) {
  if (!min && !max) return 'Thỏa thuận'
  if (!max) return `Từ ${min} triệu`
  if (!min) return `Đến ${max} triệu`
  return `${min} - ${max} triệu`
}

export function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('vi-VN')
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

export function getErrorMessage(error) {
  const data = error?.response?.data
  if (typeof data?.detail === 'string') return data.detail
  if (data && typeof data === 'object') {
    const first = Object.values(data)[0]
    if (Array.isArray(first)) return first[0]
    if (typeof first === 'string') return first
  }
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}
