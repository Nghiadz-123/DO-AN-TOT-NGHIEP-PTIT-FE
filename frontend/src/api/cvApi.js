import { fileTitle } from '@/utils/file'
import { toCV } from './adapters'
import axiosClient, { fetchFile } from './axiosClient'

const BASE = '/candidate/cvs/'

// Header multipart bắt buộc: axiosClient mặc định JSON sẽ chuyển FormData thành JSON
const multipart = (onProgress) => ({
  headers: { 'Content-Type': 'multipart/form-data' },
  onUploadProgress: onProgress && ((e) => e.total && onProgress(Math.round((e.loaded * 100) / e.total))),
})

const cvApi = {
  // Không phân trang; CV mặc định đứng đầu, sau đó mới nhất trước
  getMine: async () => (await axiosClient.get(BASE)).map(toCV),
  // Chi tiết gồm cả raw_text, parsed_data
  getById: async (id) => toCV(await axiosClient.get(`${BASE}${id}/`)),

  // Tải lên CV (PDF/DOCX). title bỏ trống thì backend lấy theo tên file
  upload: async (file, { title = '', isDefault = false, onProgress } = {}) => {
    const data = new FormData()
    data.append('file', file)
    data.append('title', title.trim() || fileTitle(file.name))
    data.append('is_default', isDefault)
    return toCV(await axiosClient.post(BASE, data, multipart(onProgress)))
  },
  // Backend chỉ cho đổi tên CV; muốn đổi file thì tải CV mới
  rename: async (id, title) => toCV(await axiosClient.patch(`${BASE}${id}/`, { title: title.trim() })),

  setDefault: async (id) => toCV(await axiosClient.post(`${BASE}${id}/set-default/`)),
  // Bóc tách lại CV đang lỗi / chờ xử lý
  reparse: async (id) => toCV(await axiosClient.post(`${BASE}${id}/reparse/`)),
  // Trả về { blob, fileName }
  download: (id) => fetchFile(`${BASE}${id}/file/`, { download: 1 }),
  view: (id) => fetchFile(`${BASE}${id}/file/`),
  remove: (id) => axiosClient.delete(`${BASE}${id}/`),

  // AI chấm điểm CV / đánh giá mức độ phù hợp: backend chưa có, chỉ gọi khi FEATURES.ai bật
  analyze: async (id) => toCV(await axiosClient.post(`${BASE}${id}/analyze/`)),
  matchJob: (cvId, jobId) => axiosClient.get(`${BASE}${cvId}/match/${jobId}/`),
}

export default cvApi
