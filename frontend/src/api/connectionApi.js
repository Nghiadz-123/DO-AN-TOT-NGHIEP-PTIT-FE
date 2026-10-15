import { cleanParams, toConnection, toPage } from './adapters'
import axiosClient from './axiosClient'

const BASE = '/connections/'

// Kết bạn: nhà tuyển dụng gửi lời mời, ứng viên chấp nhận / từ chối
const connectionApi = {
  // Bạn bè (đã chấp nhận), kết bạn gần nhất trước
  getFriends: async ({ keyword, page, pageSize } = {}) =>
    toPage(await axiosClient.get(BASE, { params: cleanParams({ q: keyword, page, page_size: pageSize }) }), toConnection),
  // box: received (đang chờ mình phản hồi) | sent (mình đã gửi: đang chờ / bị từ chối)
  getRequests: async ({ box = 'received', page, pageSize } = {}) =>
    toPage(
      await axiosClient.get(`${BASE}requests/`, { params: cleanParams({ box, page, page_size: pageSize }) }),
      toConnection,
    ),
  // Chỉ nhà tuyển dụng. userId: id tài khoản ứng viên; jobId: tin liên quan (tùy chọn)
  sendRequest: async ({ userId, jobId, message = '' }) =>
    toConnection(await axiosClient.post(BASE, { user_id: userId, job_id: jobId || null, message })),
  accept: async (id) => toConnection(await axiosClient.post(`${BASE}${id}/accept/`)),
  decline: async (id) => toConnection(await axiosClient.post(`${BASE}${id}/decline/`)),
  // Hủy kết bạn, hoặc người gửi hủy lời mời đang chờ
  remove: (id) => axiosClient.delete(`${BASE}${id}/`),
}

export default connectionApi
