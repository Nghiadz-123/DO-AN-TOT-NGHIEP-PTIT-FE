import authMock from '@/mocks/api/authMock'
import { USE_MOCK } from '@/utils/constants'
import axiosClient from './axiosClient'

const authApi = {
  login: (data) => axiosClient.post('/auth/login/', data),
  register: (data) => axiosClient.post('/auth/register/', data),
  getMe: () => axiosClient.get('/auth/me/'),
  updateProfile: (data) => axiosClient.patch('/auth/me/', data),
}

export default USE_MOCK ? authMock : authApi
