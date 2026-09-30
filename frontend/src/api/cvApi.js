import cvMock from '@/mocks/api/cvMock'
import { USE_MOCK } from '@/utils/constants'
import axiosClient from './axiosClient'

const cvApi = {
  getMine: () => axiosClient.get('/cv/'),
  upload: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return axiosClient.post('/cv/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  // AI chấm điểm CV và gợi ý cải thiện
  analyze: (id) => axiosClient.post(`/cv/${id}/analyze/`),
  // AI đánh giá mức độ phù hợp giữa CV và một tin tuyển dụng
  matchJob: (cvId, jobId) => axiosClient.get(`/cv/${cvId}/match/${jobId}/`),
  remove: (id) => axiosClient.delete(`/cv/${id}/`),
}

export default USE_MOCK ? cvMock : cvApi
