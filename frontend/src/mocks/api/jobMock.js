import { normalize } from '@/utils/text'
import { matchCVToJob } from '../ai'
import { locationName } from '../catalogData'
import {
  delay,
  findOr404,
  genId,
  getDb,
  httpError,
  isPastDate,
  paginate,
  requireRecruiter,
  requireRole,
  saveDb,
} from '../db'
import { expandApplication } from './applicationMock'

// Quy tắc trạng thái giống backend (apps/jobs/workflow.py)
const ACTION_SOURCES = {
  publish: ['draft', 'paused', 'closed'],
  pause: ['published'],
  close: ['published', 'paused', 'expired'],
}
const ACTION_LABELS = { publish: 'đăng', pause: 'tạm dừng', close: 'đóng' }
const STATUS_LABELS = { draft: 'Bản nháp', published: 'Đang tuyển', paused: 'Tạm dừng', closed: 'Đã đóng', expired: 'Hết hạn' }

const byNewest = (a, b) => new Date(b.publishedAt ?? b.createdAt) - new Date(a.publishedAt ?? a.createdAt)

export const effectiveStatus = (job) => (job.status === 'published' && isPastDate(job.deadline) ? 'expired' : job.status)

// View-model của một tin (cùng cấu trúc với adapters.toJob khi gọi API thật)
export function jobView(job) {
  const db = getDb()
  const company = db.companies.find((c) => c.id === job.companyId)
  const apps = db.applications.filter((a) => a.jobId === job.id)
  const status = effectiveStatus(job)
  const actions = Object.keys(ACTION_SOURCES).filter((action) => ACTION_SOURCES[action].includes(status))
  return {
    ...job,
    company: company?.name ?? '',
    companyLogo: company?.logoUrl ?? null,
    location: locationName(job.locationId),
    status,
    applicantCount: apps.length,
    pendingCount: apps.filter((a) => a.status === 'applied').length,
    allowedActions: apps.length ? actions : [...actions, 'delete'],
  }
}

function ownJob(id) {
  const { company } = requireRecruiter()
  const job = findOr404(getDb().jobs, id, 'Tin tuyển dụng')
  if (job.companyId !== company.id) throw httpError(404, 'Tin tuyển dụng không tồn tại.')
  return job
}

function validateForm(form, job) {
  if (!form.title.trim()) throw httpError(400, 'Tiêu đề không được để trống.')
  if (form.salaryMin !== '' && form.salaryMax !== '' && Number(form.salaryMin) > Number(form.salaryMax)) {
    throw httpError(400, 'Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu.')
  }
  if (form.deadline && form.deadline !== job?.deadline && isPastDate(form.deadline)) {
    throw httpError(400, 'Hạn nộp hồ sơ phải từ hôm nay trở đi.')
  }
}

const fromForm = (form) => ({
  title: form.title.trim(),
  description: form.description,
  requirements: form.requirements,
  benefits: form.benefits,
  type: form.type,
  workMode: form.workMode,
  level: form.level,
  minYearsExperience: Number(form.minYearsExperience) || 0,
  headcount: Number(form.headcount) || 1,
  salaryMin: form.salaryMin === '' ? null : Number(form.salaryMin),
  salaryMax: form.salaryMax === '' ? null : Number(form.salaryMax),
  isSalaryNegotiable: form.isSalaryNegotiable,
  locationId: form.locationId ? Number(form.locationId) : '',
  address: form.address,
  deadline: form.deadline,
  skills: form.skills,
})

function applyAction(job, action) {
  const status = effectiveStatus(job)
  if (!ACTION_SOURCES[action].includes(status)) {
    throw httpError(409, `Không thể ${ACTION_LABELS[action]} tin đang ở trạng thái "${STATUS_LABELS[status]}".`)
  }
  if (action === 'publish') {
    if (isPastDate(job.deadline)) {
      throw httpError(400, 'Hạn nộp hồ sơ đã qua. Vui lòng cập nhật hạn nộp trước khi đăng tin.')
    }
    if (!job.skills.length) throw httpError(400, 'Cần ít nhất một kỹ năng yêu cầu trước khi đăng tin.')
    if (job.status !== 'paused' || !job.publishedAt) job.publishedAt = new Date().toISOString()
    job.closedAt = null
    job.status = 'published'
  } else if (action === 'pause') {
    job.status = 'paused'
  } else {
    job.status = 'closed'
    job.closedAt = new Date().toISOString()
  }
}

