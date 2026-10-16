import { fromCandidateProfileForm, toCandidateProfile } from './adapters'
import axiosClient from './axiosClient'

// Hồ sơ ứng viên: thông tin cá nhân + mong muốn công việc
const candidateApi = {
  getProfile: async () => toCandidateProfile(await axiosClient.get('/candidate/profile/')),
  updateProfile: async (form) =>
    toCandidateProfile(await axiosClient.patch('/candidate/profile/', fromCandidateProfileForm(form))),
  // Công khai CV: nhà tuyển dụng tìm thấy và xem được CV chính, gửi được thư mời ứng tuyển
  setPublic: async (isPublic) => toCandidateProfile(await axiosClient.patch('/candidate/profile/', { is_public: isPublic })),
}

export default candidateApi
