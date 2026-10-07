export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

// Dùng dữ liệu giả lập (mock) khi backend chưa sẵn sàng. Đặt VITE_USE_MOCK=false để gọi API thật.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

const flag = (value, fallback) => (value === undefined || value === '' ? fallback : value === 'true')

// Nhóm chức năng backend chưa có ở giai đoạn 1 (chỉ Nhà tuyển dụng). Chế độ mock bật tất cả để demo;
// khi gọi API thật thì ẩn đi, bật lại bằng VITE_FEATURE_AI / VITE_FEATURE_CANDIDATE khi backend hỗ trợ.
export const FEATURES = {
  ai: flag(import.meta.env.VITE_FEATURE_AI, USE_MOCK),
  candidate: flag(import.meta.env.VITE_FEATURE_CANDIDATE, USE_MOCK),
}

export const ROLES = {
  CANDIDATE: 'candidate',
  RECRUITER: 'employer',
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

export const JOB_LEVELS = [
  { value: 'intern', label: 'Thực tập sinh' },
  { value: 'fresher', label: 'Fresher' },
  { value: 'junior', label: 'Junior' },
  { value: 'middle', label: 'Middle' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Trưởng nhóm' },
  { value: 'manager', label: 'Quản lý' },
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

// Pipeline ATS, giống backend (apps/applications/workflow.py). API thật trả sẵn allowed_transitions;
// bảng này dùng cho chế độ mock.
export const APPLICATION_TRANSITIONS = {
  applied: ['screening', 'interview', 'rejected'],
  screening: ['interview', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: ['hired', 'rejected'],
  rejected: ['screening'],
  hired: [],
  withdrawn: [],
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

export const CV_ACCEPT = '.pdf,.doc,.docx'
export const CV_MAX_SIZE = 5 * 1024 * 1024

export const LOGO_ACCEPT = '.jpg,.jpeg,.png,.webp'
export const LOGO_MAX_SIZE = 2 * 1024 * 1024

export const PAGE_SIZE = 10
