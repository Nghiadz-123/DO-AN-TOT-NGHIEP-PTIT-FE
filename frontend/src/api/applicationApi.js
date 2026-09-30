import applicationMock from '@/mocks/api/applicationMock'
import { USE_MOCK } from '@/utils/constants'
import axiosClient from './axiosClient'

const applicationApi = {
  // Ứng viên
  apply: (data) => axiosClient.post('/applications/', data),
  getMine: () => axiosClient.get('/applications/me/'),
  // Nhà tuyển dụng
  getByJob: (jobId) => axiosClient.get(`/jobs/${jobId}/applications/`),
  getById: (id) => axiosClient.get(`/applications/${id}/`),
  updateStatus: (id, status) => axiosClient.patch(`/applications/${id}/`, { status }),
  // AI sàng lọc toàn bộ hồ sơ của một tin / một hồ sơ
  screenByJob: (jobId) => axiosClient.post(`/jobs/${jobId}/applications/ai-screen/`),
  screen: (id) => axiosClient.post(`/applications/${id}/ai-screen/`),
}

export default USE_MOCK ? applicationMock : applicationApi
