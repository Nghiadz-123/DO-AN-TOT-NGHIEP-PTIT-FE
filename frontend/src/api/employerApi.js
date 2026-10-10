import { fromCompanyForm, toCompany, toRecruiterProfile } from './adapters'
import axiosClient from './axiosClient'

// Hồ sơ công ty và hồ sơ cá nhân của nhà tuyển dụng
const employerApi = {
  getCompany: async () => toCompany(await axiosClient.get('/employer/company/')),

  updateCompany: async (form) => toCompany(await axiosClient.patch('/employer/company/', fromCompanyForm(form))),

  uploadLogo: async (file) => {
    const formData = new FormData()
    formData.append('logo', file)
    return toCompany(
      await axiosClient.post('/employer/company/logo/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    )
  },

  removeLogo: async () => toCompany(await axiosClient.delete('/employer/company/logo/')),

  getProfile: async () => toRecruiterProfile(await axiosClient.get('/employer/profile/')),

  updateProfile: async ({ fullName, phone, position }) =>
    toRecruiterProfile(await axiosClient.patch('/employer/profile/', { full_name: fullName, phone, position })),
}

export default employerApi
