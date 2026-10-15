import axiosClient from './axiosClient'

const adminApi = {
  getOverview: () => axiosClient.get('/admin/overview/'),
  getUsers: (params) => axiosClient.get('/admin/users/', { params }),
  updateUser: (id, payload) => axiosClient.patch(`/admin/users/${id}/`, payload),
  getCompanies: (params) => axiosClient.get('/admin/companies/', { params }),
  updateCompany: (id, payload) => axiosClient.patch(`/admin/companies/${id}/`, payload),
  getJobs: (params) => axiosClient.get('/admin/jobs/', { params }),
  updateJob: (id, payload) => axiosClient.patch(`/admin/jobs/${id}/`, payload),
}

export default adminApi
