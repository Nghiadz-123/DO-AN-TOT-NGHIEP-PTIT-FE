import { ROLES } from '@/utils/constants'
import { toSession, toUser } from './adapters'
import axiosClient from './axiosClient'

const authApi = {
  login: async ({ email, password }) => toSession(await axiosClient.post('/auth/login/', { email, password })),

  register: async ({ role, fullName, email, password, companyName }) => {
    if (role === ROLES.RECRUITER) {
      return toSession(
        await axiosClient.post('/employer/register/', { full_name: fullName, email, password, company_name: companyName }),
      )
    }
    return toSession(await axiosClient.post('/candidate/register/', { full_name: fullName, email, password }))
  },

  getMe: async () => toUser(await axiosClient.get('/auth/me/')),

  updateProfile: async ({ fullName, phone }) => toUser(await axiosClient.patch('/auth/me/', { full_name: fullName, phone })),

  // Trả về token mới (mọi phiên cũ bị thu hồi)
  changePassword: ({ currentPassword, newPassword }) =>
    axiosClient.post('/auth/change-password/', { current_password: currentPassword, new_password: newPassword }),

  logout: (refresh) => axiosClient.post('/auth/logout/', { refresh }),
}

export default authApi
