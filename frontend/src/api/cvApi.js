import cvMock from '@/mocks/api/cvMock'
import { USE_MOCK } from '@/utils/constants'
import { fileTitle } from '@/utils/file'
import { toCV, toCVFormData } from './adapters'
import axiosClient, { fetchFile } from './axiosClient'

const BASE = '/candidate/cvs/'

// Header multipart bắt buộc: axiosClient mặc định JSON sẽ chuyển FormData thành JSON
const multipart = (onProgress) => ({
  headers: { 'Content-Type': 'multipart/form-data' },
  onUploadProgress: onProgress && ((e) => e.total && onProgress(Math.round((e.loaded * 100) / e.total))),
})

// Danh sách có thể trả mảng hoặc trang { results }
const toList = (data) => (Array.isArray(data) ? data : data.results).map(toCV)

const cvApi = {
  // CV chính đứng đầu, sau đó mới nhất trước
  getMine: async () => toList(await axiosClient.get(BASE)),
  getById: async (id) => toCV(await axiosClient.get(`${BASE}${id}/`)),

  // form: view-model của CVFormPage; options = { file, onProgress(percent) }
  create: async (form, { file, onProgress } = {}) =>
    toCV(await axiosClient.post(BASE, toCVFormData(form, file), multipart(onProgress))),
  update: async (id, form, { file, onProgress } = {}) =>
    toCV(await axiosClient.patch(`${BASE}${id}/`, toCVFormData(form, file), multipart(onProgress))),

  // Tải nhanh chỉ với file (trang AI chấm điểm): tên CV lấy theo tên file
  upload: async (file) => {
    const data = new FormData()
    data.append('file', file)
    data.append('title', fileTitle(file.name))
    return toCV(await axiosClient.post(BASE, data, multipart()))
  },

  setDefault: async (id) => toCV(await axiosClient.post(`${BASE}${id}/set-default/`)),
  // Trả về { blob, fileName }
  download: (id) => fetchFile(`${BASE}${id}/file/`),
  remove: (id) => axiosClient.delete(`${BASE}${id}/`),

  // AI (giai đoạn sau): chấm điểm CV và đánh giá mức độ phù hợp với một tin tuyển dụng
  analyze: async (id) => toCV(await axiosClient.post(`${BASE}${id}/analyze/`)),
  matchJob: (cvId, jobId) => axiosClient.get(`${BASE}${cvId}/match/${jobId}/`),
}

export default USE_MOCK ? cvMock : cvApi
