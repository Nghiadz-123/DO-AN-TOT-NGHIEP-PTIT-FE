import jobMock from '@/mocks/api/jobMock'
import { USE_MOCK } from '@/utils/constants'
import { cleanParams, fromJobForm, toDashboard, toJob, toPage } from './adapters'
import axiosClient from './axiosClient'

const toPublicQuery = ({ keyword, location, type, level, page, pageSize } = {}) =>
  cleanParams({ q: keyword, location, job_type: type, level, page, page_size: pageSize })

const toEmployerQuery = ({ status, keyword, ordering, page, pageSize } = {}) =>
  cleanParams({ status, q: keyword, ordering, page, page_size: pageSize })

const jobApi = {
  // Công khai: tìm kiếm tin đang tuyển, params = { keyword, location, type, level, page, pageSize }
  getAll: async (params) => toPage(await axiosClient.get('/jobs/', { params: toPublicQuery(params) }), toJob),
  getById: async (id) => toJob(await axiosClient.get(`/jobs/${id}/`)),

  // Nhà tuyển dụng: params = { status, keyword, ordering, page, pageSize }
  getMine: async (params) => toPage(await axiosClient.get('/employer/jobs/', { params: toEmployerQuery(params) }), toJob),
  getMineById: async (id) => toJob(await axiosClient.get(`/employer/jobs/${id}/`)),
  create: async (form, { publish = false } = {}) =>
    toJob(await axiosClient.post('/employer/jobs/', { ...fromJobForm(form), status: publish ? 'published' : 'draft' })),
  update: async (id, form) => toJob(await axiosClient.patch(`/employer/jobs/${id}/`, fromJobForm(form))),
  remove: (id) => axiosClient.delete(`/employer/jobs/${id}/`),
  // action: publish (đăng / tiếp tục / mở lại) | pause | close
  changeStatus: async (id, action) => toJob(await axiosClient.post(`/employer/jobs/${id}/${action}/`)),
  getRecruiterStats: async () => toDashboard(await axiosClient.get('/employer/dashboard/')),

  // AI gợi ý việc làm theo CV (giai đoạn sau): trả về [{ job, match }]
  getRecommended: (cvId) => axiosClient.get('/jobs/recommended/', { params: { cv_id: cvId } }),
}

export default USE_MOCK ? jobMock : jobApi
