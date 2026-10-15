import { USE_MOCK } from '@/utils/constants'
import axiosClient from './axiosClient'

const storageKey = (userId) => `smartats-cv-builder:${userId || 'candidate'}`

const mockApi = {
  async getMine(userId) {
    try { return JSON.parse(localStorage.getItem(storageKey(userId)) || 'null') }
    catch { return null }
  },
  async save(userId, content) {
    const document = { content, updatedAt: new Date().toISOString() }
    localStorage.setItem(storageKey(userId), JSON.stringify(document))
    return document
  },
}

const backendApi = {
  async getMine() {
    try {
      const result = await axiosClient.get('/candidate/cv-builder/')
      return result.content ? { content: result.content, updatedAt: result.updated_at } : null
    } catch (error) {
      if (error.response?.status === 404) {
        error.message = 'Backend chưa có API lưu CV mới. Hãy khởi động lại Django từ thư mục BE/backend rồi chạy migrate.'
      }
      throw error
    }
  },
  async save(_userId, content) {
    try {
      const result = await axiosClient.put('/candidate/cv-builder/', { content })
      return { content: result.content, updatedAt: result.updated_at }
    } catch (error) {
      if (error.response?.status === 404) {
        error.message = 'Không tìm thấy API lưu CV. Hãy khởi động lại Django từ thư mục BE/backend rồi chạy migrate.'
      }
      throw error
    }
  },
}

export default USE_MOCK ? mockApi : backendApi
