import { cleanParams, toPage, toPublicCompany } from './adapters'
import axiosClient from './axiosClient'

const toQuery = ({ keyword, industry, location, page, pageSize } = {}) =>
  cleanParams({ q: keyword, industry, location, page, page_size: pageSize })

// Danh bạ công ty (công khai). Tin đang tuyển của một công ty: jobApi.getAll({ company: id })
const companyApi = {
  // params = { keyword, industry, location, page, pageSize }
  getAll: async (params) => toPage(await axiosClient.get('/companies/', { params: toQuery(params) }), toPublicCompany),
  getById: async (id) => toPublicCompany(await axiosClient.get(`/companies/${id}/`)),
}

export default companyApi
