import { cleanParams, toApplication, toMyApplication, toPage } from './adapters'
import axiosClient, { fetchFile } from './axiosClient'

const toQuery = ({ jobId, status, keyword, ordering, page, pageSize } = {}) =>
  cleanParams({ job: jobId, status: [].concat(status ?? []).join(','), q: keyword, ordering, page, page_size: pageSize })

// Số đơn tối đa lấy một lần cho trang "Đơn ứng tuyển" (backend giới hạn page_size <= 100)
const MY_APPLICATIONS_LIMIT = 100

const applicationApi = {
  // Ứng viên. cvId bỏ trống thì backend dùng CV mặc định
  apply: async ({ jobId, cvId, coverLetter = '' }) =>
    toMyApplication(
      await axiosClient.post('/candidate/applications/', { job_id: jobId, cv_id: cvId || null, cover_letter: coverLetter }),
    ),
  // Trả về mảng, mới nộp trước
  getMine: async () => {
    const data = await axiosClient.get('/candidate/applications/', { params: { page_size: MY_APPLICATIONS_LIMIT } })
    return data.results.map(toMyApplication)
  },
  getMineById: async (id) => toMyApplication(await axiosClient.get(`/candidate/applications/${id}/`)),
  withdraw: async (id, reason = '') =>
    toMyApplication(await axiosClient.post(`/candidate/applications/${id}/withdraw/`, { reason })),

  // Nhà tuyển dụng: params = { jobId, status, keyword, ordering, page, pageSize }
  list: async (params) =>
    toPage(await axiosClient.get('/employer/applications/', { params: toQuery(params) }), toApplication),
  getById: async (id) => toApplication(await axiosClient.get(`/employer/applications/${id}/`)),
  updateStatus: async (id, status, { note = '', rejectionReason = '' } = {}) =>
    toApplication(
      await axiosClient.post(`/employer/applications/${id}/status/`, { status, note, rejection_reason: rejectionReason }),
    ),
  rate: async (id, rating) =>
    toApplication(await axiosClient.patch(`/employer/applications/${id}/`, { recruiter_rating: rating })),
  // Trả về { blob, fileName }
  downloadCv: (id) => fetchFile(`/employer/applications/${id}/cv/`),

  // AI sàng lọc hồ sơ: backend chưa có, chỉ gọi khi FEATURES.ai bật
  screenByJob: (jobId) => axiosClient.post(`/jobs/${jobId}/applications/ai-screen/`),
  screen: (id) => axiosClient.post(`/applications/${id}/ai-screen/`),
}

export default applicationApi
