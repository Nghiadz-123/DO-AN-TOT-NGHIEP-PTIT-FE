import axios from 'axios'
import { API_URL } from '@/utils/constants'
import { clearTokens, getRefreshToken, getToken, setTokens } from '@/utils/storage'

// Phát khi phiên đăng nhập hết hạn hẳn (refresh token cũng hết hạn) để AuthProvider đăng xuất
export const SESSION_EXPIRED_EVENT = 'auth:session-expired'

const AUTH_ENDPOINTS = ['/auth/login/', '/auth/token/refresh/', '/auth/logout/', '/employer/register/']

const axiosClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

axiosClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Nhiều request cùng gặp 401 thì chỉ refresh một lần
let refreshing = null

async function refreshAccessToken() {
  const { data } = await axios.post(`${API_URL}/auth/token/refresh/`, { refresh: getRefreshToken() })
  setTokens(data.access, data.refresh)
  return data.access
}

axiosClient.interceptors.response.use(
  // rawResponse: lấy cả headers (vd. tải file cần tên file trong Content-Disposition)
  (response) => (response.config.rawResponse ? response : response.data),
  async (error) => {
    const { config, response } = error
    const isAuthCall = AUTH_ENDPOINTS.some((path) => config?.url?.endsWith(path))
    if (response?.status !== 401 || isAuthCall) return Promise.reject(error)

    // Access token hết hạn: lấy token mới bằng refresh token rồi gửi lại request (một lần)
    if (!config._retried && getRefreshToken()) {
      config._retried = true
      try {
        refreshing ??= refreshAccessToken().finally(() => {
          refreshing = null
        })
        await refreshing
        return axiosClient(config)
      } catch {
        // refresh token cũng hết hạn -> đăng xuất bên dưới
      }
    }
    clearTokens()
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    return Promise.reject(error)
  },
)

// Tải file (blob) kèm tên file; lỗi JSON trả về dạng Blob được parse lại để hiển thị thông điệp
export async function fetchFile(url, params) {
  try {
    const response = await axiosClient.get(url, { params, responseType: 'blob', rawResponse: true })
    const disposition = response.headers['content-disposition'] ?? ''
    const encoded = /filename\*=utf-8''([^;]+)/i.exec(disposition)?.[1]
    const plain = /filename="?([^";]+)"?/i.exec(disposition)?.[1]
    return { blob: response.data, fileName: encoded ? decodeURIComponent(encoded) : plain }
  } catch (error) {
    const data = error.response?.data
    if (data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await data.text())
      } catch {
        // không phải JSON: giữ nguyên
      }
    }
    throw error
  }
}

export default axiosClient
