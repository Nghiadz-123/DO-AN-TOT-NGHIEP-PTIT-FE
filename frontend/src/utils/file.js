import { CV_ACCEPT, CV_MAX_SIZE } from './constants'

const CV_EXTENSIONS = CV_ACCEPT.split(',').map((ext) => ext.replace('.', ''))

export const fileExtension = (name = '') => (name.includes('.') ? name.split('.').pop().toLowerCase() : '')

// "NguyenVanAn_Frontend-CV.pdf" -> "NguyenVanAn Frontend CV" (gợi ý tên CV)
export const fileTitle = (name = '') =>
  name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Kiểm tra file CV trước khi tải lên; trả về thông điệp lỗi hoặc null
export function validateCvFile(file) {
  if (!CV_EXTENSIONS.includes(fileExtension(file.name))) return 'Chỉ hỗ trợ file PDF, DOC hoặc DOCX.'
  if (file.size === 0) return 'File rỗng, vui lòng chọn file khác.'
  if (file.size > CV_MAX_SIZE) return `Dung lượng file tối đa ${CV_MAX_SIZE / 1024 / 1024}MB.`
  return null
}
