import { cleanParams, toPage, toTalent } from './adapters'
import axiosClient, { fetchFile } from './axiosClient'

const toQuery = ({ keyword, minScore, hideApplied, page, pageSize } = {}) =>
  cleanParams({ q: keyword, min_score: minScore || null, hide_applied: hideApplied || null, page, page_size: pageSize })

// Ứng viên phù hợp với tin tuyển dụng: hồ sơ công khai hoặc đã ứng tuyển vào công ty, so khớp bằng CV mặc định
const talentApi = {
  // params = { keyword, minScore, hideApplied, page, pageSize }; điểm cao trước
  getSuggested: async (jobId, params) =>
    toPage(await axiosClient.get(`/employer/jobs/${jobId}/suggested-candidates/`, { params: toQuery(params) }), toTalent),
  // Trả về { blob, fileName }
  viewCv: (candidateId) => fetchFile(`/employer/talents/${candidateId}/cv/`),
  downloadCv: (candidateId) => fetchFile(`/employer/talents/${candidateId}/cv/`, { download: 1 }),
}

export default talentApi