const jobMock = {
  // ---------------------------------------------------------------- công khai
  async getAll({ keyword = '', location = '', type = '', level = '', page = 1, pageSize = 20 } = {}) {
    await delay()
    const kw = normalize(keyword)
    const list = getDb()
      .jobs.map(jobView)
      .filter((j) => j.status === 'published')
      .filter((j) => !kw || normalize([j.title, j.company, ...j.skills].join(' ')).includes(kw))
      .filter((j) => !location || j.locationId === Number(location))
      .filter((j) => !type || j.type === type)
      .filter((j) => !level || j.level === level)
      .sort(byNewest)
    return paginate(list, { page, pageSize })
  },

  async getById(id) {
    await delay()
    const job = findOr404(getDb().jobs, id, 'Tin tuyển dụng')
    if (job.status === 'draft') throw httpError(404, 'Tin tuyển dụng không tồn tại.')
    return jobView(job)
  },

  // ---------------------------------------------------------------- nhà tuyển dụng
  async getMine({ status = '', keyword = '', ordering = '', page = 1, pageSize = 20 } = {}) {
    await delay()
    const { company } = requireRecruiter()
    const kw = normalize(keyword)
    const list = getDb()
      .jobs.filter((j) => j.companyId === company.id)
      .map(jobView)
      .filter((j) => !status || j.status === status)
      .filter((j) => !kw || normalize(j.title).includes(kw))
      .sort(ordering === 'title' ? (a, b) => a.title.localeCompare(b.title) : (a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return paginate(list, { page, pageSize })
  },

  async getMineById(id) {
    await delay()
    return jobView(ownJob(id))
  },

  async create(form, { publish = false } = {}) {
    await delay()
    const { user, company } = requireRecruiter()
    validateForm(form)
    const job = {
      ...fromForm(form),
      id: genId('job'),
      companyId: company.id,
      recruiterId: user.id,
      status: 'draft',
      createdAt: new Date().toISOString(),
      publishedAt: null,
    }
    if (publish) applyAction(job, 'publish')
    getDb().jobs.push(job)
    saveDb()
    return jobView(job)
  },

  async update(id, form) {
    await delay()
    const job = ownJob(id)
    validateForm(form, job)
    Object.assign(job, fromForm(form))
    saveDb()
    return jobView(job)
  },

  async remove(id) {
    await delay()
    ownJob(id)
    const db = getDb()
    if (db.applications.some((a) => a.jobId === id)) {
      throw httpError(409, 'Tin đã có hồ sơ ứng tuyển nên không thể xóa. Hãy đóng tin để ngừng nhận hồ sơ.')
    }
    db.jobs = db.jobs.filter((j) => j.id !== id)
    saveDb()
  },

  async changeStatus(id, action) {
    await delay(300)
    const job = ownJob(id)
    applyAction(job, action)
    saveDb()
    return jobView(job)
  },

  async getRecruiterStats() {
    await delay()
    const { company } = requireRecruiter()
    const db = getDb()
    const jobs = db.jobs.filter((j) => j.companyId === company.id).map(jobView)
    const jobIds = new Set(jobs.map((j) => j.id))
    const apps = db.applications.filter((a) => jobIds.has(a.jobId))
    const countBy = (list, key) => list.reduce((acc, item) => ({ ...acc, [item[key]]: (acc[item[key]] ?? 0) + 1 }), {})
    const jobCounts = countBy(jobs, 'status')
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const screened = apps.filter((a) => a.aiReview)
    return {
      jobs: {
        total: jobs.length,
        ...Object.fromEntries(Object.keys(STATUS_LABELS).map((s) => [s, jobCounts[s] ?? 0])),
      },
      applications: {
        total: apps.length,
        newLast7Days: apps.filter((a) => new Date(a.appliedAt) >= weekAgo).length,
        byStatus: countBy(apps, 'status'),
      },
      recentApplications: [...apps]
        .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
        .slice(0, 6)
        .map(expandApplication),
      avgAiScore: screened.length
        ? Math.round(screened.reduce((sum, a) => sum + a.aiReview.score, 0) / screened.length)
        : null,
    }
  },

  // ---------------------------------------------------------------- AI (mô phỏng)
  async getRecommended(cvId) {
    await delay(900)
    const user = requireRole('candidate')
    const db = getDb()
    const cv = findOr404(db.cvs, cvId, 'CV')
    if (cv.candidateId !== user.id) throw httpError(403, 'Bạn không có quyền với CV này.')
    return db.jobs
      .map(jobView)
      .filter((j) => j.status === 'published')
      .map((job) => ({ job, match: matchCVToJob(cv.parsed, job) }))
      .sort((a, b) => b.match.score - a.match.score)
  },
}

export default jobMock
