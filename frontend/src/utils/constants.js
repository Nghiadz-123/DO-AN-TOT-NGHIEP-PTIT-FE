export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

// Module AI (chấm điểm CV, gợi ý việc làm, sàng lọc hồ sơ) chưa có ở backend nên mặc định ẩn.
// Bật bằng VITE_FEATURE_AI=true khi backend đã có các API AI.
export const FEATURES = {
  ai: import.meta.env.VITE_FEATURE_AI === 'true',
}

export const ROLES = {
  CANDIDATE: 'candidate',
  RECRUITER: 'employer',
  ADMIN: 'admin',
}

export const TOKEN_KEY = 'access_token'
export const REFRESH_TOKEN_KEY = 'refresh_token'

// Các bộ giá trị dưới đây khớp với enum của backend (apps/catalog/choices.py, jobs, applications)
export const JOB_TYPES = [
  { value: 'full_time', label: 'Toàn thời gian' },
  { value: 'part_time', label: 'Bán thời gian' },
  { value: 'internship', label: 'Thực tập' },
  { value: 'contract', label: 'Hợp đồng' },
  { value: 'freelance', label: 'Freelance' },
]

export const WORK_MODES = [
  { value: 'onsite', label: 'Tại văn phòng' },
  { value: 'remote', label: 'Làm từ xa' },
  { value: 'hybrid', label: 'Linh hoạt (hybrid)' },
]

// Cấp bậc dùng chung cho mọi ngành nghề
export const JOB_LEVELS = [
  { value: 'intern', label: 'Thực tập sinh' },
  { value: 'fresher', label: 'Mới tốt nghiệp' },
  { value: 'staff', label: 'Nhân viên' },
  { value: 'supervisor', label: 'Trưởng nhóm / Giám sát' },
  { value: 'manager', label: 'Trưởng / Phó phòng' },
  { value: 'director', label: 'Giám đốc / Cấp cao' },
]

// Lọc tin theo thời gian đăng (số ngày), khớp backend jobs/filters.py POSTED_WITHIN_CHOICES
export const POSTED_WITHIN = [
  { value: '1', label: '24 giờ qua' },
  { value: '3', label: '3 ngày qua' },
  { value: '7', label: '7 ngày qua' },
  { value: '14', label: '14 ngày qua' },
  { value: '30', label: '30 ngày qua' },
]

export const JOB_STATUS = {
  draft: { label: 'Bản nháp', tone: 'neutral' },
  published: { label: 'Đang tuyển', tone: 'success' },
  paused: { label: 'Tạm dừng', tone: 'warning' },
  closed: { label: 'Đã đóng', tone: 'neutral' },
  expired: { label: 'Hết hạn', tone: 'danger' },
}

// Hành động đổi trạng thái tin: publish | pause | close (backend trả về allowed_actions)
export const JOB_ACTIONS = {
  publish: { label: 'Đăng tin', fromLabels: { paused: 'Tiếp tục tuyển', closed: 'Mở lại' } },
  pause: { label: 'Tạm dừng' },
  close: { label: 'Đóng tin' },
}

export const APPLICATION_STATUS = {
  applied: { label: 'Mới ứng tuyển', tone: 'info' },
  screening: { label: 'Đang sàng lọc', tone: 'primary' },
  interview: { label: 'Phỏng vấn', tone: 'warning' },
  offer: { label: 'Đề nghị nhận việc', tone: 'primary' },
  hired: { label: 'Đã tuyển', tone: 'success' },
  rejected: { label: 'Từ chối', tone: 'danger' },
  withdrawn: { label: 'Ứng viên đã rút', tone: 'neutral' },
}

// Nhãn nút chuyển trạng thái hồ sơ
export const TRANSITION_LABELS = {
  screening: 'Chuyển sàng lọc',
  interview: 'Mời phỏng vấn',
  offer: 'Gửi đề nghị',
  hired: 'Xác nhận tuyển',
  rejected: 'Từ chối',
}

export const COMPANY_SIZES = [
  { value: '1-10', label: '1 - 10 nhân viên' },
  { value: '11-50', label: '11 - 50 nhân viên' },
  { value: '51-200', label: '51 - 200 nhân viên' },
  { value: '201-500', label: '201 - 500 nhân viên' },
  { value: '501-1000', label: '501 - 1000 nhân viên' },
  { value: '1000+', label: 'Trên 1000 nhân viên' },
]

export const VERIFICATION_STATUS = {
  pending: { label: 'Chờ xác minh', tone: 'warning' },
  verified: { label: 'Đã xác minh', tone: 'success' },
  rejected: { label: 'Xác minh bị từ chối', tone: 'danger' },
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

// Backend chỉ nhận PDF và DOCX (kiểm tra theo nội dung file, .doc cũ bị từ chối)
export const CV_ACCEPT = '.pdf,.docx'
export const CV_MAX_SIZE = 5 * 1024 * 1024

// Trạng thái bóc tách văn bản CV (backend cvs.CVParseStatus)
export const CV_PARSE_STATUS = {
  pending: { label: 'Chờ xử lý', tone: 'neutral' },
  processing: { label: 'Đang đọc CV', tone: 'info' },
  completed: { label: 'Đã đọc nội dung', tone: 'success' },
  failed: { label: 'Không đọc được', tone: 'danger' },
}

export const GENDERS = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
]

export const LOGO_ACCEPT = '.jpg,.jpeg,.png,.webp'
export const LOGO_MAX_SIZE = 2 * 1024 * 1024

export const PAGE_SIZE = 10
