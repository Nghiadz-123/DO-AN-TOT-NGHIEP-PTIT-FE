import jobMock from '@/mocks/api/jobMock'
import { USE_MOCK } from '@/utils/constants'
import axiosClient from './axiosClient'

const jobApi = {
  // Tìm kiếm: params = { keyword, location, type, level }
  getAll: (params) => axiosClient.get('/jobs/', { params }),
  getById: (id) => axiosClient.get(`/jobs/${id}/`),
  // Nhà tuyển dụng
  getMine: () => axiosClient.get('/recruiter/jobs/'),
  create: (data) => axiosClient.post('/jobs/', data),
  update: (id, data) => axiosClient.patch(`/jobs/${id}/`, data),
  remove: (id) => axiosClient.delete(`/jobs/${id}/`),
  getRecruiterStats: () => axiosClient.get('/recruiter/stats/'),
  // AI gợi ý việc làm theo CV: trả về [{ job, match }]
  getRecommended: (cvId) => axiosClient.get('/jobs/recommended/', { params: { cv_id: cvId } }),
}

export default USE_MOCK ? jobMock : jobApi
