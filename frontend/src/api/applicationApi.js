import applicationMock from '@/mocks/api/applicationMock'
import { USE_MOCK } from '@/utils/constants'
import { cleanParams, toApplication, toPage } from './adapters'
import axiosClient, { fetchFile } from './axiosClient'

const toQuery = ({ jobId, status, keyword, ordering, page, pageSize } = {}) =>
  cleanParams({ job: jobId, status: [].concat(status ?? []).join(','), q: keyword, ordering, page, page_size: pageSize })

const applicationApi = {
  // Ứng viên (giai đoạn sau)
  apply: (data) => axiosClient.post('/applications/', data),
  getMine: () => axiosClient.get('/applications/me/'),

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

  // AI sàng lọc hồ sơ (giai đoạn sau)
  screenByJob: (jobId) => axiosClient.post(`/jobs/${jobId}/applications/ai-screen/`),
  screen: (id) => axiosClient.post(`/applications/${id}/ai-screen/`),
}

export default USE_MOCK ? applicationMock : applicationApi
