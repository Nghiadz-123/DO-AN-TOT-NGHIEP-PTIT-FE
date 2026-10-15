import applicationMock from '@/mocks/api/applicationMock'
import { USE_MOCK } from '@/utils/constants'
import { cleanParams, toApplication, toCandidateApplication, toPage } from './adapters'
import axiosClient, { fetchFile } from './axiosClient'

const toQuery = ({ jobId, status, keyword, ordering, page, pageSize } = {}) =>
  cleanParams({ job: jobId, status: [].concat(status ?? []).join(','), q: keyword, ordering, page, page_size: pageSize })

const applicationApi = {
  // Ứng viên
  apply: async ({ jobId, cvId, coverLetter = '' }) =>
    toCandidateApplication(await axiosClient.post('/candidate/applications/', {
      job_id: jobId,
      cv_id: cvId,
      cover_letter: coverLetter,
    })),
  getMine: async () => {
    const page = await axiosClient.get('/candidate/applications/', { params: { page_size: 100 } })
    return (page.results ?? []).map(toCandidateApplication)
  },

  // Nhà tuyển dụng: params = { jobId, status, keyword, ordering, page, pageSize }
  list: async (params) =>
    toPage(await axiosClient.get('/employer/applications/', { params: toQuery(params) }), toApplication),
  getById: async (id) => toApplication(await axiosClient.get(`/employer/applications/${id}/`)),
  updateStatus: async (id, status, { note = '', rejectionReason = '' } = {}) =>
    toApplication(
      await axiosClient.post(`/employer/applications/${id}/status/`, { status, note, rejection_reason: rejectionReason }),
    ),
  rate: async (id, rating) =>
    toApplication(await axiosClient.patch(`/employer/applications/${id}/`, { recruiter_rating: rating })),
  // Trả về { blob, fileName }
  downloadCv: (id) => fetchFile(`/employer/applications/${id}/cv/`),

  // AI sàng lọc chưa có endpoint ở backend hiện tại.
  screenByJob: async () => { throw new Error('Tính năng AI sàng lọc chưa được backend hỗ trợ.') },
  screen: async () => { throw new Error('Tính năng AI sàng lọc chưa được backend hỗ trợ.') },
}

export default USE_MOCK ? applicationMock : applicationApi
