import authMock from '@/mocks/api/authMock'
import { ROLES, USE_MOCK } from '@/utils/constants'
import { toSession, toUser } from './adapters'
import axiosClient from './axiosClient'

const authApi = {
  login: async ({ email, password }) => toSession(await axiosClient.post('/auth/login/', { email, password })),

  // Giai đoạn 1 backend chỉ hỗ trợ đăng ký nhà tuyển dụng
  register: async ({ role, fullName, email, password, companyName }) => {
    if (role !== ROLES.RECRUITER) throw new Error('Đăng ký tài khoản ứng viên sẽ được hỗ trợ ở giai đoạn sau.')
    return toSession(
      await axiosClient.post('/employer/register/', { full_name: fullName, email, password, company_name: companyName }),
    )
  },

  getMe: async () => toUser(await axiosClient.get('/auth/me/')),

  updateProfile: async ({ fullName, phone }) => toUser(await axiosClient.patch('/auth/me/', { full_name: fullName, phone })),

  // Trả về token mới (mọi phiên cũ bị thu hồi)
  changePassword: ({ currentPassword, newPassword }) =>
    axiosClient.post('/auth/change-password/', { current_password: currentPassword, new_password: newPassword }),

  logout: (refresh) => axiosClient.post('/auth/logout/', { refresh }),
}

export default USE_MOCK ? authMock : authApi
