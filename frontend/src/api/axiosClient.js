import axios from 'axios'
import { API_URL } from '@/utils/constants'
import { getToken, removeToken } from '@/utils/storage'

const axiosClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

axiosClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) removeToken()
    return Promise.reject(error)
  },
)

export default axiosClient
