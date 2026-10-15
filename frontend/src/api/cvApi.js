import cvMock from '@/mocks/api/cvMock'
import { USE_MOCK } from '@/utils/constants'
import axiosClient from './axiosClient'

const fromBackendCv = (dto) => {
  const parsedData = dto.parsed_data ?? null
  return {
    id: dto.id,
    fileName: dto.original_filename || dto.title,
    title: dto.title,
    fileSize: dto.file_size,
    mimeType: dto.mime_type,
    uploadedAt: dto.created_at,
    parseStatus: dto.parse_status,
    parseError: dto.parse_error,
    parsed: parsedData ? {
      fullName: '',
      title: dto.title,
      email: parsedData.contact?.emails?.[0] ?? '',
      phone: parsedData.contact?.phones?.[0] ?? '',
      location: '',
      links: parsedData.contact?.links ?? [],
      skills: [],
      experience: [],
      education: [],
      stats: parsedData.stats ?? {},
      rawText: dto.raw_text ?? '',
    } : null,
    analysis: null,
  }
}

const cvApi = {
  getMine: async () => {
    const list = await axiosClient.get('/candidate/cvs/')
    return Promise.all(list.map(async (cv) => fromBackendCv(await axiosClient.get(`/candidate/cvs/${cv.id}/`))))
  },
  upload: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const dto = await axiosClient.post('/candidate/cvs/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return fromBackendCv(dto)
  },
  // Backend hiện bóc tách văn bản nhưng chưa cung cấp API chấm điểm AI.
  analyze: async (id) => fromBackendCv(await axiosClient.get(`/candidate/cvs/${id}/`)),
  // AI đánh giá mức độ phù hợp giữa CV và một tin tuyển dụng
  matchJob: (cvId, jobId) => axiosClient.get(`/candidate/cvs/${cvId}/match/${jobId}/`),
  remove: (id) => axiosClient.delete(`/candidate/cvs/${id}/`),
}

export default USE_MOCK ? cvMock : cvApi
