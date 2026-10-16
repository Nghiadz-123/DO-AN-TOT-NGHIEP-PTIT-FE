import { cleanParams, toInvitation, toPage, toSentInvitation } from './adapters'
import axiosClient from './axiosClient'

const EMPLOYER = '/employer/invitations/'
const CANDIDATE = '/candidate/invitations/'

// Thư mời ứng tuyển: nhà tuyển dụng gửi; ứng viên xem, từ chối hoặc nộp hồ sơ (applicationApi.apply)
const invitationApi = {
  // ---- nhà tuyển dụng
  send: async ({ candidateId, jobId, message }) =>
    toSentInvitation(await axiosClient.post(EMPLOYER, { candidate_id: candidateId, job_id: jobId, message })),
  // Mới gửi trước. status: pending | accepted | declined; keyword: tên ứng viên
  getSent: async ({ status, jobId, keyword, page, pageSize } = {}) =>
    toPage(
      await axiosClient.get(EMPLOYER, {
        params: cleanParams({ status, job_id: jobId, q: keyword, page, page_size: pageSize }),
      }),
      toSentInvitation,
    ),
  // Thu hồi thư chưa được phản hồi
  withdraw: (id) => axiosClient.delete(`${EMPLOYER}${id}/`),

  // ---- ứng viên
  getMine: async ({ status, page, pageSize } = {}) =>
    toPage(await axiosClient.get(CANDIDATE, { params: cleanParams({ status, page, page_size: pageSize }) }), toInvitation),
  markRead: async (id) => toInvitation(await axiosClient.post(`${CANDIDATE}${id}/read/`)),
  decline: async (id) => toInvitation(await axiosClient.post(`${CANDIDATE}${id}/decline/`)),
  // Số thư chưa xem, cho huy hiệu trên menu
  getUnreadCount: async () => (await axiosClient.get(`${CANDIDATE}summary/`)).unread,
}

export default invitationApi
