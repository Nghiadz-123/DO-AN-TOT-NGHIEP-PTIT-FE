export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

// Dùng dữ liệu giả lập (mock) khi backend chưa sẵn sàng. Đặt VITE_USE_MOCK=false để gọi API thật.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export const ROLES = {
  CANDIDATE: 'candidate',
  RECRUITER: 'recruiter',
}

export const TOKEN_KEY = 'access_token'

export const JOB_TYPES = [
  { value: 'Full-time', label: 'Toàn thời gian' },
  { value: 'Part-time', label: 'Bán thời gian' },
  { value: 'Internship', label: 'Thực tập' },
  { value: 'Remote', label: 'Làm từ xa' },
]

export const JOB_LEVELS = [
  { value: 'Intern', label: 'Thực tập sinh' },
  { value: 'Fresher', label: 'Fresher' },
  { value: 'Junior', label: 'Junior' },
  { value: 'Middle', label: 'Middle' },
  { value: 'Senior', label: 'Senior' },
  { value: 'Lead', label: 'Trưởng nhóm' },
]

export const LOCATIONS = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ']

export const APPLICATION_STATUS = {
  pending: { label: 'Chờ xử lý', tone: 'neutral' },
  reviewing: { label: 'Đang xem xét', tone: 'info' },
  shortlisted: { label: 'Vào vòng trong', tone: 'primary' },
  interview: { label: 'Mời phỏng vấn', tone: 'warning' },
  hired: { label: 'Đã tuyển', tone: 'success' },
  rejected: { label: 'Từ chối', tone: 'danger' },
}

export const AI_RECOMMENDATION = {
  strong: { label: 'Rất phù hợp', tone: 'success' },
  consider: { label: 'Nên cân nhắc', tone: 'warning' },
  weak: { label: 'Ít phù hợp', tone: 'danger' },
}

export const SUGGESTION_PRIORITY = {
  high: { label: 'Ưu tiên cao', tone: 'danger' },
  medium: { label: 'Nên sửa', tone: 'warning' },
  low: { label: 'Gợi ý thêm', tone: 'info' },
}

export const CV_ACCEPT = '.pdf,.doc,.docx'
export const CV_MAX_SIZE = 5 * 1024 * 1024
