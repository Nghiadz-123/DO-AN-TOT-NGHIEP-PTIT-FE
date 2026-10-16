import { cleanParams, toCVAnalysis, toJobRecommendation } from './adapters'
import axiosClient from './axiosClient'

const cvBase = (cvId) => `/candidate/cvs/${cvId}`

// AI cho ứng viên (backend apps/ai). Chấm điểm / gợi ý / đánh giá gọi Gemini nên mỗi lần mất vài giây
const aiApi = {
  // Kết quả AI đã lưu của mọi CV của tôi (không gọi AI): [{ cvId, profile, score, suggestions }]
  getAnalyses: async () => (await axiosClient.get('/candidate/cv-analyses/')).map(toCVAnalysis),

  // AI chấm điểm CV (kèm bóc tách thông tin CV nếu chưa có)
  scoreCv: async (cvId) => toCVAnalysis(await axiosClient.post(`${cvBase(cvId)}/analysis/score/`)),
  // AI gợi ý sửa CV; jobId: tin tuyển dụng mục tiêu (không bắt buộc)
  suggestCv: async (cvId, jobId) =>
    toCVAnalysis(await axiosClient.post(`${cvBase(cvId)}/analysis/suggestions/`, { job_id: jobId || null })),

  // Việc làm phù hợp với CV, điểm cao trước: [{ job, match }]
  getRecommendedJobs: async (cvId, { limit } = {}) =>
    (await axiosClient.get(`${cvBase(cvId)}/recommended-jobs/`, { params: cleanParams({ limit }) })).map(
      toJobRecommendation,
    ),
  // AI đánh giá chi tiết mức độ phù hợp của CV với một tin: { job, match } (match.aiEvaluation có kết quả)
  evaluateJob: async (cvId, jobId) =>
    toJobRecommendation(await axiosClient.post(`${cvBase(cvId)}/recommended-jobs/${jobId}/evaluate/`)),
}

export default aiApi
