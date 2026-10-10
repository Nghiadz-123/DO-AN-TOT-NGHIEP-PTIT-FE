import { fromCandidateProfileForm, toCandidateProfile } from './adapters'
import axiosClient from './axiosClient'

// Hồ sơ ứng viên: thông tin cá nhân + mong muốn công việc
const candidateApi = {
  getProfile: async () => toCandidateProfile(await axiosClient.get('/candidate/profile/')),
  updateProfile: async (form) =>
    toCandidateProfile(await axiosClient.patch('/candidate/profile/', fromCandidateProfileForm(form))),
}

export default candidateApi
