import { toCV } from './adapters'
import axiosClient from './axiosClient'

const BASE = '/candidate/cv-builder/'
const NOT_FOUND_MESSAGE = 'Không tìm thấy API lưu CV. Hãy khởi động lại Django từ thư mục BE/backend rồi chạy migrate.'

// cv: CV thật trong "CV của tôi" được backend dựng từ nội dung (dùng để ứng tuyển, AI chấm điểm...)
const toDocument = (dto) => ({ content: dto.content, updatedAt: dto.updated_at, cv: dto.cv ? toCV(dto.cv) : null })

const withNotFoundMessage = async (request) => {
  try {
    return await request()
  } catch (error) {
    if (error.response?.status === 404) error.message = NOT_FOUND_MESSAGE
    throw error
  }
}

const cvBuilderApi = {
  // Nội dung đã lưu (null nếu chưa lưu lần nào)
  getMine: () =>
    withNotFoundMessage(async () => {
      const result = await axiosClient.get(BASE)
      return result.content ? toDocument(result) : null
    }),
  // Lưu nội dung: backend dựng thành file CV và thêm / cập nhật trong "CV của tôi"
  save: (content) => withNotFoundMessage(async () => toDocument(await axiosClient.put(BASE, { content }))),
}

export default cvBuilderApi
