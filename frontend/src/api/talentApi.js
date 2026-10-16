import { cleanParams, toPage, toTalent, toTalentProfile } from './adapters'
import axiosClient, { fetchFile } from './axiosClient'

const toQuery = ({ keyword, minScore, hideApplied, page, pageSize } = {}) =>
  cleanParams({ q: keyword, min_score: minScore || null, hide_applied: hideApplied || null, page, page_size: pageSize })

// Nhà tuyển dụng tìm ứng viên: kho CV công khai và ứng viên phù hợp với từng tin
const talentApi = {
  // Ứng viên công khai CV, CV cập nhật gần nhất trước. keyword tìm cả trong nội dung CV
  getPool: async ({ keyword, locationId, level, page, pageSize } = {}) =>
    toPage(
      await axiosClient.get('/employer/talents/', {
        params: cleanParams({ q: keyword, location_id: locationId, level, page, page_size: pageSize }),
      }),
      toTalentProfile,
    ),
  // Công khai CV hoặc đã ứng tuyển vào công ty, so khớp bằng CV chính; điểm cao trước.
  // params = { keyword, minScore, hideApplied, page, pageSize }
  getSuggested: async (jobId, params) =>
    toPage(await axiosClient.get(`/employer/jobs/${jobId}/suggested-candidates/`, { params: toQuery(params) }), toTalent),
  // Trả về { blob, fileName }
  viewCv: (candidateId) => fetchFile(`/employer/talents/${candidateId}/cv/`),
  downloadCv: (candidateId) => fetchFile(`/employer/talents/${candidateId}/cv/`, { download: 1 }),
}

export default talentApi
