import { cleanParams, toJob, toPage, toPublicCompany } from './adapters'
import axiosClient from './axiosClient'

const BASE = '/candidate/favorites'

const pageQuery = ({ page, pageSize } = {}) => ({ params: cleanParams({ page, page_size: pageSize }) })

// Việc làm và công ty yêu thích của ứng viên
const favoriteApi = {
  // { jobs: [id], companies: [id] } để đánh dấu nút yêu thích
  getIds: () => axiosClient.get(`${BASE}/ids/`),

  getJobs: async (params) => toPage(await axiosClient.get(`${BASE}/jobs/`, pageQuery(params)), toJob),
  addJob: (jobId) => axiosClient.post(`${BASE}/jobs/`, { job_id: jobId }),
  removeJob: (jobId) => axiosClient.delete(`${BASE}/jobs/${jobId}/`),

  getCompanies: async (params) =>
    toPage(await axiosClient.get(`${BASE}/companies/`, pageQuery(params)), toPublicCompany),
  addCompany: (companyId) => axiosClient.post(`${BASE}/companies/`, { company_id: companyId }),
  removeCompany: (companyId) => axiosClient.delete(`${BASE}/companies/${companyId}/`),
}

export default favoriteApi
